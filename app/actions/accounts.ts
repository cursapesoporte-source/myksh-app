"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireActiveUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, userId: user.id };
}

export async function createAccount(formData: FormData) {
  const { supabase, userId } = await requireActiveUser();

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const currency = String(formData.get("currency") ?? "PEN");
  const balanceRaw = String(formData.get("balance") ?? "0");
  const balance = Number(balanceRaw.replace(",", "."));
  const accountNumber = String(formData.get("account_number") ?? "").trim();
  const phoneNumber = String(formData.get("phone_number") ?? "").trim();
  const parentAccountIdRaw = String(formData.get("parent_account_id") ?? "").trim();
  const parentAccountId = parentAccountIdRaw.length > 0 ? parentAccountIdRaw : null;

  if (!name) {
    throw new Error("El nombre de la cuenta es obligatorio.");
  }

  if (!["banco", "efectivo", "inversion", "cripto", "billetera"].includes(type)) {
    throw new Error("Tipo de cuenta inválido.");
  }

  if (!["PEN", "USD", "USDT"].includes(currency)) {
    throw new Error("Moneda inválida.");
  }

  if (Number.isNaN(balance)) {
    throw new Error("El saldo inicial no es un número válido.");
  }

  if (type === "banco" && !accountNumber) {
    throw new Error("El número de cuenta es obligatorio para cuentas bancarias.");
  }

  if (type === "billetera" && !parentAccountId && !phoneNumber) {
    throw new Error(
      "Si la billetera no está vinculada a un banco, el celular asociado es obligatorio."
    );
  }

  if (parentAccountId) {
    // Verifica que la cuenta padre exista, sea del mismo usuario y sea
    // realmente un banco (regla ya reforzada por la BD, pero se valida
    // aquí para dar un mensaje claro antes de intentar insertar).
    const { data: parentAccount, error: parentError } = await supabase
      .from("accounts")
      .select("id, type")
      .eq("id", parentAccountId)
      .eq("user_id", userId)
      .maybeSingle();

    if (parentError || !parentAccount) {
      throw new Error("La cuenta bancaria seleccionada para vincular no existe.");
    }
    if (parentAccount.type !== "banco") {
      throw new Error("Solo se puede vincular una billetera a una cuenta de tipo banco.");
    }
  }

  const { error } = await supabase.from("accounts").insert({
    user_id: userId,
    name,
    type,
    currency,
    balance,
    is_manual: true,
    account_number: type === "banco" ? accountNumber : null,
    phone_number: type === "billetera" && !parentAccountId ? phoneNumber : null,
    parent_account_id: type === "billetera" ? parentAccountId : null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/accounts");
}

export async function deleteAccount(accountId: string) {
  const { supabase, userId } = await requireActiveUser();

  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", accountId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/accounts");
}

export async function updateAccountAlias(accountId: string, aliasText: string) {
  const { supabase, userId } = await requireActiveUser();

  const aliasArray = aliasText
    .split(",")
    .map((a) => a.trim())
    .filter((a) => a.length > 0);

  const { error } = await supabase
    .from("accounts")
    .update({ alias: aliasArray })
    .eq("id", accountId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/accounts");
}

export async function updateAccountNumber(accountId: string, accountNumber: string) {
  const { supabase, userId } = await requireActiveUser();

  const trimmed = accountNumber.trim();
  if (!trimmed) {
    throw new Error("El número de cuenta no puede estar vacío.");
  }

  const { error } = await supabase
    .from("accounts")
    .update({ account_number: trimmed })
    .eq("id", accountId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/accounts");
}

export async function updateAccountPhoneNumber(accountId: string, phoneNumber: string) {
  const { supabase, userId } = await requireActiveUser();

  const trimmed = phoneNumber.trim();
  if (!trimmed) {
    throw new Error("El celular asociado no puede estar vacío.");
  }
  if (!/^\d{9}$/.test(trimmed)) {
    throw new Error("El celular debe tener 9 dígitos, sin código de país (ej. 982540710).");
  }

  const { error } = await supabase
    .from("accounts")
    .update({ phone_number: trimmed })
    .eq("id", accountId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/accounts");
}
