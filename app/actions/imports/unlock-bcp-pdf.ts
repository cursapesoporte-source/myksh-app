"use server";

import { createClient } from "@/lib/supabase/server";
import { extractBcpPdfLayoutText } from "@/lib/import/extract-bcp-pdf-text";
import {
  parseBcpStatement,
  type ImportCandidateDraft as BcpCandidateDraft,
} from "@/lib/import/bcp-pdf-parser";
import {
  parseInterbankStatement,
  type ImportCandidateDraft as InterbankCandidateDraft,
} from "@/lib/import/interbank-pdf-parser";

const IMPORT_BUCKET = "import-uploads";
const MAX_PASSWORD_ATTEMPTS = 3;

type UnlockResult =
  | { ok: true; batchId: string; message: string }
  | { ok: false; error: string; attemptsLeft?: number };

type DetectedBank = "bcp" | "interbank" | "unknown";

/**
 * Función pública que ya usa tu ImportUploadPanel.tsx. Ahora detecta
 * automáticamente el banco (BCP o Interbank) DESPUÉS de desbloquear el
 * PDF, revisando marcas de texto propias de cada formato. El frontend
 * no necesita saber qué banco es de antemano.
 */
export async function unlockBcpPdf(batchId: string, password: string): Promise<UnlockResult> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false, error: "Sesión no válida." };

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .select("id, status, error_message, password_attempts")
    .eq("id", batchId)
    .eq("user_id", user.id)
    .single();

  if (batchError || !batch) return { ok: false, error: "No se encontró el lote." };
  if (batch.status !== "password_required") {
    return { ok: false, error: `Este lote está en estado "${batch.status}".` };
  }

  const attempts = batch.password_attempts ?? 0;
  if (attempts >= MAX_PASSWORD_ATTEMPTS) {
    await abandonBatch(supabase, user.id, batchId, "Máximo de intentos alcanzado.");
    return { ok: false, error: "Máximo de intentos alcanzado. Vuelve a subir el archivo." };
  }

  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from(IMPORT_BUCKET)
    .download(`${user.id}/${batchId}.pdf`);
  if (downloadError || !fileBlob) {
    return { ok: false, error: "No se pudo recuperar el PDF temporal." };
  }

  let fullText: string;
  try {
    const extraction = await extractBcpPdfLayoutText(
      new Uint8Array(await fileBlob.arrayBuffer()),
      password
    );
    fullText = extraction.text;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message === "PDF_PASSWORD_INVALID") {
      const nextAttempts = attempts + 1;
      const attemptsLeft = MAX_PASSWORD_ATTEMPTS - nextAttempts;

      if (attemptsLeft <= 0) {
        await abandonBatch(supabase, user.id, batchId, "Contraseña incorrecta, intentos agotados.");
        return { ok: false, error: "Contraseña incorrecta. Se agotaron los intentos; vuelve a subir el archivo." };
      }

      await supabase.from("import_batches").update({
        password_attempts: nextAttempts,
        error_message: `Contraseña incorrecta. Intentos usados: ${nextAttempts}.`,
      }).eq("id", batchId);

      return { ok: false, error: "Contraseña incorrecta. Puedes intentarlo nuevamente.", attemptsLeft };
    }

    if (message === "PDFTOTEXT_NOT_INSTALLED") {
      return { ok: false, error: "pdftotext no está instalado en el servidor." };
    }

    await abandonBatch(supabase, user.id, batchId, message);
    return { ok: false, error: `No se pudo procesar el PDF: ${message}` };
  }

  const detectedBank = detectBank(fullText);

  if (detectedBank === "bcp") {
    return handleBcp(supabase, user.id, batchId, fullText);
  }

  if (detectedBank === "interbank") {
    return handleInterbank(supabase, user.id, batchId, fullText);
  }

  await abandonBatch(supabase, user.id, batchId, "No se pudo identificar el banco emisor del PDF.");
  return {
    ok: false,
    error: "No se pudo identificar si este PDF es de BCP o Interbank. Por ahora solo se soportan esos dos bancos.",
  };
}

function detectBank(fullText: string): DetectedBank {
  if (/CARGOS\s*\/\s*DEBE/i.test(fullText) && /ABONOS\s*\/\s*HABER/i.test(fullText)) return "bcp";
  if (/SALDO CONTABLE/i.test(fullText) && /CUENTA SIMPLE/i.test(fullText)) return "interbank";
  return "unknown";
}

