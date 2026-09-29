import { createHash } from "crypto";

/**
 * lib/import/interbank-pdf-parser.ts
 *
 * Parser del Estado de Cuenta Interbank (PDF, normalmente sin
 * contraseña, ya validado con un extracto real de octubre 2024).
 *
 * Diferencias clave frente a BCP:
 *  - El monto ya trae signo explícito ("+" = ingreso, "-" = gasto),
 *    no depende de la posición de columna.
 *  - Cada fila trae su propio saldo corriente ("Saldo Contable"),
 *    lo que permite autovalidar movimiento por movimiento.
 *  - El PDF trae, después del extracto real, una página EDUCATIVA de
 *    ejemplo con una cuenta y titular completamente distintos (ej.
 *    "100-7000590278 María Vara de Gamarra"). Esa página se ignora
 *    por completo: el parser segmenta el documento por cada número
 *    de cuenta que aparece y el llamador debe quedarse solo con el
 *    bloque cuyo número coincide con `accounts.account_number`.
 *  - El periodo se imprime con el mes en palabras
 *    ("DEL 30 DE SETIEMBRE AL 31 DE OCTUBRE"), sin año explícito;
 *    el año se toma de la primera fecha de movimiento del bloque.
 */

const MESES: Record<string, string> = {
  ENERO: "01", FEBRERO: "02", MARZO: "03", ABRIL: "04",
  MAYO: "05", JUNIO: "06", JULIO: "07", AGOSTO: "08",
  SETIEMBRE: "09", SEPTIEMBRE: "09", OCTUBRE: "10",
  NOVIEMBRE: "11", DICIEMBRE: "12",
};

