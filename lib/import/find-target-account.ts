/**
 * lib/import/find-target-account.ts
 *
 * Resuelve la cuenta destino de un archivo de importación usando el
 * identificador exacto (número de cuenta impreso en el PDF, o el
 * celular embebido en el nombre de archivo de Yape), en vez de
 * depender de alias difusos o del campo `institution`.
 */

import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type AccountResolution =
  | { ok: true; accountId: string; matchMethod: "account_number" | "phone_number" | "linked_wallet_parent" }
  | { ok: false; error: string };

function normalizeAccountNumber(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

/**
 * Extrae el número de celular de un nombre de archivo Yape, ej.
 * "ReporteTransacciones+51982540710.xlsx" -> "982540710"
 * (se descarta el código de país 51 si el número tiene 11+ dígitos).
 */
export function extractPhoneFromYapeFileName(fileName: string): string | null {
  const digits = fileName.replace(/[^0-9]/g, "");
  if (digits.length === 11 && digits.startsWith("51")) return digits.slice(2);
  if (digits.length === 9) return digits;
  return null;
}

/**
 * Resuelve la cuenta destino para un PDF bancario, buscando por el
 * número de cuenta exacto extraído del documento.
 */
export async function findAccountByStatementNumber(
  supabase: SupabaseClient,
  userId: string,
  accountNumberFromDocument: string
): Promise<AccountResolution> {
  const normalizedTarget = normalizeAccountNumber(accountNumberFromDocument);

  const { data: accounts, error } = await supabase
    .from("accounts")
    .select("id, account_number")
    .eq("user_id", userId)
    .not("account_number", "is", null);

  if (error) return { ok: false, error: error.message };

  const match = (accounts ?? []).find(
    (account) => normalizeAccountNumber(account.account_number ?? "") === normalizedTarget
  );

  if (!match) {
    return {
      ok: false,
      error: `No se encontró ninguna cuenta con el número "${accountNumberFromDocument}". Agrégalo en Gestionar cuentas antes de importar.`,
    };
  }

  return { ok: true, accountId: match.id, matchMethod: "account_number" };
}

/**
 * Resuelve la cuenta destino para un archivo Yape, con dos escenarios:
 *
 *  1. Existe una billetera Yape vinculada a una cuenta bancaria
 *     (parent_account_id no nulo): el destino es la cuenta padre,
 *     porque Yape en ese caso no maneja saldo propio.
 *
 *  2. Existe una billetera Yape independiente (parent_account_id nulo)
 *     con phone_number configurado, y ese número coincide con el
 *     extraído del nombre del archivo: el destino es la propia
 *     billetera, porque maneja saldo propio (Yape con DNI).
 */
export async function findAccountForYapeFile(
  supabase: SupabaseClient,
  userId: string,
  fileName: string
): Promise<AccountResolution> {
  const phoneFromFile = extractPhoneFromYapeFileName(fileName);

  const { data: yapeAccounts, error } = await supabase
    .from("accounts")
    .select("id, parent_account_id, phone_number")
    .eq("user_id", userId)
    .eq("institution", "Yape");

  if (error) return { ok: false, error: error.message };

  if (!yapeAccounts || yapeAccounts.length === 0) {
    return { ok: false, error: "No existe ninguna cuenta Yape configurada. Agrégala en Gestionar cuentas." };
  }

  if (phoneFromFile) {
    const independentMatch = yapeAccounts.find(
      (account) => account.parent_account_id === null && account.phone_number === phoneFromFile
    );
    if (independentMatch) {
      return { ok: true, accountId: independentMatch.id, matchMethod: "phone_number" };
    }
  }

  const linkedAccount = yapeAccounts.find((account) => account.parent_account_id !== null);
  if (linkedAccount?.parent_account_id) {
    return { ok: true, accountId: linkedAccount.parent_account_id, matchMethod: "linked_wallet_parent" };
  }

  return {
    ok: false,
    error: phoneFromFile
      ? `No se encontró una cuenta Yape con el celular ${phoneFromFile}, ni una billetera Yape vinculada a un banco. Revisa la configuración en Gestionar cuentas.`
      : "No se pudo determinar el celular del archivo Yape y no hay una billetera vinculada a un banco configurada.",
  };
}