// --------------------------------------------------------------------
// BCP
// --------------------------------------------------------------------

async function handleBcp(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  batchId: string,
  fullText: string
): Promise<UnlockResult> {
  const parseResult = parseBcpStatement(fullText);
  if (!parseResult.ok) {
    await abandonBatch(supabase, userId, batchId, parseResult.error);
    return { ok: false, error: `No se pudo interpretar el PDF BCP: ${parseResult.error}` };
  }

  const candidates = parseResult.candidates.filter((c) => c.amount > 0);
  if (candidates.length === 0) {
    await abandonBatch(supabase, userId, batchId, "No se encontraron movimientos con monto mayor a cero.");
    return { ok: false, error: "No se detectaron movimientos válidos en el PDF." };
  }

  const { data: bcpAccount } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", userId)
    .eq("account_number", parseResult.header.accountNumber)
    .maybeSingle();

  if (!bcpAccount) {
    await abandonBatch(
      supabase,
      userId,
      batchId,
      `Ninguna cuenta registrada coincide con el número ${parseResult.header.accountNumber}.`
    );
    return {
      ok: false,
      error: `No existe una cuenta con el número "${parseResult.header.accountNumber}". Regístralo en Gestionar cuentas.`,
    };
  }

  const candidateRows = candidates.map((candidate) =>
    buildBcpCandidateRow({ batchId, userId, candidate, targetAccountId: bcpAccount.id })
  );

  const { error: insertError } = await supabase.from("import_candidates").insert(candidateRows);
  if (insertError) {
    await abandonBatch(supabase, userId, batchId, insertError.message);
    return { ok: false, error: `No se pudieron guardar los movimientos: ${insertError.message}` };
  }

  await cleanupStorage(supabase, userId, batchId);

  await supabase.from("import_batches").update({
    status: "reviewing",
    target_account_id: bcpAccount.id,
    source_account_hint: parseResult.header.accountNumber,
    period_start: parseResult.header.periodStart,
    period_end: parseResult.header.periodEnd,
    detected_rows: candidateRows.length,
    importable_rows: candidateRows.length,
    statement_opening_balance: parseResult.header.openingBalance,
    statement_closing_balance: parseResult.header.closingBalance,
    reconciliation_difference: parseResult.header.closingBalance !== null
      ? Math.round((parseResult.reconciliation.expectedClosing - parseResult.header.closingBalance) * 100) / 100
      : null,
  }).eq("id", batchId);

  return {
    ok: true,
    batchId,
    message: parseResult.reconciliation.matches
      ? `${candidateRows.length} movimientos detectados (BCP). El saldo cuadra exactamente.`
      : `${candidateRows.length} movimientos detectados (BCP). Revisa la diferencia de saldo antes de confirmar.`,
  };
}

function buildBcpCandidateRow(params: {
  batchId: string;
  userId: string;
  candidate: BcpCandidateDraft;
  targetAccountId: string;
}) {
  const { batchId, userId, candidate, targetAccountId } = params;
  return {
    batch_id: batchId,
    user_id: userId,
    source_type: "bcp_pdf" as const,
    source_row_number: candidate.sourceRowNumber,
    source_record_key: candidate.sourceRecordKey,
    occurred_at: candidate.occurredAt,
    occurred_at_precision: candidate.occurredAtPrecision,
    amount: candidate.amount,
    currency: candidate.currency,
    type: candidate.type,
    description: candidate.description,
    counterparty: candidate.counterparty,
    message: null,
    raw_data: { ...candidate.rawData, isGenericChannelLine: candidate.isGenericChannelLine },
    suggested_account_id: targetAccountId,
    selected_account_id: targetAccountId,
    account_match_confidence: 100,
    account_match_method: "account_number" as const,
    review_action: "import" as const,
    review_note: candidate.isGenericChannelLine
      ? "Línea de canal interno; se categorizará como ajuste interno."
      : null,
  };
}

// --------------------------------------------------------------------
// Interbank
// --------------------------------------------------------------------

