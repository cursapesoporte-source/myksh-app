import { createHash } from "crypto";

export type BcpStatementHeader = {
  accountNumber: string;
  currency: "SOLES" | "DOLARES";
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number | null;
  totalCargos: number | null;
  totalAbonos: number | null;
};

export type BcpRawLine = {
  fechaProc: string;
  fechaValor: string;
  descripcion: string;
  monto: number;
  columna: "cargo" | "abono";
};

export type ImportCandidateDraft = {
  sourceRowNumber: number;
  sourceRecordKey: string;
  occurredAt: string;
  occurredAtPrecision: "date_only";
  amount: number;
  currency: "PEN";
  type: "ingreso" | "gasto";
  description: string;
  counterparty: string | null;
  isGenericChannelLine: boolean;
  rawData: BcpRawLine;
};

const MONTHS: Record<string, string> = {
  ENE: "01", FEB: "02", MAR: "03", ABR: "04", MAY: "05", JUN: "06",
  JUL: "07", AGO: "08", SEP: "09", OCT: "10", NOV: "11", DIC: "12",
};

// Calibrado con la salida REAL de `pdftotext -layout` (probado con Python
// en el mismo PDF): las líneas CARGO terminan alrededor de la columna
// 145-153; las líneas ABONO alrededor de 205-209. Umbral seguro: 180.
// Reconciliación verificada exacta: 18.98 + 4,121.28 - 3,821.66 = 318.60.
const LINE_LENGTH_THRESHOLD = 180;

const MOVEMENT_LINE_RE = /^\s*(\d{2}[A-Z]{3})\s+(\d{2}[A-Z]{3})\s+(.+?)\s{2,}([\d,]+\.\d{2})\s*$/;

export function parseBcpHeader(text: string): BcpStatementHeader {
  const account = text.match(/(\d{3}-\d{8}-\d-\d{2})\s+(SOLES|DOLARES)/);
  if (!account) throw new Error("No se encontró la cuenta BCP en el PDF.");

  const period = text.match(/DEL\s+(\d{2})\/(\d{2})\/(\d{2})\s+AL\s+(\d{2})\/(\d{2})\/(\d{2})/);
  if (!period) throw new Error("No se encontró el periodo del estado de cuenta.");
  const [, d1, m1, y1, d2, m2, y2] = period;

  const opening = text.match(/SALDO ANTERIOR\s+([\d,]+\.\d{2})/);
  if (!opening) throw new Error("No se encontró el saldo anterior.");

  // Formato real del pie de página:
  // "TOTAL MOVIMIENTO   3,821.66   4,121.28"
  // "SALDO"
  // "   318.60"
  const totals = text.match(/TOTAL MOVIMIENTO\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/);
  const closing = text.match(/SALDO\s*\n+\s*([\d,]+\.\d{2})/);

  return {
    accountNumber: account[1],
    currency: account[2] as "SOLES" | "DOLARES",
    periodStart: `20${y1}-${m1}-${d1}`,
    periodEnd: `20${y2}-${m2}-${d2}`,
    openingBalance: Number(opening[1].replace(/,/g, "")),
    totalCargos: totals ? Number(totals[1].replace(/,/g, "")) : null,
    totalAbonos: totals ? Number(totals[2].replace(/,/g, "")) : null,
    closingBalance: closing ? Number(closing[1].replace(/,/g, "")) : null,
  };
}

export function extractBcpRawLines(text: string): BcpRawLine[] {
  const rows: BcpRawLine[] = [];

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(MOVEMENT_LINE_RE);
    if (!match) continue;

    const [, fechaProc, fechaValor, descripcion, amountText] = match;
    const lineLength = line.replace(/\s+$/, "").length;

    rows.push({
      fechaProc,
      fechaValor,
      descripcion: descripcion.trim(),
      monto: Number(amountText.replace(/,/g, "")),
      columna: lineLength < LINE_LENGTH_THRESHOLD ? "cargo" : "abono",
    });
  }

  return rows;
}

