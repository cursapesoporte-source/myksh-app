"use server";

import { createClient } from "@/lib/supabase/server";

const IMPORT_BUCKET = "import-uploads";

export type CancelImportResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Cancela un lote que aún no ha sido confirmado. Nunca se usa sobre un
 * lote 'confirmed', porque eso implicaría revertir transacciones reales
 * (eso requeriría un flujo de reversión distinto y explícito).
 */
export async function cancelImport(batchId: string): Promise<CancelImportResult> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false, error: "Sesión no válida." };

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .select("id, status")
    .eq("id", batchId)
    .eq("user_id", user.id)
    .single();

  if (batchError || !batch) return { ok: false, error: "No se encontró el lote de importación." };

  if (batch.status === "confirmed") {
    return {
      ok: false,
      error: "Este lote ya fue confirmado. No se puede cancelar; usa la edición manual de transacciones si necesitas corregir algo.",
    };
  }

  // Elimina candidatos pendientes de este lote (nunca transacciones reales).
  await supabase.from("import_candidates").delete().eq("batch_id", batchId).eq("user_id", user.id);

  // Por si quedó un PDF temporal sin procesar.
  await supabase.storage.from(IMPORT_BUCKET).remove([`${user.id}/${batchId}.pdf`]);

  const { error: updateError } = await supabase
    .from("import_batches")
    .update({
      status: "cancelled",
      error_message: "Cancelado manualmente por el usuario antes de confirmar.",
    })
    .eq("id", batchId)
    .eq("user_id", user.id);

  if (updateError) return { ok: false, error: `No se pudo cancelar el lote: ${updateError.message}` };

  return { ok: true };
}
