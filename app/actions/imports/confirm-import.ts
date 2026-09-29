/**
 * app/actions/imports/confirm-import.ts
 * Ubicación exacta: app/actions/imports/confirm-import.ts
 *
 * PASO 5: única función autorizada a insertar en `transactions`.
 *
 * Ahora usa `candidate.source_type` (columna explícita) en vez de
 * inferir el origen inspeccionando las llaves de `raw_data`, tal como
 * se decidió para mayor robustez.
 */

"use server";

import { createClient } from "@/lib/supabase/server";

type CandidateDecision = {
  candidateId: string;
  action: "import" | "skip_duplicate" | "skip_manual";
};

export type ConfirmImportResult =
  | { ok: true; insertedCount: number; skippedCount: number }
  | { ok: false; error: string };

const AJUSTE_INTERNO_CATEGORY_NAME = "Ajuste interno (Yape/BCP)";

export async function confirmImport(
  batchId: string,
  decisions: CandidateDecision[]
): Promise<ConfirmImportResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Sesión no válida. Vuelve a iniciar sesión." };
  }

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .select("id, status, file_hash, target_account_id, user_id")
    .eq("id", batchId)
    .eq("user_id", user.id)
    .single();

  if (batchError || !batch) {
    return { ok: false, error: "No se encontró el lote de importación." };
  }

  if (batch.status !== "reviewing") {
    return {
      ok: false,
      error: `Este lote está en estado "${batch.status}" y no puede confirmarse.`,
    };
  }

  if (!batch.target_account_id) {
    return { ok: false, error: "El lote no tiene una cuenta destino asignada." };
  }

  if (decisions.length === 0) {
    return { ok: false, error: "No hay decisiones que aplicar." };
  }

  const { data: candidates, error: candidatesError } = await supabase
    .from("import_candidates")
    .select("*")
    .eq("batch_id", batchId)
    .eq("user_id", user.id);

  if (candidatesError || !candidates) {
    return { ok: false, error: `No se pudieron leer los candidatos: ${candidatesError?.message}` };
  }

  const decisionMap = new Map(decisions.map((d) => [d.candidateId, d.action]));

  const missing = candidates.filter((c) => !decisionMap.has(c.id));
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Faltan decisiones para ${missing.length} movimientos. Revisa todos antes de confirmar.`,
    };
  }

  const categoryId = await ensureAjusteInternoCategory(supabase, user.id);
  if (!categoryId) {
    return { ok: false, error: "No se pudo preparar la categoría de ajuste interno." };
  }

  const toImport = candidates.filter((c) => decisionMap.get(c.id) === "import");
  const toSkip = candidates.filter((c) => decisionMap.get(c.id) !== "import");

  if (toImport.length === 0) {
    await finalizeBatch(supabase, batchId);
    return { ok: true, insertedCount: 0, skippedCount: toSkip.length };
  }

  const transactionRows = toImport.map((candidate) => {
    const isGenericChannelLine = Boolean(
      (candidate.raw_data as { isGenericChannelLine?: boolean } | null)?.isGenericChannelLine
    );

    return {
      user_id: user.id,
      account_id: candidate.selected_account_id ?? batch.target_account_id,
      category_id: isGenericChannelLine ? categoryId : candidate.selected_category_id,
      amount: candidate.amount,
      currency: candidate.currency,
      type: candidate.type,
      description: candidate.description,
      occurred_at: candidate.occurred_at,
      is_recurring: false,
      source: "smart_import",
      import_source: candidate.source_type, // 'yape_xlsx' | 'bcp_pdf', ya no se infiere
      import_file_hash: batch.file_hash,
      import_row_fingerprint: candidate.source_record_key,
    };
  });

  const { data: insertedTransactions, error: insertError } = await supabase
    .from("transactions")
    .insert(transactionRows)
    .select("id, amount, type");

  if (insertError) {
    const isDuplicateKey = insertError.message.includes("duplicate key");
    return {
      ok: false,
      error: isDuplicateKey
        ? "Algunos movimientos ya habían sido importados antes (fila idéntica detectada). No se insertó nada de este lote; revisa duplicados y vuelve a intentar."
        : `No se pudieron crear las transacciones: ${insertError.message}`,
    };
  }

  const netDelta = (insertedTransactions ?? []).reduce((sum, tx) => {
    return sum + (tx.type === "ingreso" ? tx.amount : -tx.amount);
  }, 0);

  const { error: balanceError } = await supabase.rpc("adjust_account_balance", {
    p_account_id: batch.target_account_id,
    p_delta: netDelta,
  });

  if (balanceError) {
    return {
      ok: false,
      error: `Las transacciones se crearon pero no se pudo actualizar el saldo de la cuenta: ${balanceError.message}. Corrige manualmente el saldo o contacta soporte.`,
    };
  }

  await supabase
    .from("import_candidates")
    .update({ review_action: "skip_manual" })
    .in(
      "id",
      toSkip.map((c) => c.id)
    );

  await finalizeBatch(supabase, batchId);

  return {
    ok: true,
    insertedCount: insertedTransactions?.length ?? 0,
    skippedCount: toSkip.length,
  };
}

async function finalizeBatch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  batchId: string
) {
  await supabase
    .from("import_batches")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", batchId);
}

async function ensureAjusteInternoCategory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .eq("name", AJUSTE_INTERNO_CATEGORY_NAME)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("categories")
    .insert({
      user_id: userId,
      name: AJUSTE_INTERNO_CATEGORY_NAME,
      icon: "arrow-left-right",
      type: "ajuste",
    })
    .select("id")
    .single();

  if (error || !created) return null;
  return created.id;
}
