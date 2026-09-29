/**
 * lib/import/yape-xlsx-parser.ts
 *
 * Detecta y normaliza archivos "ReporteTransacciones-*.xlsx" de Yape.
 * NO inserta nada en `transactions`. Solo produce candidatos para
 * `import_candidates`, que el usuario revisará y confirmará después.
 *
 * Basado en el archivo real analizado:
 *  - Encabezado real en la fila 5 (índice 4, 0-based) del sheet.
 *  - Columnas: Tipo de Transacción | Origen | Destino | Monto | Mensaje | Fecha de operación
 *  - Tipo de Transacción SOLO tiene dos valores observados: "PAGASTE" y "TE PAGÓ".
 *  - Mensaje es opcional (puede venir vacío).
 *  - Fecha de operación siempre trae hora y segundos: dd/mm/aaaa HH:mm:ss
 *  - Origen/Destino a veces llevan prefijo de red: "BCP - ...", "PLIN - ...", "BBVA - ..."
 *    Esto es la pista principal para el emparejamiento contra el PDF BCP.
 */

import * as XLSX from "xlsx";
import { createHash } from "crypto";

// ------------------------------------------------------------------
// Tipos
// ------------------------------------------------------------------

export type YapeRawRow = {
  tipoTransaccion: string;
  origen: string;
  destino: string;
  monto: number;
  mensaje: string | null;
  fechaOperacion: string; // tal cual viene del archivo, ej "14/09/2026 20:58:15"
};

export type ImportCandidateDraft = {
  sourceRowNumber: number;
  sourceRecordKey: string;
  occurredAt: string; // ISO 8601
  occurredAtPrecision: "exact" | "date_only";
  amount: number;
  currency: "PEN";
  type: "ingreso" | "gasto";
  description: string;
  counterparty: string | null;
  message: string | null;
  networkHint: "BCP" | "PLIN" | "BBVA" | "INTERBANK" | null;
  rawData: YapeRawRow;
};

export type YapeDetectionResult =
  | { isYapeFile: true; headerRowIndex: number }
  | { isYapeFile: false; reason: string };

// ------------------------------------------------------------------
// 1. Detección de formato
// ------------------------------------------------------------------

const EXPECTED_HEADERS = [
  "tipo de transacción",
  "origen",
  "destino",
  "monto",
  "mensaje",
  "fecha de operación",
];

/**
 * Busca en las primeras 10 filas del sheet la fila que contiene
 * exactamente los encabezados esperados de Yape (normalizados,
 * sin tildes/mayúsculas) para evitar falsos positivos con otros XLSX.
 */
export function detectYapeFormat(sheet: XLSX.WorkSheet): YapeDetectionResult {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
  });

  const normalize = (v: unknown) =>
    String(v ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const normalizedRow = (rows[i] ?? []).map(normalize);
    const matchesAll = EXPECTED_HEADERS.every((expected) =>
      normalizedRow.some((cell) => cell === normalize(expected))
    );
    if (matchesAll) {
      return { isYapeFile: true, headerRowIndex: i };
    }
  }

  return {
    isYapeFile: false,
    reason:
      "No se encontró una fila con los encabezados exactos de Yape (Tipo de Transacción, Origen, Destino, Monto, Mensaje, Fecha de operación) en las primeras 10 filas.",
  };
}

// ------------------------------------------------------------------
// 2. Extracción de filas crudas
// ------------------------------------------------------------------

export function extractYapeRawRows(
  sheet: XLSX.WorkSheet,
  headerRowIndex: number
): YapeRawRow[] {
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    range: headerRowIndex,
    defval: "",
  });

  const result: YapeRawRow[] = [];

  for (const row of rows) {
    const tipoTransaccion = String(row["Tipo de Transacción"] ?? "").trim();
    const fechaOperacion = String(row["Fecha de operación"] ?? "").trim();
    const montoRaw = row["Monto"];

    // Filas vacías o de cierre de reporte se descartan aquí, no en la UI.
    if (!tipoTransaccion || !fechaOperacion) continue;

    const monto =
      typeof montoRaw === "number"
        ? montoRaw
        : parseFloat(String(montoRaw).replace(/[^\d.-]/g, ""));

    if (!Number.isFinite(monto) || monto <= 0) continue;

    result.push({
      tipoTransaccion,
      origen: String(row["Origen"] ?? "").trim(),
      destino: String(row["Destino"] ?? "").trim(),
      monto,
      mensaje: String(row["Mensaje"] ?? "").trim() || null,
      fechaOperacion,
    });
  }

  return result;
}

