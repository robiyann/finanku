const TELEGRAM_API = "https://api.telegram.org";

/** Kirim pesan teks ke sebuah chat Telegram. */
export async function sendMessage(
  chatId: number,
  text: string,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN belum diset.");
    return;
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });
    if (!res.ok) {
      console.error("Telegram sendMessage gagal:", await res.text());
    }
  } catch (err) {
    console.error("Telegram sendMessage error:", err);
  }
}
