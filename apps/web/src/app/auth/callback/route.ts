import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createSessionToken, getSessionCookieConfig } from '@/lib/session';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // Fix: Use proper origin detection with forwarded headers
  const host = request.headers.get('host') || 
               request.headers.get('x-forwarded-host') || 
               'localhost:3000';
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const origin = `${proto}://${host.split(':')[0]}`;

  const code = searchParams.get('code');

  // Security: Validate 'next' param — only allow internal paths
  const rawNext = searchParams.get('next') ?? '/';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes('://') 
    ? rawNext 
    : '/';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${origin}/auth/callback`;

    if (!clientId || !clientSecret) {
      throw new Error('GOOGLE_CLIENT_ID atau GOOGLE_CLIENT_SECRET belum dikonfigurasi di .env.local');
    }

    // 1. Exchange authorization code for Google access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'Gagal menukar kode otorisasi Google.');
    }

    // 2. Fetch User Profile from Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const googleUser = await userRes.json();

    if (!googleUser.email) {
      throw new Error('Email pengguna tidak ditemukan dari Google.');
    }

    // 3. Upsert user into Neon Postgres database
    const sql = getDb();
    let userId = '';
    let isNewUser = false;

    try {
      const existingUsers = await sql`
        SELECT id FROM public.users WHERE email = ${googleUser.email} LIMIT 1;
      `;

      if (existingUsers && existingUsers.length > 0) {
        userId = existingUsers[0].id;
        await sql`
          UPDATE public.users SET
            google_id = ${googleUser.id},
            display_name = COALESCE(${googleUser.name || null}, display_name),
            avatar_url = COALESCE(${googleUser.picture || null}, avatar_url),
            updated_at = NOW()
          WHERE id = ${userId}::uuid;
        `;
      } else {
        isNewUser = true;
        const rows = await sql`
          INSERT INTO public.users (google_id, email, display_name, avatar_url)
          VALUES (${googleUser.id}, ${googleUser.email}, ${googleUser.name || ''}, ${googleUser.picture || ''})
          RETURNING id;
        `;
        if (rows && rows.length > 0) {
          userId = rows[0].id;
        }
      }
    } catch (dbErr) {
      console.error('[Auth Callback] Neon DB Upsert Error:', dbErr);
    }

    // Auto-create default "Cash" account for new users
    if (isNewUser && userId) {
      try {
        await sql`
          INSERT INTO public.accounts (user_id, name, type, is_default, color, initial_balance)
          VALUES (${userId}::uuid, 'Cash', 'cash', true, '#4b5563', 0)
          ON CONFLICT DO NOTHING;
        `;
        console.log(`[Auth Callback] Default Cash account created for new user: ${userId}`);
      } catch (accountErr) {
        console.error('[Auth Callback] Failed to create default account:', accountErr);
      }
    }

    // CRITICAL FIX: If DB failed upsert (userId empty), DO NOT fallback to googleUser.id
    // because googleUser.id is a numeric Google ID, NOT UUID.
    // Fallback to number will corrupt session and cause all queries
    // "WHERE user_id = ${user.id}::uuid" to fail with "invalid input syntax for type uuid".
    if (!userId) {
      throw new Error('Gagal membuat atau menemukan akun di database. Silakan coba login lagi.');
    }

    const sessionUser = {
      id: userId,
      email: googleUser.email,
      name: googleUser.name,
      avatar: googleUser.picture,
    };

    // 5. Issue JWT Session token cookie
    const token = await createSessionToken(sessionUser);
    const cookieConfig = getSessionCookieConfig(token);

    const res = NextResponse.redirect(`${origin}${next}`);
    res.cookies.set(cookieConfig.name, cookieConfig.value, cookieConfig);
    return res;
  } catch (err: any) {
    console.error('[Auth Callback] Google OAuth Callback error:', err);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(err.message || 'auth_failed')}`);
  }
}