// ------------------------------------------------------------------
// 3. Normalización a candidato de importación
// ------------------------------------------------------------------

const TIPO_A_MOVIMIENTO: Record<string, "ingreso" | "gasto"> = {
  PAGASTE: "gasto",
  "TE PAGÓ": "ingreso",
};

/**
 * Convierte "14/09/2026 20:58:15" (hora local Perú, UTC-5) a ISO 8601 UTC.
 */
function parseYapeDateToISO(fecha: string): string {
  const match = fecha.match(
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/
  );
  if (!match) {
    throw new Error(`Formato de fecha Yape no reconocido: "${fecha}"`);
  }
  const [, dd, mm, yyyy, hh, min, ss] = match;
  // Perú es UTC-5 fijo, sin horario de verano.
  const isoLocal = `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}-05:00`;
  return new Date(isoLocal).toISOString();
}

/**
 * Detecta si el origen/destino trae un prefijo de red bancaria,
 * pista clave para el emparejamiento contra el PDF BCP.
 */
function detectNetworkHint(
  origen: string,
  destino: string
): ImportCandidateDraft["networkHint"] {
  const combined = `${origen} ${destino}`.toUpperCase();
  if (combined.includes("BCP -") || combined.includes("BCP-")) return "BCP";
  if (combined.includes("PLIN -") || combined.includes("PLIN-")) return "PLIN";
  if (combined.includes("BBVA -") || combined.includes("BBVA-")) return "BBVA";
  if (combined.includes("INTERBANK")) return "INTERBANK";
  return null;
}

/**
 * Genera una clave única y estable por fila para deduplicar
 * reimportaciones del mismo archivo (usa el mismo criterio que
 * alimentará import_row_fingerprint).
 */
function buildSourceRecordKey(row: YapeRawRow, rowIndex: number): string {
  const base = [
    row.tipoTransaccion,
    row.origen,
    row.destino,
    row.monto.toFixed(2),
    row.fechaOperacion,
    rowIndex, // desempata filas idénticas en el mismo segundo
  ].join("|");
  return createHash("sha256").update(base).digest("hex");
}

export function normalizeYapeRow(
  row: YapeRawRow,
  rowIndex: number
): ImportCandidateDraft {
  const type = TIPO_A_MOVIMIENTO[row.tipoTransaccion];
  if (!type) {
    throw new Error(
      `Tipo de Transacción no reconocido: "${row.tipoTransaccion}". ` +
        `Valores soportados: PAGASTE, TE PAGÓ. Revisar manualmente esta fila.`
    );
  }

  const counterparty = type === "gasto" ? row.destino : row.origen;
  const description =
    type === "gasto" ? `Pago a ${row.destino}` : `Cobro de ${row.origen}`;

  return {
    sourceRowNumber: rowIndex,
    sourceRecordKey: buildSourceRecordKey(row, rowIndex),
    occurredAt: parseYapeDateToISO(row.fechaOperacion),
    occurredAtPrecision: "exact",
    amount: Math.round(row.monto * 100) / 100,
    currency: "PEN",
    type,
    description,
    counterparty: counterparty || null,
    message: row.mensaje,
    networkHint: detectNetworkHint(row.origen, row.destino),
    rawData: row,
  };
}

// ------------------------------------------------------------------
// 4. Punto de entrada del adaptador
// ------------------------------------------------------------------

export type YapeParseResult =
  | {
      ok: true;
      candidates: ImportCandidateDraft[];
      totalRows: number;
      failedRows: { rowIndex: number; error: string }[];
    }
  | { ok: false; error: string };

export function parseYapeWorkbook(fileBuffer: Buffer): YapeParseResult {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  const detection = detectYapeFormat(sheet);
  if (!detection.isYapeFile) {
    return { ok: false, error: detection.reason };
  }

  const rawRows = extractYapeRawRows(sheet, detection.headerRowIndex);

  const candidates: ImportCandidateDraft[] = [];
  const failedRows: { rowIndex: number; error: string }[] = [];

  rawRows.forEach((row, idx) => {
    try {
      candidates.push(normalizeYapeRow(row, idx + 1));
    } catch (err) {
      failedRows.push({
        rowIndex: idx + 1,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  return {
    ok: true,
    candidates,
    totalRows: rawRows.length,
    failedRows,
  };
}
