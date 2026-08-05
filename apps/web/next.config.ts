import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Terapkan security headers ke semua route
        source: "/(.*)",
        headers: [
          // Mencegah clickjacking — halaman tidak bisa di-embed dalam iframe
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // Mencegah browser menebak MIME type — wajib untuk file upload security
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Kontrol referrer info yang dikirim saat navigasi
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Batasi akses ke hardware sensitif
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          // Paksa HTTPS — aktif hanya di production
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Content Security Policy — batasi sumber daya yang bisa dimuat
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next.js membutuhkan unsafe-inline untuk style
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              // Script: self + inline untuk Next.js hydration
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              // Gambar: self, data URIs, blob (untuk preview upload), Google avatar, R2
              "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.r2.cloudflarestorage.com",
              // API connections
              "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com",
              // Frame & object
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
          // Cegah DNS prefetch yang tidak perlu
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
