"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TransactionType } from "@/lib/types";

export type ActionResult = { error: string } | { ok: true };

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Tidak terautentikasi");
  return { supabase, userId: user.id };
}

function parseForm(formData: FormData) {
  const type = String(formData.get("type") || "") as TransactionType;
  const amount = Math.round(Number(formData.get("amount")));
  const categoryId = String(formData.get("category_id") || "");
  const description = String(formData.get("description") || "").trim();
  const occurredAt = String(formData.get("occurred_at") || "");
  return { type, amount, categoryId, description, occurredAt };
}

export async function createTransaction(
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  const { type, amount, categoryId, description, occurredAt } =
    parseForm(formData);

  if (type !== "income" && type !== "expense") {
    return { error: "Jenis transaksi tidak valid." };
  }
  if (!amount || amount <= 0) {
    return { error: "Nominal harus lebih dari 0." };
  }
  if (!occurredAt) {
    return { error: "Tanggal wajib diisi." };
  }

  const { error } = await supabase.from("transactions").insert({
    user_id: userId,
    type,
    amount,
    category_id: categoryId || null,
    description: description || null,
    occurred_at: occurredAt,
    source: "manual",
  });

  if (error) return { error: error.message };

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateTransaction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { type, amount, categoryId, description, occurredAt } =
    parseForm(formData);

  if (!amount || amount <= 0) {
    return { error: "Nominal harus lebih dari 0." };
  }

  const { error } = await supabase
    .from("transactions")
    .update({
      type,
      amount,
      category_id: categoryId || null,
      description: description || null,
      occurred_at: occurredAt,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return { ok: true };
}
