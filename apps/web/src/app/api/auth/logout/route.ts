import { NextResponse } from 'next/server';
import { getLogoutCookieConfig } from '@/lib/session';

export async function POST() {
  const cookieConfig = getLogoutCookieConfig();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieConfig.name, cookieConfig.value, cookieConfig);
  return res;
}
