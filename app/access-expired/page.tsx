export default function AccessExpiredPage() {
  const whatsappMessage = encodeURIComponent(
    "Hola, necesito renovar mi acceso a MyKSH."
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B0F14] px-6 text-[#E5E7EB]">
      <section className="w-full max-w-lg rounded-2xl border border-[#F87171]/30 bg-[#F87171]/10 p-8 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#F87171]">
          Acceso vencido
        </p>

        <h1 className="mt-4 text-3xl font-semibold">
          Tu acceso necesita renovación
        </h1>

        <p className="mt-4 text-white/70">
          Escríbenos para renovar tu plan y continuar usando MyKSH.
        </p>

        <a
          href={`https://wa.me/51999999999?text=${whatsappMessage}`}
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-flex rounded-xl bg-[#4ADE80] px-6 py-3 font-semibold text-[#0B0F14]"
        >
          Contactar por WhatsApp
        </a>
      </section>
    </main>
  );
}