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

export async function createTransaction(formData: FormData) {
  const { supabase, userId } = await requireActiveUser();

  const accountId = String(formData.get("account_id") ?? "");
  const categoryId = String(formData.get("category_id") ?? "") || null;
  const type = String(formData.get("type") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const occurredAtRaw = String(formData.get("occurred_at") ?? "");
  const amountRaw = String(formData.get("amount") ?? "0");
  const amount = Number(amountRaw.replace(",", "."));

  if (!accountId) {
    throw new Error("Selecciona una cuenta.");
  }

  if (!["ingreso", "gasto"].includes(type)) {
    throw new Error("Tipo de transacción inválido.");
  }

  if (Number.isNaN(amount) || amount <= 0) {
    throw new Error("El monto debe ser un número mayor a cero.");
  }

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id, balance, currency, user_id")
    .eq("id", accountId)
    .single();

  if (accountError || !account || account.user_id !== userId) {
    throw new Error("Cuenta no encontrada.");
  }

  const occurredAt = occurredAtRaw
    ? new Date(occurredAtRaw).toISOString()
    : new Date().toISOString();

  const { error: insertError } = await supabase.from("transactions").insert({
    user_id: userId,
    account_id: accountId,
    category_id: categoryId,
    amount,
    currency: account.currency,
    type,
    description: description || null,
    occurred_at: occurredAt,
    is_recurring: false,
    source: "manual",
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  const balanceChange = type === "ingreso" ? amount : -amount;
  const newBalance = Number(account.balance) + balanceChange;

  const { error: updateError } = await supabase
    .from("accounts")
    .update({ balance: newBalance })
    .eq("id", accountId)
    .eq("user_id", userId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function deleteTransaction(transactionId: string) {
  const { supabase, userId } = await requireActiveUser();

  const { data: transaction, error: readError } = await supabase
    .from("transactions")
    .select("id, account_id, amount, type, user_id")
    .eq("id", transactionId)
    .single();

  if (readError || !transaction || transaction.user_id !== userId) {
    throw new Error("Transacción no encontrada.");
  }

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id, balance")
    .eq("id", transaction.account_id)
    .single();

  if (accountError || !account) {
    throw new Error("Cuenta asociada no encontrada.");
  }

  const reversal =
    transaction.type === "ingreso" ? -transaction.amount : transaction.amount;
  const newBalance = Number(account.balance) + reversal;

  const { error: deleteError } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId)
    .eq("user_id", userId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const { error: updateError } = await supabase
    .from("accounts")
    .update({ balance: newBalance })
    .eq("id", transaction.account_id)
    .eq("user_id", userId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

/**
 * Permite asignar/cambiar la categoría de UNA transacción ya existente
 * (incluida cualquiera importada desde BCP, Interbank o Yape que haya
 * entrado con category_id = NULL). No afecta el saldo de la cuenta,
 * porque cambiar la categoría no cambia el monto ni el tipo.
 */
export async function updateTransactionCategory(
  transactionId: string,
  categoryId: string | null
) {
  const { supabase, userId } = await requireActiveUser();

  const { error } = await supabase
    .from("transactions")
    .update({ category_id: categoryId })
    .eq("id", transactionId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  revalidatePath("/transactions");
  revalidatePath("/budgets");
}

/**
 * Categorización en lote: aplica la misma categoría a varias
 * transacciones seleccionadas a la vez. Tampoco toca el saldo.
 */
export async function bulkUpdateTransactionCategory(
  transactionIds: string[],
  categoryId: string | null
) {
  const { supabase, userId } = await requireActiveUser();
  if (transactionIds.length === 0) return;

  const { error } = await supabase
    .from("transactions")
    .update({ category_id: categoryId })
    .in("id", transactionIds)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  revalidatePath("/transactions");
  revalidatePath("/budgets");
}

/**
 * Eliminación en lote. A diferencia de deleteTransaction, esta SÍ debe
 * revertir el saldo de cada cuenta afectada, una por una, porque
 * pueden venir de cuentas distintas. Se agrupan por cuenta para hacer
 * un solo UPDATE por cuenta en vez de N updates.
 */
export async function bulkDeleteTransactions(transactionIds: string[]) {
  const { supabase, userId } = await requireActiveUser();
  if (transactionIds.length === 0) return;

  const { data: transactions, error: readError } = await supabase
    .from("transactions")
    .select("id, account_id, amount, type, user_id")
    .in("id", transactionIds)
    .eq("user_id", userId);

  if (readError) throw new Error(readError.message);
  if (!transactions || transactions.length === 0) return;

  const { error: deleteError } = await supabase
    .from("transactions")
    .delete()
    .in("id", transactionIds)
    .eq("user_id", userId);

  if (deleteError) throw new Error(deleteError.message);

  const reversalByAccount = new Map<string, number>();
  for (const tx of transactions) {
    const reversal = tx.type === "ingreso" ? -Number(tx.amount) : Number(tx.amount);
    reversalByAccount.set(tx.account_id, (reversalByAccount.get(tx.account_id) ?? 0) + reversal);
  }

  for (const [accountId, totalReversal] of reversalByAccount) {
    const { data: account } = await supabase
      .from("accounts")
      .select("balance")
      .eq("id", accountId)
      .eq("user_id", userId)
      .single();

    if (!account) continue;

    await supabase
      .from("accounts")
      .update({ balance: Number(account.balance) + totalReversal })
      .eq("id", accountId)
      .eq("user_id", userId);
  }

  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}