async function handleInterbank(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  batchId: string,
  fullText: string
): Promise<UnlockResult> {
  const { data: bankAccounts } = await supabase
    .from("accounts")
    .select("id, account_number")
    .eq("user_id", userId)
    .eq("type", "banco")
    .not("account_number", "is", null);

  if (!bankAccounts || bankAccounts.length === 0) {
    await abandonBatch(supabase, userId, batchId, "No hay cuentas bancarias con número configurado.");
    return { ok: false, error: "No hay cuentas bancarias con número configurado. Agrégalo en Gestionar cuentas." };
  }

  let parseResult: ReturnType<typeof parseInterbankStatement> | null = null;
  let matchedAccountId: string | null = null;

  for (const account of bankAccounts) {
    if (!account.account_number) continue;
    const attempt = parseInterbankStatement(fullText, account.account_number);
    if (attempt.ok) {
      parseResult = attempt;
      matchedAccountId = account.id;
      break;
    }
  }

  if (!parseResult || !parseResult.ok || !matchedAccountId) {
    await abandonBatch(
      supabase,
      userId,
      batchId,
      "Ninguna cuenta registrada coincide con los números encontrados en el PDF Interbank."
    );
    return {
      ok: false,
      error: "No se encontró ninguna cuenta tuya que coincida con este PDF de Interbank. Verifica el número de cuenta.",
    };
  }

  const candidates = parseResult.candidates.filter((c) => c.amount > 0);
  if (candidates.length === 0) {
    await abandonBatch(supabase, userId, batchId, "No se detectaron movimientos con monto mayor a cero.");
    return { ok: false, error: "No se detectaron movimientos válidos en el PDF." };
  }

  const candidateRows = candidates.map((candidate) =>
    buildInterbankCandidateRow({ batchId, userId, candidate, targetAccountId: matchedAccountId! })
  );

  const { error: insertError } = await supabase.from("import_candidates").insert(candidateRows);
  if (insertError) {
    await abandonBatch(supabase, userId, batchId, insertError.message);
    return { ok: false, error: `No se pudieron guardar los movimientos: ${insertError.message}` };
  }

  await cleanupStorage(supabase, userId, batchId);

  const rowMismatches = parseResult.reconciliation.rowLevelMismatches.length;

  await supabase.from("import_batches").update({
    status: "reviewing",
    target_account_id: matchedAccountId,
    source_account_hint: parseResult.accountNumber,
    detected_rows: candidateRows.length,
    importable_rows: candidateRows.length,
    reconciliation_difference:
      parseResult.reconciliation.expectedClosing !== null && parseResult.reconciliation.statedClosing !== null
        ? Math.round((parseResult.reconciliation.expectedClosing - parseResult.reconciliation.statedClosing) * 100) / 100
        : null,
  }).eq("id", batchId);

  const reconciliationNote = parseResult.reconciliation.matches
    ? "El saldo cuadra exactamente."
    : "Atención: el saldo total no coincide, revisa antes de confirmar.";

  return {
    ok: true,
    batchId,
    message: `${candidateRows.length} movimientos detectados (Interbank). ${reconciliationNote}${
      rowMismatches > 0 ? ` (${rowMismatches} filas con saldo corriente inconsistente).` : ""
    }`,
  };
}

function buildInterbankCandidateRow(params: {
  batchId: string;
  userId: string;
  candidate: InterbankCandidateDraft;
  targetAccountId: string;
}) {
  const { batchId, userId, candidate, targetAccountId } = params;
  return {
    batch_id: batchId,
    user_id: userId,
    source_type: "interbank_file" as const,
    source_row_number: candidate.sourceRowNumber,
    source_record_key: candidate.sourceRecordKey,
    occurred_at: candidate.occurredAt,
    occurred_at_precision: candidate.occurredAtPrecision,
    amount: candidate.amount,
    currency: candidate.currency,
    type: candidate.type,
    description: candidate.description,
    counterparty: candidate.counterparty,
    message: null,
    raw_data: candidate.rawData,
    suggested_account_id: targetAccountId,
    selected_account_id: targetAccountId,
    account_match_confidence: 100,
    account_match_method: "account_number" as const,
    review_action: "import" as const,
    review_note: null,
  };
}

// --------------------------------------------------------------------
// Helpers comunes
// --------------------------------------------------------------------

async function abandonBatch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  batchId: string,
  reason: string
) {
  await cleanupStorage(supabase, userId, batchId);
  await supabase.from("import_batches").update({
    status: "failed",
    error_message: reason,
  }).eq("id", batchId).eq("user_id", userId);
}

async function cleanupStorage(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, batchId: string) {
  await supabase.storage.from(IMPORT_BUCKET).remove([`${userId}/${batchId}.pdf`]);
}
