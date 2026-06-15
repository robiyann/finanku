import { NextResponse, type NextRequest } from "next/server";
import { handleUpdate } from "@/lib/telegram/handleUpdate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Webhook Telegram. Set webhook dengan secret_token = TELEGRAM_WEBHOOK_SECRET,
// Telegram akan mengirim header X-Telegram-Bot-Api-Secret-Token tiap update.
export async function POST(request: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  let update: unknown;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Proses update. Selalu balas 200 supaya Telegram tidak retry berlebihan.
  try {
    await handleUpdate(update as Parameters<typeof handleUpdate>[0]);
  } catch (err) {
    console.error("Webhook handleUpdate error:", err);
  }

  return NextResponse.json({ ok: true });
}