function isGenericChannelDescription(description: string): boolean {
  return [
    /^TRAN\.CEL\.BM\.?$/i,
    /^TRAN\.CEL\.HK\.?$/i,
    /^TRAN\.CTAS\.TERC\.BM$/i,
    /^Pago YAPE a \d+$/i,
    /^TRANSF\.PREXPE/i,
  ].some((pattern) => pattern.test(description.trim()));
}

function extractCounterparty(description: string): string | null {
  const value = description.trim();
  const yape = value.match(/^Yape\s+(.+)$/i);
  if (yape) return yape[1].trim();
  const abonPlin = value.match(/^ABON PLIN-(.+?)\s*\*?$/i);
  if (abonPlin) return abonPlin[1].trim();
  const plin = value.match(/^PLIN-(.+)$/i);
  if (plin) return plin[1].trim();
  if (isGenericChannelDescription(value)) return null;
  if (/^(IMPUESTO ITF|MANT\. CUENTA)/i.test(value)) return null;
  return value;
}

function parseFechaCorta(value: string, year: number): string {
  const match = value.match(/^(\d{2})([A-Z]{3})$/);
  if (!match || !MONTHS[match[2]]) throw new Error(`Fecha BCP inválida: ${value}`);
  return new Date(`${year}-${MONTHS[match[2]]}-${match[1]}T12:00:00-05:00`).toISOString();
}

function buildSourceRecordKey(row: BcpRawLine, index: number, accountNumber: string): string {
  return createHash("sha256")
    .update([accountNumber, row.fechaProc, row.descripcion, row.monto.toFixed(2), row.columna, index].join("|"))
    .digest("hex");
}

export function normalizeBcpRow(
  row: BcpRawLine,
  index: number,
  year: number,
  accountNumber: string
): ImportCandidateDraft {
  const type = row.columna === "cargo" ? "gasto" : "ingreso";
  const counterparty = extractCounterparty(row.descripcion);

  return {
    sourceRowNumber: index,
    sourceRecordKey: buildSourceRecordKey(row, index, accountNumber),
    occurredAt: parseFechaCorta(row.fechaProc, year),
    occurredAtPrecision: "date_only",
    amount: Math.round(row.monto * 100) / 100,
    currency: "PEN",
    type,
    description: counterparty ? `${type === "gasto" ? "Pago a" : "Cobro de"} ${counterparty}` : row.descripcion,
    counterparty,
    isGenericChannelLine: isGenericChannelDescription(row.descripcion),
    rawData: row,
  };
}

export type BcpParseResult =
  | {
      ok: true;
      header: BcpStatementHeader;
      candidates: ImportCandidateDraft[];
      reconciliation: { expectedClosing: number; statedClosing: number | null; matches: boolean };
      failedLines: { rowIndex: number; error: string; raw: string }[];
    }
  | { ok: false; error: string };

export function parseBcpStatement(fullText: string): BcpParseResult {
  try {
    const header = parseBcpHeader(fullText);
    const year = Number(header.periodStart.slice(0, 4));
    const rawRows = extractBcpRawLines(fullText);

    if (rawRows.length === 0) {
      return { ok: false, error: "No se encontraron líneas de movimientos con el formato esperado." };
    }

    const candidates: ImportCandidateDraft[] = [];
    const failedLines: { rowIndex: number; error: string; raw: string }[] = [];

    rawRows.forEach((row, idx) => {
      try {
        candidates.push(normalizeBcpRow(row, idx + 1, year, header.accountNumber));
      } catch (err) {
        failedLines.push({
          rowIndex: idx + 1,
          error: err instanceof Error ? err.message : String(err),
          raw: JSON.stringify(row),
        });
      }
    });

    const totalCargos = candidates.filter((c) => c.type === "gasto").reduce((sum, c) => sum + c.amount, 0);
    const totalAbonos = candidates.filter((c) => c.type === "ingreso").reduce((sum, c) => sum + c.amount, 0);
    const expectedClosing = Math.round((header.openingBalance + totalAbonos - totalCargos) * 100) / 100;

    return {
      ok: true,
      header,
      candidates,
      reconciliation: {
        expectedClosing,
        statedClosing: header.closingBalance,
        matches: header.closingBalance !== null && Math.abs(expectedClosing - header.closingBalance) < 0.01,
      },
      failedLines,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
