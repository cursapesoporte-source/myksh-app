import Link from "next/link";

const ACTIONS = [
  { href: "/accounts", emoji: "🏦", label: "Cuentas" },
  { href: "/transactions", emoji: "💸", label: "Transacciones" },
  { href: "/importar", emoji: "📥", label: "Importar" },
  { href: "/budgets", emoji: "📊", label: "Presupuestos" },
  { href: "/goals", emoji: "🎯", label: "Metas" },
  { href: "/subscriptions", emoji: "🔁", label: "Suscripciones" },
  { href: "/investments", emoji: "📈", label: "Inversiones" },
  { href: "/news", emoji: "📰", label: "Noticias" },
  { href: "/guides", emoji: "📚", label: "Guías" },
];

export default function QuickActions() {
  return (
    <nav aria-label="Accesos rápidos" className="mt-8">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
        {ACTIONS.map((action, index) => (
          <Link
            key={action.href}
            href={action.href}
            className="myksh-fade-up group flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-4 text-center backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-[#4ADE80]/50 hover:bg-[#4ADE80]/10 hover:shadow-[0_8px_24px_rgba(74,222,128,0.15)]"
            style={{ animationDelay: `${index * 45}ms` }}
          >
            <span className="text-2xl transition duration-300 group-hover:scale-110">
              {action.emoji}
            </span>
            <span className="text-xs font-medium text-white/80 group-hover:text-[#4ADE80]">
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
