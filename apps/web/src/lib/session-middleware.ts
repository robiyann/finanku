import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE_NAME = 'session_token';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('[SECURITY] JWT_SECRET tidak dikonfigurasi di environment variables!');
  }
  return new TextEncoder().encode(secret);
}

const JWT_SECRET = getJwtSecret();

export async function verifyEdgeSession(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return Boolean(payload?.id);
  } catch {
    return false;
  }
}

export async function updateSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isValidSession = token ? await verifyEdgeSession(token) : false;

  const pathname = request.nextUrl.pathname;

  // Define route types
  const isAuthPage = pathname === '/login';
  const isAuthCallback = pathname.startsWith('/auth/callback');
  const isPublicApiRoute = pathname === '/api/auth/me' || pathname === '/api/auth/logout';
  const isProtectedApiRoute = pathname.startsWith('/api/') && !isPublicApiRoute;
  const isPageRoute = !pathname.startsWith('/api/') && !isAuthPage && !isAuthCallback;

  // --- API Routes: Return 401 JSON (not redirect) ---
  if (isProtectedApiRoute && !isValidSession) {
    return NextResponse.json(
      { error: 'Unauthorized: Sesi login diperlukan.', code: 'SESSION_REQUIRED' },
      { status: 401 }
    );
  }

  // --- Page Routes: Redirect to /login ---
  if (isPageRoute && !isValidSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Preserve the original URL as 'next' param for redirect after login
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // --- Login page: Redirect logged-in user to dashboard ---
  if (isAuthPage && isValidSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
