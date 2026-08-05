import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createSessionToken, getSessionCookieConfig } from '@/lib/session';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  // Security: Validate 'next' param — hanya izinkan path internal
  // Mencegah open redirect attack (e.g., ?next=//evil.com atau ?next=https://phishing.com)
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
      // Check if user already exists
      const existingUsers = await sql`
        SELECT id FROM public.users WHERE email = ${googleUser.email} LIMIT 1;
      `;

      if (existingUsers && existingUsers.length > 0) {
        // Existing user — update profile info
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
        // New user — insert record
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

    // 4. Auto-create default "Cash" account for new users
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

    const sessionUser = {
      id: userId || googleUser.id,
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
