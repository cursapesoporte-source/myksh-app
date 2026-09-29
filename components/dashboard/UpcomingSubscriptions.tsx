import Link from "next/link";
import { getUpcomingSubscriptions } from "@/app/actions/subscriptions";

const CURRENCY_SYMBOL: Record<string, string> = { PEN: "S/", USD: "$", USDT: "₮" };

/**
 * Widget para el dashboard: suscripciones activas cuyo próximo cobro
 * cae dentro de los próximos 7 días. No se renderiza nada si no hay
 * ninguna próxima (evita ocupar espacio vacío).
 */
export default async function UpcomingSubscriptions() {
  const upcoming = await getUpcomingSubscriptions(7);

  if (upcoming.length === 0) return null;

  return (
    <section className="mt-8 rounded-2xl border border-[#60A5FA]/30 bg-[#60A5FA]/5 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-[#60A5FA]">Suscripciones próximas a pagar</h2>
        <Link href="/subscriptions" className="text-xs text-[#60A5FA] hover:underline">
          Ver todas
        </Link>
      </div>

      <div className="mt-3 grid gap-2">
        {upcoming.map((sub) => {
          const symbol = CURRENCY_SYMBOL[sub.currency] ?? sub.currency;
          return (
            <div
              key={sub.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3"
            >
              <div>
                <p className="font-medium text-[#E5E7EB]">{sub.serviceName}</p>
                <p className="text-xs text-white/50">
                  {sub.daysUntilCharge === 0 ? "Cobra hoy" : `En ${sub.daysUntilCharge} días`} ·{" "}
                  {new Date(sub.nextChargeDate + "T12:00:00").toLocaleDateString("es-PE")}
                </p>
              </div>
              <span className="font-mono font-semibold text-[#E5E7EB]">
                {symbol}{sub.amount.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
