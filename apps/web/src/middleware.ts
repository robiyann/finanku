import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/session-middleware';

// Next.js Edge Middleware — harus export function bernama 'middleware'
// File ini HARUS berada di src/middleware.ts agar Next.js menjalankannya
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Jalankan middleware di semua route KECUALI:
    // - _next/static (file statis)
    // - _next/image (image optimization)
    // - favicon.ico
    // - file gambar (svg, png, jpg, dll)
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
