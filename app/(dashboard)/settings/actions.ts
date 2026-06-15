"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ConnectState =
  | { ok: true; code: string }
  | { error: string }
  | null;

// Generate kode connect 6 karakter (huruf besar + angka, tanpa karakter ambigu).
function generateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

const CODE_TTL_MINUTES = 10;

export async function generateConnectCode(): Promise<ConnectState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi." };

  const code = generateCode();
  const expiresAt = new Date(
    Date.now() + CODE_TTL_MINUTES * 60 * 1000,
  ).toISOString();

  const { error } = await supabase.from("telegram_link_codes").insert({
    user_id: user.id,
    code,
    expires_at: expiresAt,
  });

  if (error) return { error: "Gagal membuat kode. Coba lagi." };

  revalidatePath("/settings");
  return { ok: true, code };
}

export async function disconnectTelegram(): Promise<{ error: string } | { ok: true }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi." };

  const { error } = await supabase
    .from("telegram_links")
    .delete()
    .eq("user_id", user.id);

  if (error) return { error: "Gagal memutuskan tautan." };

  revalidatePath("/settings");
  return { ok: true };
}
