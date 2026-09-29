"use server";

import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import {
  parseYapeWorkbook,
  type ImportCandidateDraft as YapeCandidateDraft,
} from "@/lib/import/yape-xlsx-parser";
import { findAccountForYapeFile } from "@/lib/import/find-target-account";

const IMPORT_BUCKET = "import-uploads";

export type UploadStatementResult =
  | { ok: true; batchId: string; status: string; message: string }
  | { ok: false; error: string };

export async function uploadStatement(formData: FormData): Promise<UploadStatementResult> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Sesión no válida. Vuelve a iniciar sesión." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No se recibió ningún archivo." };
  if (file.size <= 0) return { ok: false, error: "El archivo está vacío." };
  if (file.size > 15 * 1024 * 1024) return { ok: false, error: "El archivo supera el límite de 15MB." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileHash = createHash("sha256").update(buffer).digest("hex");
  const isXlsx = file.name.toLowerCase().endsWith(".xlsx");
  const isPdf = file.name.toLowerCase().endsWith(".pdf");

  if (!isXlsx && !isPdf) {
    return { ok: false, error: "Solo se aceptan archivos .xlsx (Yape) o .pdf (BCP)." };
  }

  // Limpieza automática de intentos anteriores que no llegaron a confirmarse.
  // Nunca se elimina un lote confirmed.
  await cleanupAbandonedBatch(supabase, user.id, fileHash);

  const { data: existingBatch } = await supabase
    .from("import_batches")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("file_hash", fileHash)
    .maybeSingle();

  if (existingBatch) {
    return {
      ok: false,
      error: `Este archivo ya tiene un lote activo o confirmado (estado: ${existingBatch.status}).`,
    };
  }

  if (isXlsx) {
    return handleYapeUpload({ supabase, userId: user.id, fileName: file.name, fileSize: file.size, fileHash, buffer });
  }

  return handlePdfUpload({ supabase, userId: user.id, fileName: file.name, fileSize: file.size, fileHash, buffer });
}

async function cleanupAbandonedBatch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  fileHash: string
) {
  const { data: abandoned } = await supabase
    .from("import_batches")
    .select("id, status, source_type")
    .eq("user_id", userId)
    .eq("file_hash", fileHash)
    .in("status", ["cancelled", "failed"]);

  if (!abandoned?.length) return;

  for (const batch of abandoned) {
    if (batch.source_type === "bcp_pdf") {
      await supabase.storage
        .from(IMPORT_BUCKET)
        .remove([`${userId}/${batch.id}.pdf`]);
    }

    await supabase
      .from("import_batches")
      .delete()
      .eq("id", batch.id)
      .eq("user_id", userId);
  }
}

async function handleYapeUpload(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  fileName: string;
  fileSize: number;
  fileHash: string;
  buffer: Buffer;
}): Promise<UploadStatementResult> {
  const { supabase, userId, fileName, fileSize, fileHash, buffer } = params;
  const parseResult = parseYapeWorkbook(buffer);

  if (!parseResult.ok) {
    return { ok: false, error: `El archivo no parece ser un reporte válido de Yape: ${parseResult.error}` };
  }

  const resolution = await findAccountForYapeFile(supabase, userId, fileName);
  if (!resolution.ok) {
    return { ok: false, error: resolution.error };
  }

  const targetAccountId = resolution.accountId;

  const { data: batch, error } = await supabase.from("import_batches").insert({
    user_id: userId,
    file_name: fileName,
    file_size_bytes: fileSize,
    file_hash: fileHash,
    source_type: "yape_xlsx",
    status: "reviewing",
    target_account_id: targetAccountId,
    detected_rows: parseResult.totalRows,
  }).select("id").single();

  if (error || !batch) return { ok: false, error: `No se pudo crear el lote de importación: ${error?.message}` };

  const dates = parseResult.candidates.map((c) => new Date(c.occurredAt).getTime());
  const minDate = new Date(Math.min(...dates) - 2 * 86400000).toISOString();
  const maxDate = new Date(Math.max(...dates) + 2 * 86400000).toISOString();

  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, amount, type, occurred_at")
    .eq("user_id", userId)
    .eq("account_id", targetAccountId)
    .gte("occurred_at", minDate)
    .lte("occurred_at", maxDate);

  const rows = parseResult.candidates.map((candidate) => buildYapeCandidateRow({
    batchId: batch.id,
    userId,
    candidate,
    targetAccountId,
    existingTransactions: transactions ?? [],
  }));

  const { error: candidatesError } = await supabase.from("import_candidates").insert(rows);
  if (candidatesError) {
    await supabase.from("import_batches").delete().eq("id", batch.id);
    return { ok: false, error: `No se pudieron guardar los candidatos: ${candidatesError.message}` };
  }

  const duplicateCount = rows.filter((row) => row.duplicate_transaction_id).length;
  await supabase.from("import_batches").update({
    importable_rows: rows.length - duplicateCount,
    duplicate_rows: duplicateCount,
  }).eq("id", batch.id);

  return {
    ok: true,
    batchId: batch.id,
    status: "reviewing",
    message: `Se detectaron ${rows.length} movimientos. Revisa antes de confirmar.`,
  };
}

