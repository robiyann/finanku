import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized: Wajib login untuk melihat pengaturan.', code: 'SESSION_REQUIRED' },
      { status: 401 }
    );
  }

  const sql = getDb();

  try {
    const rows = await sql`
      SELECT id, google_id, email, display_name, avatar_url, language, country, currency, settings, created_at
      FROM public.users
      WHERE id = ${user.id}::uuid
      LIMIT 1;
    `;

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          display_name: user.name || '',
          avatar_url: user.avatar || '',
          language: 'id',
          currency: 'IDR',
          settings: { payday_day: 25, notifications: true, recap_weekly: true },
        },
      });
    }

    return NextResponse.json({ ok: true, user: rows[0] });
  } catch (err: any) {
    console.error('[Settings GET] Error:', err.message);
    return NextResponse.json({ error: 'Gagal mengambil pengaturan. Silakan coba lagi.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized: Wajib login untuk menyimpan pengaturan.', code: 'SESSION_REQUIRED' },
      { status: 401 }
    );
  }

  let body: {
    display_name?: string;
    language?: string;
    currency?: string;
    payday_day?: number;
    notifications?: boolean;
    recap_weekly?: boolean;
  } = {};

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request body harus berupa JSON.' }, { status: 400 });
  }

  const { display_name, language = 'id', currency = 'IDR', payday_day = 25, notifications = true, recap_weekly = true } = body;

  // Validasi panjang & format input settings
  if (display_name && display_name.length > 100) {
    return NextResponse.json({ error: 'Nama terlalu panjang. Maks 100 karakter.' }, { status: 400 });
  }
  const VALID_LANGUAGES = ['id', 'en'];
  if (!VALID_LANGUAGES.includes(language)) {
    return NextResponse.json({ error: `Bahasa tidak valid. Pilihan: ${VALID_LANGUAGES.join(', ')}.` }, { status: 400 });
  }
  const VALID_CURRENCIES = ['IDR', 'USD', 'SGD', 'MYR', 'EUR', 'GBP', 'JPY', 'AUD'];
  if (!VALID_CURRENCIES.includes(currency)) {
    return NextResponse.json({ error: `Mata uang tidak valid. Pilihan: ${VALID_CURRENCIES.join(', ')}.` }, { status: 400 });
  }
  const paydayNum = Number(payday_day);
  if (!Number.isInteger(paydayNum) || paydayNum < 1 || paydayNum > 31) {
    return NextResponse.json({ error: 'Tanggal gajian harus antara 1 dan 31.' }, { status: 400 });
  }

  const sql = getDb();

  try {
    const settingsJson = JSON.stringify({
      payday_day: Number(payday_day) || 25,
      notifications: Boolean(notifications),
      recap_weekly: Boolean(recap_weekly),
    });

    const rows = await sql`
      UPDATE public.users SET
        display_name = ${display_name || null},
        language = ${language},
        currency = ${currency},
        settings = ${settingsJson}::jsonb,
        updated_at = NOW()
      WHERE id = ${user.id}::uuid
      RETURNING id, display_name, email, language, currency, settings;
    `;

    return NextResponse.json({ ok: true, user: rows[0] });
  } catch (err: any) {
    console.error('[Settings POST] Error:', err.message);
    return NextResponse.json({ error: 'Gagal menyimpan pengaturan. Silakan coba lagi.' }, { status: 500 });
  }
}
