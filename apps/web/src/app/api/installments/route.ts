import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized: Wajib login untuk melihat cicilan.', code: 'SESSION_REQUIRED' },
      { status: 401 }
    );
  }

  const sql = getDb();

  try {
    const installments = await sql`
      SELECT
        id,
        name,
        lender,
        amount,
        due_day,
        months_total,
        months_paid,
        start_month,
        auto_log,
        active,
        created_at
      FROM public.installments
      WHERE user_id = ${user.id}::uuid AND active = true
      ORDER BY due_day ASC, created_at DESC;
    `;

    return NextResponse.json({ ok: true, installments: installments || [] });
  } catch (err: any) {
    console.error('[Installments GET] DB Error:', err.message);
    return NextResponse.json({ error: 'Gagal mengambil data cicilan. Silakan coba lagi.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized: Wajib login untuk membuat cicilan.', code: 'SESSION_REQUIRED' },
      { status: 401 }
    );
  }

  let body: {
    name?: string;
    lender?: string;
    amount?: number;
    due_day?: number;
    months_total?: number;
    months_paid?: number;
    start_month?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body request JSON tidak valid.' }, { status: 400 });
  }

  const { name, lender, amount, due_day, months_total, months_paid, start_month } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Nama cicilan wajib diisi.' }, { status: 400 });
  }

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Nominal cicilan per bulan harus lebih dari 0.' }, { status: 400 });
  }

  const dueDayNum = Number(due_day);
  if (!dueDayNum || dueDayNum < 1 || dueDayNum > 31) {
    return NextResponse.json({ error: 'Tanggal jatuh tempo harus antara 1 sampai 31.' }, { status: 400 });
  }

  const sql = getDb();

  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const created = await sql`
      INSERT INTO public.installments (
        user_id,
        name,
        lender,
        amount,
        due_day,
        months_total,
        months_paid,
        start_month,
        auto_log,
        active
      ) VALUES (
        ${user.id}::uuid,
        ${name.trim()},
        ${lender ? lender.trim() : null},
        ${Math.round(amount)},
        ${dueDayNum},
        ${months_total ? Number(months_total) : null},
        ${months_paid ? Number(months_paid) : 0},
        ${start_month ? start_month : todayStr}::date,
        true,
        true
      )
      RETURNING *;
    `;

    return NextResponse.json({ ok: true, installment: created[0] });
  } catch (err: any) {
    console.error('[Installments POST] DB Error:', err.message);
    return NextResponse.json({ error: 'Gagal menambahkan cicilan. Silakan coba lagi.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized: Wajib login.', code: 'SESSION_REQUIRED' },
      { status: 401 }
    );
  }

  let body: {
    id?: string;
    action?: 'pay' | 'update';
    account_id?: string; // Optional wallet ID to pay from
    name?: string;
    lender?: string;
    amount?: number;
    due_day?: number;
    months_total?: number;
    months_paid?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body request JSON tidak valid.' }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: 'ID cicilan wajib diisi.' }, { status: 400 });
  }

  const sql = getDb();

  try {
    // Action 'pay': Increment months_paid by 1 and optionally log expense transaction
    if (body.action === 'pay') {
      const existing = await sql`
        SELECT * FROM public.installments
        WHERE id = ${body.id}::uuid AND user_id = ${user.id}::uuid AND active = true;
      `;

      if (!existing || existing.length === 0) {
        return NextResponse.json({ error: 'Data cicilan tidak ditemukan.' }, { status: 404 });
      }

      const inst = existing[0];
      const newPaid = Number(inst.months_paid || 0) + 1;

      // Update installment paid count
      const updated = await sql`
        UPDATE public.installments
        SET months_paid = ${newPaid}, updated_at = now()
        WHERE id = ${body.id}::uuid AND user_id = ${user.id}::uuid
        RETURNING *;
      `;

      // If account_id is provided, automatically log an expense transaction
      if (body.account_id) {
        const desc = `Pembayaran ${inst.name} (Bulan ke-${newPaid}${inst.months_total ? ` dari ${inst.months_total}` : ''})`;
        await sql`
          INSERT INTO public.transactions (
            user_id,
            account_id,
            type,
            amount,
            merchant,
            description,
            occurred_at,
            source
          ) VALUES (
            ${user.id}::uuid,
            ${body.account_id}::uuid,
            'expense',
            ${inst.amount},
            ${inst.lender || inst.name},
            ${desc},
            current_date,
            'manual'
          );
        `;
      }

      return NextResponse.json({ ok: true, installment: updated[0], message: 'Pembayaran cicilan berhasil dicatat!' });
    }

    // Normal Update Action
    const { name, lender, amount, due_day, months_total, months_paid } = body;
    const updated = await sql`
      UPDATE public.installments
      SET
        name = COALESCE(${name?.trim() || null}, name),
        lender = COALESCE(${lender?.trim() || null}, lender),
        amount = COALESCE(${amount ? Math.round(amount) : null}, amount),
        due_day = COALESCE(${due_day ? Number(due_day) : null}, due_day),
        months_total = COALESCE(${months_total ? Number(months_total) : null}, months_total),
        months_paid = COALESCE(${months_paid !== undefined ? Number(months_paid) : null}, months_paid),
        updated_at = now()
      WHERE id = ${body.id}::uuid AND user_id = ${user.id}::uuid
      RETURNING *;
    `;

    return NextResponse.json({ ok: true, installment: updated[0] });
  } catch (err: any) {
    console.error('[Installments PUT] DB Error:', err.message);
    return NextResponse.json({ error: 'Gagal memperbarui cicilan. Silakan coba lagi.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized: Wajib login.', code: 'SESSION_REQUIRED' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID cicilan wajib disertakan.' }, { status: 400 });
  }

  const sql = getDb();

  try {
    await sql`
      UPDATE public.installments
      SET active = false, updated_at = now()
      WHERE id = ${id}::uuid AND user_id = ${user.id}::uuid;
    `;

    return NextResponse.json({ ok: true, message: 'Cicilan berhasil dihapus.' });
  } catch (err: any) {
    console.error('[Installments DELETE] DB Error:', err.message);
    return NextResponse.json({ error: 'Gagal menghapus cicilan. Silakan coba lagi.' }, { status: 500 });
  }
}