const ACCOUNT_NUMBER_RE = /(\d{3}-\d{7,10})/g;
const MOVEMENT_LINE_RE =
  /^\s*(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([+-][\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s*$/;
const OPENING_RE = /EMPEZASTE\s+\w+\s+CON\s+([\d,]+\.\d{2})/;
const CLOSING_RE =
  /SALDO CONTABLE AL \d{1,2}\/\d{1,2}\s+([+-][\d,]+\.\d{2})\s+([+-][\d,]+\.\d{2})\s+([\d,]+\.\d{2})/;
const PERIOD_RE = /DEL\s+(\d{1,2})\s+DE\s+(\w+)\s+AL\s+(\d{1,2})\s+DE\s+(\w+)/i;

export type InterbankRawLine = {
  fecha: string; // dd/mm/yyyy
  concepto: string;
  monto: number; // con signo
  saldoCorriente: number;
};

export type InterbankAccountBlock = {
  accountNumber: string;
  periodStartDay: string;
  periodStartMonth: string;
  periodEndDay: string;
  periodEndMonth: string;
  openingBalance: number | null;
  totalIngresos: number | null;
  totalGastos: number | null;
  closingBalance: number | null;
  rawLines: InterbankRawLine[];
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
  rawData: InterbankRawLine;
};

/**
 * Segmenta el PDF completo en bloques, uno por cada número de cuenta
 * detectado. Interbank imprime siempre una página educativa de ejemplo
 * al final con una cuenta distinta a la real; segmentar así permite
 * descartarla sin ambigüedad.
 */
export function splitIntoAccountBlocks(fullText: string): { accountNumber: string; text: string }[] {
  const positions = Array.from(fullText.matchAll(ACCOUNT_NUMBER_RE)).map((m) => ({
    accountNumber: m[1],
    index: m.index ?? 0,
  }));

  if (positions.length === 0) return [];

  return positions.map((pos, i) => {
    const end = i + 1 < positions.length ? positions[i + 1].index : fullText.length;
    return { accountNumber: pos.accountNumber, text: fullText.slice(pos.index, end) };
  });
}

function parseMonthYear(dayStr: string, monthName: string, referenceYear: string): string {
  const month = MESES[monthName.toUpperCase()];
  if (!month) throw new Error(`Mes en español no reconocido: "${monthName}"`);
  return `${referenceYear}-${month}-${dayStr.padStart(2, "0")}`;
}

export function parseInterbankBlock(blockText: string, accountNumber: string): InterbankAccountBlock {
  const rawLines: InterbankRawLine[] = [];

  for (const line of blockText.split(/\r?\n/)) {
    const match = line.match(MOVEMENT_LINE_RE);
    if (!match) continue;

    const [, fecha, concepto, montoText, saldoText] = match;
    rawLines.push({
      fecha,
      concepto: concepto.trim(),
      monto: Number(montoText.replace(/,/g, "")),
      saldoCorriente: Number(saldoText.replace(/,/g, "")),
    });
  }

  const openingMatch = blockText.match(OPENING_RE);
  const closingMatch = blockText.match(CLOSING_RE);
  const periodMatch = blockText.match(PERIOD_RE);

  return {
    accountNumber,
    periodStartDay: periodMatch?.[1] ?? "",
    periodStartMonth: periodMatch?.[2] ?? "",
    periodEndDay: periodMatch?.[3] ?? "",
    periodEndMonth: periodMatch?.[4] ?? "",
    openingBalance: openingMatch ? Number(openingMatch[1].replace(/,/g, "")) : null,
    totalIngresos: closingMatch ? Number(closingMatch[1].replace(/[+,]/g, "")) : null,
    totalGastos: closingMatch ? Math.abs(Number(closingMatch[2].replace(/,/g, ""))) : null,
    closingBalance: closingMatch ? Number(closingMatch[3].replace(/,/g, "")) : null,
    rawLines,
  };
}

function buildSourceRecordKey(line: InterbankRawLine, index: number, accountNumber: string): string {
  return createHash("sha256")
    .update([accountNumber, line.fecha, line.concepto, line.monto.toFixed(2), line.saldoCorriente.toFixed(2), index].join("|"))
    .digest("hex");
}

function normalizeLine(
  line: InterbankRawLine,
  index: number,
  accountNumber: string
): ImportCandidateDraft {
  const [dd, mm, yyyy] = line.fecha.split("/");
  const occurredAt = new Date(`${yyyy}-${mm}-${dd}T12:00:00-05:00`).toISOString();
  const type: "ingreso" | "gasto" = line.monto >= 0 ? "ingreso" : "gasto";
  const amount = Math.abs(Math.round(line.monto * 100) / 100);

  return {
    sourceRowNumber: index,
    sourceRecordKey: buildSourceRecordKey(line, index, accountNumber),
    occurredAt,
    occurredAtPrecision: "date_only",
    amount,
    currency: "PEN",
    type,
    description: `${type === "gasto" ? "Pago" : "Cobro"}: ${line.concepto}`,
    counterparty: line.concepto,
    rawData: line,
  };
}

export type InterbankParseResult =
  | {
      ok: true;
      accountNumber: string;
      candidates: ImportCandidateDraft[];
      reconciliation: {
        expectedClosing: number | null;
        statedClosing: number | null;
        matches: boolean;
        rowLevelMismatches: { index: number; expected: number; actual: number }[];
      };
    }
  | { ok: false; error: string };

/**
 * Punto de entrada. Recibe el texto completo del PDF (todas las páginas)
 * y el número de cuenta REGISTRADO por el usuario en `accounts`. Solo
 * procesa el bloque cuyo número coincide exactamente; si ningún bloque
 * coincide, falla explícitamente en vez de adivinar.
 */
export function parseInterbankStatement(
  fullText: string,
  registeredAccountNumber: string
): InterbankParseResult {
  const normalize = (s: string) => s.replace(/[^0-9]/g, "");
  const blocks = splitIntoAccountBlocks(fullText);

  const matchingBlock = blocks.find(
    (b) => normalize(b.accountNumber) === normalize(registeredAccountNumber)
  );

  if (!matchingBlock) {
    return {
      ok: false,
      error: `Ninguna sección del PDF coincide con el número de cuenta registrado (${registeredAccountNumber}). Se encontraron: ${blocks.map((b) => b.accountNumber).join(", ") || "ninguno"}.`,
    };
  }

  const parsed = parseInterbankBlock(matchingBlock.text, matchingBlock.accountNumber);

  if (parsed.rawLines.length === 0) {
    return { ok: false, error: "Se encontró la cuenta, pero no se detectaron movimientos en ese bloque." };
  }

  const candidates = parsed.rawLines.map((line, idx) =>
    normalizeLine(line, idx + 1, parsed.accountNumber)
  );

  // Autovalidación fila por fila: cada saldo corriente debe ser
  // exactamente saldo_anterior + monto (con signo). Esto es posible
  // gracias a que Interbank imprime el saldo en cada movimiento.
  const rowLevelMismatches: { index: number; expected: number; actual: number }[] = [];
  let runningBalance = parsed.openingBalance ?? parsed.rawLines[0].saldoCorriente - parsed.rawLines[0].monto;

  parsed.rawLines.forEach((line, idx) => {
    const expected = Math.round((runningBalance + line.monto) * 100) / 100;
    if (Math.abs(expected - line.saldoCorriente) > 0.01) {
      rowLevelMismatches.push({ index: idx + 1, expected, actual: line.saldoCorriente });
    }
    runningBalance = line.saldoCorriente;
  });

  const totalIngresos = candidates.filter((c) => c.type === "ingreso").reduce((s, c) => s + c.amount, 0);
  const totalGastos = candidates.filter((c) => c.type === "gasto").reduce((s, c) => s + c.amount, 0);
  const expectedClosing =
    parsed.openingBalance !== null
      ? Math.round((parsed.openingBalance + totalIngresos - totalGastos) * 100) / 100
      : null;

  return {
    ok: true,
    accountNumber: parsed.accountNumber,
    candidates,
    reconciliation: {
      expectedClosing,
      statedClosing: parsed.closingBalance,
      matches:
        expectedClosing !== null &&
        parsed.closingBalance !== null &&
        Math.abs(expectedClosing - parsed.closingBalance) < 0.01,
      rowLevelMismatches,
    },
  };
}
