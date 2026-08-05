import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized: Wajib login untuk melihat dompet.', code: 'SESSION_REQUIRED' },
      { status: 401 }
    );
  }

  const sql = getDb();

  try {
    const accounts = await sql`
      SELECT
        a.id,
        a.name,
        a.type,
        a.mask,
        a.initial_balance,
        a.is_default,
        a.color,
        a.active,
        a.created_at,
        COALESCE(
          a.initial_balance +
          SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) -
          SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END),
          a.initial_balance
        ) AS current_balance
      FROM public.accounts a
      LEFT JOIN public.transactions t
        ON t.account_id = a.id AND t.user_id = ${user.id}::uuid
      WHERE a.user_id = ${user.id}::uuid AND a.active = true
      GROUP BY a.id, a.name, a.type, a.mask, a.initial_balance, a.is_default, a.color, a.active, a.created_at
      ORDER BY a.is_default DESC, a.created_at ASC;
    `;

    return NextResponse.json({ ok: true, accounts: accounts || [] });
  } catch (err: any) {
    console.error('[Wallets GET] DB Error:', err.message);
    return NextResponse.json({ error: 'Gagal mengambil data dompet. Silakan coba lagi.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized: Wajib login untuk membuat dompet.', code: 'SESSION_REQUIRED' },
      { status: 401 }
    );
  }

  let body: {
    name?: string;
    type?: string;
    initial_balance?: number;
    color?: string;
    mask?: string;
  } = {};

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request body harus berupa JSON.' }, { status: 400 });
  }

  const { name, type, initial_balance = 0, color = '#4b5563', mask } = body;

  if (!name || !type) {
    return NextResponse.json({ error: 'name dan type wajib diisi.' }, { status: 400 });
  }

  const validTypes = ['bank', 'ewallet', 'cash'];
  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { error: `type tidak valid. Pilihan: ${validTypes.join(', ')}.` },
      { status: 400 }
    );
  }

  // Validasi panjang & format input
  if (name.length > 100) {
    return NextResponse.json({ error: 'Nama dompet terlalu panjang. Maks 100 karakter.' }, { status: 400 });
  }
  if (mask && mask.length > 10) {
    return NextResponse.json({ error: 'Mask terlalu panjang. Maks 10 karakter.' }, { status: 400 });
  }
  if (color && !/^#[0-9A-Fa-f]{3,6}$/.test(color)) {
    return NextResponse.json({ error: 'Format warna tidak valid. Gunakan format hex seperti #4b5563.' }, { status: 400 });
  }
  if (initial_balance < 0) {
    return NextResponse.json({ error: 'Saldo awal tidak boleh negatif.' }, { status: 400 });
  }

  const sql = getDb();

  try {
    const accountId = randomUUID();
    const rows = await sql`
      INSERT INTO public.accounts (id, user_id, name, type, initial_balance, color, mask, is_default)
      VALUES (${accountId}::uuid, ${user.id}::uuid, ${name}, ${type}, ${initial_balance}, ${color}, ${mask || null}, false)
      RETURNING id, name, type, initial_balance, color, mask, is_default, created_at;
    `;

    return NextResponse.json({ ok: true, account: rows[0] }, { status: 201 });
  } catch (err: any) {
    console.error('[Wallets POST] DB Error:', err.message);
    return NextResponse.json({ error: 'Gagal membuat dompet. Silakan coba lagi.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized: Wajib login untuk mengedit dompet.', code: 'SESSION_REQUIRED' },
      { status: 401 }
    );
  }

  let body: {
    id?: string;
    name?: string;
    type?: string;
    initial_balance?: number;
    color?: string;
    mask?: string;
    is_default?: boolean;
  } = {};

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request body harus berupa JSON.' }, { status: 400 });
  }

  const { id, name, type, initial_balance, color, mask, is_default } = body;

  if (!id || !name || !type) {
    return NextResponse.json({ error: 'id, name, dan type wajib diisi.' }, { status: 400 });
  }

  const validTypes = ['bank', 'ewallet', 'cash'];
  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { error: `type tidak valid. Pilihan: ${validTypes.join(', ')}.` },
      { status: 400 }
    );
  }

  // Validasi panjang & format input (PUT)
  if (name.length > 100) {
    return NextResponse.json({ error: 'Nama dompet terlalu panjang. Maks 100 karakter.' }, { status: 400 });
  }
  if (mask && mask.length > 10) {
    return NextResponse.json({ error: 'Mask terlalu panjang. Maks 10 karakter.' }, { status: 400 });
  }
  if (color && !/^#[0-9A-Fa-f]{3,6}$/.test(color)) {
    return NextResponse.json({ error: 'Format warna tidak valid. Gunakan format hex seperti #4b5563.' }, { status: 400 });
  }

  const sql = getDb();

  try {
    if (is_default) {
      // Reset is_default for all user's accounts first
      await sql`
        UPDATE public.accounts
        SET is_default = false
        WHERE user_id = ${user.id}::uuid;
      `;
    }

    const rows = await sql`
      UPDATE public.accounts
      SET
        name = ${name},
        type = ${type},
        initial_balance = ${initial_balance ?? 0},
        color = ${color || '#4b5563'},
        mask = ${mask || null},
        is_default = ${is_default ? true : false}
      WHERE id = ${id}::uuid AND user_id = ${user.id}::uuid
      RETURNING id, name, type, initial_balance, color, mask, is_default;
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Dompet tidak ditemukan atau tidak memiliki akses.' }, { status: 440 });
    }

    return NextResponse.json({ ok: true, account: rows[0] });
  } catch (err: any) {
    console.error('[Wallets PUT] DB Error:', err.message);
    return NextResponse.json({ error: 'Gagal memperbarui dompet. Silakan coba lagi.' }, { status: 500 });
  }
}

