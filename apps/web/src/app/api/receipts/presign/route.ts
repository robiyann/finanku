import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { getR2Client } from '@/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const ALLOWED_MIME_TYPES = ['image/webp', 'image/jpeg', 'image/png', 'image/jpg'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const PRESIGN_EXPIRES_IN_SECONDS = 300; // 5 minutes

// Whitelist mapping MIME type ke extension yang aman
// TIDAK menggunakan mimeType.split('/')[1] karena bisa menghasilkan ekstensi berbahaya
const MIME_TO_EXT: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
};

async function ensureReceiptColumns(sql: any) {
  try {
    await sql`ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS idempotency_key text;`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS receipts_user_idempotency_idx ON public.receipts (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;`;
  } catch {}
}

export async function POST(req: NextRequest) {
  // 1. Verify session — user MUST be logged in
  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized: Wajib login terlebih dahulu untuk scan nota.', code: 'SESSION_REQUIRED' },
      { status: 401 }
    );
  }

  // 2. Parse & validate request body
  let body: { mime_type?: string; file_size?: number; filename?: string; idempotency_key?: string; request_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request body harus berupa JSON.' }, { status: 400 });
  }

  const headerIdempotencyKey = req.headers.get('x-idempotency-key') || req.headers.get('x-request-id');
  const idempotencyKey = headerIdempotencyKey || body.idempotency_key || body.request_id || null;

  const mimeType = body.mime_type || 'image/webp';
  const fileSize = body.file_size || 0;

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return NextResponse.json(
      { error: `Format file tidak didukung: ${mimeType}. Gunakan WebP, JPEG, atau PNG.` },
      { status: 400 }
    );
  }

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `Ukuran file terlalu besar. Maksimal 10MB, file kamu: ${(fileSize / 1024 / 1024).toFixed(1)}MB.` },
      { status: 400 }
    );
  }

  const sql = getDb();
  await ensureReceiptColumns(sql);

  // Deduplication check: Check if a pending receipt was already created with this idempotency key
  if (idempotencyKey) {
    try {
      const existing = await sql`
        SELECT id, storage_path FROM public.receipts
        WHERE user_id = ${user.id}::uuid AND idempotency_key = ${idempotencyKey}
        LIMIT 1;
      `;
      if (existing && existing.length > 0) {
        const bucket = process.env.R2_BUCKET || 'finance';
        const r2 = getR2Client();
        const command = new PutObjectCommand({
          Bucket: bucket,
          Key: existing[0].storage_path,
          ContentType: mimeType,
        });
        const presignedUrl = await getSignedUrl(r2, command, { expiresIn: PRESIGN_EXPIRES_IN_SECONDS });

        return NextResponse.json({
          ok: true,
          presigned_url: presignedUrl,
          storage_path: existing[0].storage_path,
          receipt_id: existing[0].id,
          expires_in: PRESIGN_EXPIRES_IN_SECONDS,
          duplicate: true,
        });
      }
    } catch {}
  }

  const ext = MIME_TO_EXT[mimeType] || 'webp'; // Aman — dari whitelist, bukan dari input user
  const fileUuid = randomUUID();
  const storagePath = `receipts/${user.id}/${fileUuid}.${ext}`;
  const bucket = process.env.R2_BUCKET || 'finance';

  // 4. Create PENDING receipt record in Neon DB
  let receiptId = randomUUID();

  try {
    const rows = await sql`
      INSERT INTO public.receipts (id, user_id, storage_path, status, idempotency_key)
      VALUES (${receiptId}::uuid, ${user.id}::uuid, ${storagePath}, 'pending', ${idempotencyKey})
      ON CONFLICT (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
      RETURNING id;
    `;
    if (rows && rows.length > 0) {
      receiptId = rows[0].id;
    }
  } catch (dbErr: any) {
    try {
      // Fallback if idempotency_key column missing
      const rows = await sql`
        INSERT INTO public.receipts (id, user_id, storage_path, status)
        VALUES (${receiptId}::uuid, ${user.id}::uuid, ${storagePath}, 'pending')
        RETURNING id;
      `;
      if (rows && rows.length > 0) receiptId = rows[0].id;
    } catch {}
  }

  // 5. Generate Presigned PUT URL from R2 (valid for 5 minutes)
  try {
    const r2 = getR2Client();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: storagePath,
      ContentType: mimeType,
    });

    const presignedUrl = await getSignedUrl(r2, command, {
      expiresIn: PRESIGN_EXPIRES_IN_SECONDS,
    });

    return NextResponse.json({
      ok: true,
      presigned_url: presignedUrl,
      storage_path: storagePath,
      receipt_id: receiptId,
      expires_in: PRESIGN_EXPIRES_IN_SECONDS,
    });
  } catch (r2Err: any) {
    console.error('[Presign] Failed to generate presigned URL:', r2Err.message);
    return NextResponse.json(
      { error: 'Gagal membuat URL upload. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
