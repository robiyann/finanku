import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Catat keuangan semudah chat
        </h1>
        <p className="mx-auto max-w-xl text-lg text-muted-foreground">
          Kirim &ldquo;jajan bakso 50k&rdquo; ke bot Telegram, dan lihat ringkasan
          pemasukan &amp; pengeluaranmu di dashboard yang rapi.
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/register"
          className="rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition hover:opacity-90"
        >
          Mulai gratis
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-border px-5 py-2.5 font-medium transition hover:bg-muted"
        >
          Masuk
        </Link>
      </div>
    </main>
  );
}