function buildYapeCandidateRow(params: {
  batchId: string;
  userId: string;
  candidate: YapeCandidateDraft;
  targetAccountId: string;
  existingTransactions: { id: string; amount: number; type: string; occurred_at: string }[];
}) {
  const { batchId, userId, candidate, targetAccountId, existingTransactions } = params;
  const candidateTime = new Date(candidate.occurredAt).getTime();
  const match = existingTransactions.find((tx) =>
    tx.type === candidate.type &&
    Math.abs(tx.amount - candidate.amount) < 0.01 &&
    Math.abs(new Date(tx.occurred_at).getTime() - candidateTime) <= 86400000
  );

  return {
    batch_id: batchId,
    user_id: userId,
    source_type: "yape_xlsx" as const,
    source_row_number: candidate.sourceRowNumber,
    source_record_key: candidate.sourceRecordKey,
    occurred_at: candidate.occurredAt,
    occurred_at_precision: candidate.occurredAtPrecision,
    amount: candidate.amount,
    currency: candidate.currency,
    type: candidate.type,
    description: candidate.description,
    counterparty: candidate.counterparty,
    message: candidate.message,
    raw_data: candidate.rawData,
    suggested_account_id: targetAccountId,
    selected_account_id: targetAccountId,
    account_match_confidence: 100,
    account_match_method: "alias",
    duplicate_transaction_id: match?.id ?? null,
    duplicate_confidence: match ? 90 : null,
    review_action: match ? "skip_duplicate" : "pending",
  };
}

async function handlePdfUpload(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  fileName: string;
  fileSize: number;
  fileHash: string;
  buffer: Buffer;
}): Promise<UploadStatementResult> {
  const { supabase, userId, fileName, fileSize, fileHash, buffer } = params;

  const { data: batch, error } = await supabase.from("import_batches").insert({
    user_id: userId,
    file_name: fileName,
    file_size_bytes: fileSize,
    file_hash: fileHash,
    source_type: "bcp_pdf",
    status: "password_required",
  }).select("id").single();

  if (error || !batch) return { ok: false, error: `No se pudo crear el lote de importación: ${error?.message}` };

  const { error: uploadError } = await supabase.storage.from(IMPORT_BUCKET).upload(
    `${userId}/${batch.id}.pdf`,
    buffer,
    { contentType: "application/pdf", upsert: false }
  );

  if (uploadError) {
    await supabase.from("import_batches").delete().eq("id", batch.id);
    return { ok: false, error: `No se pudo subir el PDF temporal: ${uploadError.message}` };
  }

  return {
    ok: true,
    batchId: batch.id,
    status: "password_required",
    message: "PDF recibido. Ingresa la contraseña del estado de cuenta.",
  };
}