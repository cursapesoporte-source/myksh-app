const LIMA_TZ = "America/Lima";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function parseISO(iso: string): [number, number, number] {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return [year, month, day];
}

export function formatMoney(amount: number, currency: string): string {
  const code = (currency || "PEN").toUpperCase();
  const value = Number.isFinite(amount) ? amount : 0;
  const number = new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
  const sign = value < 0 ? "-" : "";

  if (code === "PEN") return `${sign}S/ ${number}`;
  if (code === "USD") return `${sign}US$ ${number}`;
  if (code === "USDT") return `${sign}${number} USDT`;
  return `${sign}${code} ${number}`;
}

export function limaTodayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LIMA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function greetingFor(now: Date = new Date()): string {
  const hourText = new Intl.DateTimeFormat("en-GB", {
    timeZone: LIMA_TZ,
    hour: "2-digit",
    hour12: false,
  }).format(now);
  const hour = Number(hourText) % 24;

  if (hour >= 5 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function longDateLabel(now: Date = new Date()): string {
  const label = new Intl.DateTimeFormat("es-PE", {
    timeZone: LIMA_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function addDaysISO(iso: string, days: number): string {
  const [year, month, day] = parseISO(iso);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function addMonthsISO(
  iso: string,
  months: number,
  dayOverride?: number | null,
): string {
  const [year, month, day] = parseISO(iso);
  const total = year * 12 + (month - 1) + months;
  const newYear = Math.floor(total / 12);
  const newMonth = total % 12;
  const lastDay = new Date(Date.UTC(newYear, newMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(dayOverride && dayOverride > 0 ? dayOverride : day, lastDay);
  return `${newYear}-${pad(newMonth + 1)}-${pad(targetDay)}`;
}

export function daysBetweenISO(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = parseISO(fromISO);
  const [ty, tm, td] = parseISO(toISO);
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  return Math.round((to - from) / 86400000);
}

/**
 * Solo para mostrar en el dashboard: si la fecha guardada ya pasó, calcula la
 * siguiente fecha de cobro sin escribir nada en la base de datos.
 */
export function rollChargeDate(
  dateISO: string,
  cycle: string | null,
  billingDay: number | null,
  todayISO: string,
): string {
  const normalizedCycle = (cycle ?? "").toLowerCase();
  let current = dateISO.slice(0, 10);

  for (let i = 0; i < 240 && current < todayISO; i += 1) {
    if (normalizedCycle.includes("anual") || normalizedCycle.includes("year")) {
      current = addMonthsISO(current, 12);
    } else if (normalizedCycle.includes("seman") || normalizedCycle.includes("week")) {
      current = addDaysISO(current, 7);
    } else {
      current = addMonthsISO(current, 1, billingDay);
    }
  }

  return current;
}

export function formatDateOnlyShort(iso: string): string {
  const [year, month, day] = parseISO(iso);
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatTimestampShort(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    timeZone: LIMA_TZ,
  }).format(date);
}
