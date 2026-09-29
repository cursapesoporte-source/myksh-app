/**
 * lib/import/match-yape-against-bcp.ts
 *
 * Cruza los candidatos normalizados del XLSX de Yape contra los
 * candidatos (ya importados/confirmados o recién parseados) del PDF
 * BCP para detectar duplicados y evitar doble conteo, dado que:
 *
 *  - BCP Ahorros es la fuente contable principal.
 *  - Yape es una billetera vinculada (parent_account_id -> BCP Ahorros).
 *  - Solo las líneas BCP CON NOMBRE (isGenericChannelLine = false)
 *    participan del cruce. Las líneas genéricas (TRAN.CEL.BM.,
 *    TRAN.CTAS.TERC.BM, "Pago YAPE a NNNNNN") se excluyen: representan
 *    movimiento interno entre la cuenta y el "bolsillo" Yape, no un
 *    gasto/ingreso real adicional.
 *
 * Reglas de emparejamiento (en orden de prioridad):
 *  1. Mismo `type` (ingreso/ingreso, gasto/gasto) — dirección debe coincidir.
 *  2. Mismo `amount` exacto (los montos no admiten redondeo distinto
 *     entre ambas fuentes).
 *  3. Fecha dentro de una ventana de ±1 día calendario, porque el PDF
 *     BCP no trae hora y puede registrar el movimiento al día siguiente
 *     si ocurrió cerca de medianoche.
 *  4. Similitud de nombre entre la contraparte Yape y la contraparte BCP
 *     (BCP trunca nombres a ~10-14 caracteres, ej. "Edward Pir" vs
 *     "Edward Pirela Bermudez"), usada solo para desempatar cuando hay
 *     más de un candidato con mismo monto y misma fecha.
 */

export type MatchableSide = {
  id: string; // id temporal o real de la fila candidata
  occurredAt: string; // ISO 8601
  amount: number;
  type: "ingreso" | "gasto";
  counterparty: string | null;
};

export type MatchResult = {
  yapeCandidateId: string;
  bcpCandidateId: string | null;
  confidence: number; // 0-100
  reason: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_WINDOW_MS = 1 * DAY_MS;

/**
 * Compara dos nombres considerando que BCP trunca el nombre de la
 * contraparte. Devuelve un score 0-1 basado en si uno es prefijo
 * normalizado del otro, o si comparten el mayor token en común.
 */
function nameSimilarity(a: string | null, b: string | null): number {
  if (!a || !b) return 0;

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .trim();

  const na = normalize(a);
  const nb = normalize(b);

  if (na === nb) return 1;
  if (na.startsWith(nb) || nb.startsWith(na)) return 0.9;

  const tokensA = na.split(/\s+/).filter(Boolean);
  const tokensB = nb.split(/\s+/).filter(Boolean);
  const common = tokensA.filter((t) => tokensB.includes(t));

  if (common.length === 0) return 0;
  return common.length / Math.max(tokensA.length, tokensB.length);
}

/**
 * Empareja cada candidato Yape contra el mejor candidato BCP disponible.
 * Los candidatos BCP ya deben venir filtrados: solo isGenericChannelLine
 * === false, y pertenecientes a la cuenta BCP vinculada correspondiente.
 */
export function matchYapeAgainstBcp(
  yapeCandidates: MatchableSide[],
  bcpCandidates: MatchableSide[]
): MatchResult[] {
  const usedBcpIds = new Set<string>();
  const results: MatchResult[] = [];

  for (const yape of yapeCandidates) {
    const yapeTime = new Date(yape.occurredAt).getTime();

    const sameAmountAndType = bcpCandidates.filter(
      (bcp) =>
        !usedBcpIds.has(bcp.id) &&
        bcp.type === yape.type &&
        Math.abs(bcp.amount - yape.amount) < 0.01
    );

    const withinWindow = sameAmountAndType.filter((bcp) => {
      const bcpTime = new Date(bcp.occurredAt).getTime();
      return Math.abs(bcpTime - yapeTime) <= DATE_WINDOW_MS;
    });

    if (withinWindow.length === 0) {
      results.push({
        yapeCandidateId: yape.id,
        bcpCandidateId: null,
        confidence: 0,
        reason: "Sin coincidencia BCP: monto/fecha/tipo no encontrados.",
      });
      continue;
    }

    if (withinWindow.length === 1) {
      const bcp = withinWindow[0];
      const sim = nameSimilarity(yape.counterparty, bcp.counterparty);
      usedBcpIds.add(bcp.id);
      results.push({
        yapeCandidateId: yape.id,
        bcpCandidateId: bcp.id,
        confidence: 70 + Math.round(sim * 30),
        reason:
          sim > 0.5
            ? "Coincidencia única por monto+fecha+tipo, nombre compatible."
            : "Coincidencia única por monto+fecha+tipo; nombre no confirma pero no hay alternativa.",
      });
      continue;
    }

    // Múltiples candidatos con mismo monto/fecha/tipo: desempatar por nombre.
    let best = withinWindow[0];
    let bestScore = -1;
    for (const bcp of withinWindow) {
      const sim = nameSimilarity(yape.counterparty, bcp.counterparty);
      if (sim > bestScore) {
        bestScore = sim;
        best = bcp;
      }
    }

    usedBcpIds.add(best.id);
    results.push({
      yapeCandidateId: yape.id,
      bcpCandidateId: best.id,
      confidence: bestScore > 0.3 ? 50 + Math.round(bestScore * 40) : 40,
      reason:
        bestScore > 0.3
          ? "Varios candidatos con mismo monto/fecha; desempatado por nombre."
          : "Varios candidatos con mismo monto/fecha; nombre no concluyente, revisar manualmente.",
    });
  }

  return results;
}

/**
 * Umbral recomendado para autoconfirmar un duplicado sin pedir revisión
 * manual del usuario. Por debajo de esto, se muestra en la pantalla de
 * revisión como "posible duplicado" en vez de descartarse automáticamente.
 */
export const AUTO_DUPLICATE_CONFIDENCE_THRESHOLD = 85;
