import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { getR2Client } from '@/lib/r2';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { extractReceipt } from '@finance/core';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  // 1. Authenticate user session — MANDATORY
  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized: Wajib login terlebih dahulu untuk scan nota.', code: 'SESSION_REQUIRED' },
      { status: 401 }
    );
  }

  const sql = getDb();

  // 1b. Rate Limit: Maks 20 scan nota per jam per user
  // Mencegah penyalahgunaan Vision AI API yang mahal
  try {
    const recentScans = await sql`
      SELECT COUNT(*) AS scan_count
      FROM public.receipts
      WHERE user_id = ${user.id}::uuid
        AND created_at >= NOW() - INTERVAL '1 hour';
    `;
    const scanCount = Number(recentScans?.[0]?.scan_count || 0);
    if (scanCount >= 20) {
      return NextResponse.json(
        {
          error: 'Batas scan nota tercapai. Maksimal 20 scan per jam. Coba lagi nanti.',
          code: 'RATE_LIMITED',
          scans_this_hour: scanCount,
          limit: 20,
        },
        { status: 429 }
      );
    }
  } catch { /* Lanjut jika gagal cek rate limit */ }

  const contentType = req.headers.get('content-type') || '';

  // 2. Fetch user-specific & global categories for OCR
  let catNames: string[] = ['Makanan & Minuman', 'Transportasi', 'Belanja', 'Tagihan', 'Lainnya'];
  try {
    const categories = await sql`
      SELECT name FROM public.categories
      WHERE user_id IS NULL OR user_id = ${user.id}::uuid;
    `;
    if (categories && categories.length > 0) {
      catNames = categories.map((c: any) => c.name);
    }
  } catch {
    // Fallback to defaults
  }

  let buffer: Buffer;
  let mimeType = 'image/webp';
  let r2Key = '';
  let receiptId = '';

  try {
    if (contentType.includes('multipart/form-data')) {
      // --- Direct upload path (fallback for mobile/simple clients) ---
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'File tidak ditemukan di form data.' }, { status: 400 });
      }

      mimeType = file.type;
      buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split('.').pop() || 'webp';

      // Path LOCKED to authenticated user
      r2Key = `receipts/${user.id}/${randomUUID()}.${ext}`;

      const r2 = getR2Client();
      await r2.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET || 'finance',
        Key: r2Key,
        Body: buffer,
        ContentType: mimeType,
      }));

      // Create pending receipt record
      receiptId = randomUUID();
      try {
        const rows = await sql`
          INSERT INTO public.receipts (id, user_id, storage_path, status)
          VALUES (${receiptId}::uuid, ${user.id}::uuid, ${r2Key}, 'pending')
          RETURNING id;
        `;
        if (rows?.length > 0) receiptId = rows[0].id;
      } catch { /* Continue */ }

    } else {
      // --- Presigned URL path (preferred — file already in R2) ---
      let body: { storage_path?: string; receipt_id?: string } = {};
      try {
        body = await req.json();
      } catch {
        return NextResponse.json({ error: 'Request body harus berupa JSON.' }, { status: 400 });
      }

      r2Key = body.storage_path || '';
      if (!r2Key) {
        return NextResponse.json({ error: 'storage_path diperlukan di request body.' }, { status: 400 });
      }

      // --- SECURITY CHECK: Validate path ownership ---
      // The path MUST start with receipts/{user.id}/ — NEVER allow cross-user access
      const expectedPrefix = `receipts/${user.id}/`;
      if (!r2Key.startsWith(expectedPrefix)) {
        console.warn(`[Security] User ${user.id} attempted to access path: ${r2Key}`);
        return NextResponse.json(
          { error: 'Akses ditolak: File ini bukan milik akun kamu.', code: 'FORBIDDEN' },
          { status: 403 }
        );
      }

      // Check if provided receipt_id exists in DB
      if (body.receipt_id) {
        try {
          const ownership = await sql`
            SELECT id FROM public.receipts
            WHERE id = ${body.receipt_id}::uuid AND user_id = ${user.id}::uuid
            LIMIT 1;
          `;
          if (ownership && ownership.length > 0) {
            receiptId = body.receipt_id;
          }
        } catch { /* Continue to upsert receiptId */ }
      }

      // Download file from R2 for OCR processing
      const r2 = getR2Client();
      const response = await r2.send(new GetObjectCommand({
        Bucket: process.env.R2_BUCKET || 'finance',
        Key: r2Key,
      }));

      const stream = response.Body as any;
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(chunk);
      buffer = Buffer.concat(chunks);
      mimeType = response.ContentType || 'image/webp';

      // Ensure receipt record exists in Neon DB
      if (!receiptId) {
        receiptId = randomUUID();
      }

      try {
        await sql`
          INSERT INTO public.receipts (id, user_id, storage_path, status)
          VALUES (${receiptId}::uuid, ${user.id}::uuid, ${r2Key}, 'pending')
          ON CONFLICT (id) DO UPDATE SET storage_path = EXCLUDED.storage_path;
        `;
      } catch (dbErr: any) {
        console.warn('[Process] DB receipt record warning:', dbErr.message);
      }
    }

    // 3. Run OCR with Gemini Vision
    try {
      const ocrResult = await extractReceipt(buffer, mimeType, {
        categories: catNames,
        today: new Date().toISOString().split('T')[0],
      });

      // 4. Update receipt status to 'parsed' in Neon DB
      try {
        await sql`
          UPDATE public.receipts
          SET status = 'parsed', ocr_json = ${JSON.stringify(ocrResult)}::jsonb, parsed_at = NOW()
          WHERE id = ${receiptId}::uuid AND user_id = ${user.id}::uuid;
        `;

        // Insert receipt_items
        if (ocrResult.items && ocrResult.items.length > 0) {
          for (const item of ocrResult.items) {
            await sql`
              INSERT INTO public.receipt_items (receipt_id, name, qty, price)
              VALUES (${receiptId}::uuid, ${item.name}, ${item.qty ?? 1}, ${item.price ?? 0});
            `;
          }
        }
      } catch (dbErr: any) {
        console.error('[Process] Neon DB update error:', dbErr.message);
      }

      return NextResponse.json({
        ok: true,
        receipt_id: receiptId,
        user_id: user.id,
        data: ocrResult,
      });

    } catch (ocrError: any) {
      // Mark receipt as failed
      try {
        await sql`
          UPDATE public.receipts
          SET status = 'failed', error = ${ocrError.message || String(ocrError)}
          WHERE id = ${receiptId}::uuid AND user_id = ${user.id}::uuid;
        `;
      } catch { /* Ignore */ }

      console.error('[Process] OCR error:', ocrError.message);
      return NextResponse.json(
        { ok: false, error: 'Gagal memproses OCR nota. Pastikan gambar jelas dan coba lagi.' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('[Process] Unexpected error:', error.message || String(error));
    return NextResponse.json({ error: 'Terjadi kesalahan server. Silakan coba lagi.' }, { status: 500 });
  }
}
