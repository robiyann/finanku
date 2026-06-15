import { createServiceClient } from "@/lib/supabase/service";
import { parseTransaction } from "@/lib/llm/parseTransaction";
import { formatRupiah } from "@/lib/money";
import { sendMessage } from "./sendMessage";
import type { TransactionType } from "@/lib/types";

// Bentuk minimal Telegram Update yang kita perlukan.
interface TelegramUpdate {
  message?: {
    chat: { id: number };
    from?: { first_name?: string };
    text?: string;
  };
}

/** Tanggal hari ini (YYYY-MM-DD) di zona waktu Asia/Jakarta. */
function todayJakarta(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()); // en-CA -> YYYY-MM-DD
}

const HELP_TEXT = `<b>Catatan Keuangan</b> 💰

Cukup ketik transaksimu, contoh:
• <i>jajan bakso 50k</i>
• <i>bayar listrik 150rb</i>
• <i>hari ini gajian 5jt</i>
• <i>kemarin beli pulsa 25rb</i>

Perintah:
/connect &lt;kode&gt; — tautkan akun dashboard
/help — bantuan`;

export async function handleUpdate(update: TelegramUpdate): Promise<void> {
  const message = update.message;
  if (!message || !message.text) return;

  const chatId = message.chat.id;
  const text = message.text.trim();

  // ---- Perintah ----
  if (text === "/start") {
    await sendMessage(
      chatId,
      `Halo${message.from?.first_name ? " " + message.from.first_name : ""}! 👋\n\n${HELP_TEXT}`,
    );
    return;
  }

  if (text === "/help") {
    await sendMessage(chatId, HELP_TEXT);
    return;
  }

  if (text.startsWith("/connect")) {
    const code = text.split(/\s+/)[1];
    await handleConnect(chatId, code);
    return;
  }

  // ---- Teks bebas → parse transaksi ----
  await handleTransactionMessage(chatId, text);
}

async function handleConnect(chatId: number, code?: string): Promise<void> {
  if (!code) {
    await sendMessage(
      chatId,
      "Kirim kode koneksimu, contoh: <code>/connect ABC123</code>.\nKode bisa kamu dapat dari menu Pengaturan di dashboard.",
    );
    return;
  }

  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();

  // Cari kode yang valid (belum dipakai & belum kedaluwarsa).
  const { data: linkCode } = await supabase
    .from("telegram_link_codes")
    .select("id, user_id, expires_at, used_at")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (!linkCode || linkCode.used_at || linkCode.expires_at < nowIso) {
    await sendMessage(
      chatId,
      "Kode tidak valid atau sudah kedaluwarsa. Buat kode baru di dashboard, ya.",
    );
    return;
  }

  // Apakah chat ini sudah tertaut ke user lain?
  const { data: existingByChat } = await supabase
    .from("telegram_links")
    .select("user_id")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();

  if (existingByChat && existingByChat.user_id !== linkCode.user_id) {
    await sendMessage(
      chatId,
      "Akun Telegram ini sudah tertaut ke pengguna lain. Putuskan dulu dari dashboard pengguna tersebut.",
    );
    return;
  }

  // Upsert tautan (unik per user_id).
  const { error: linkError } = await supabase
    .from("telegram_links")
    .upsert(
      { user_id: linkCode.user_id, telegram_chat_id: chatId },
      { onConflict: "user_id" },
    );

  if (linkError) {
    console.error("Gagal membuat telegram_link:", linkError);
    await sendMessage(chatId, "Maaf, gagal menautkan. Coba lagi sebentar lagi.");
    return;
  }

  // Tandai kode sudah dipakai.
  await supabase
    .from("telegram_link_codes")
    .update({ used_at: nowIso })
    .eq("id", linkCode.id);

  await sendMessage(
    chatId,
    "✅ Akun berhasil tertaut!\n\nSekarang kamu bisa langsung catat transaksi. Contoh: <i>jajan bakso 50k</i>",
  );
}

async function handleTransactionMessage(
  chatId: number,
  text: string,
): Promise<void> {
  const supabase = createServiceClient();

  // Cari user dari chat id.
  const { data: link } = await supabase
    .from("telegram_links")
    .select("user_id")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();

  if (!link) {
    await sendMessage(
      chatId,
      "Akunmu belum tertaut. Buka menu <b>Pengaturan</b> di dashboard untuk mendapatkan kode, lalu kirim <code>/connect &lt;kode&gt;</code>.",
    );
    return;
  }

  const userId = link.user_id;

  // Ambil kategori yang tersedia untuk user (default global + milik user).
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, kind")
    .or(`user_id.is.null,user_id.eq.${userId}`);

  const catList = (categories ?? []).map((c) => ({
    name: c.name as string,
    kind: c.kind as TransactionType,
  }));

  const today = todayJakarta();
  const result = await parseTransaction(text, { categories: catList, today });

  if (!result.ok) {
    await sendMessage(chatId, `🤔 ${result.reason}`);
    return;
  }

  // Cocokkan kategori (nama + kind) ke id-nya.
  const categoryId = matchCategoryId(categories ?? [], result.category, result.type);

  const { error: insertError } = await supabase.from("transactions").insert({
    user_id: userId,
    type: result.type,
    amount: result.amount,
    category_id: categoryId,
    description: result.description,
    occurred_at: result.occurred_at,
    source: "telegram",
    raw_text: text,
  });

  if (insertError) {
    console.error("Gagal menyimpan transaksi:", insertError);
    await sendMessage(chatId, "Maaf, gagal menyimpan transaksi. Coba lagi ya.");
    return;
  }

  const label = result.type === "income" ? "Pemasukan" : "Pengeluaran";
  const emoji = result.type === "income" ? "💰" : "🧾";
  const catName = result.category ? ` (${result.category})` : "";
  const desc = result.description ? ` — ${result.description}` : "";

  await sendMessage(
    chatId,
    `${emoji} ${label} <b>${formatRupiah(result.amount)}</b>${catName} tercatat${desc}.`,
  );
}

function matchCategoryId(
  categories: { id: string; name: string; kind: string }[],
  name: string | null,
  kind: TransactionType,
): string | null {
  if (!name) return null;
  const lower = name.toLowerCase();
  const found = categories.find(
    (c) => c.kind === kind && c.name.toLowerCase() === lower,
  );
  return found?.id ?? null;
}
