import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B0F14] px-6 text-[#E5E7EB]">
      <section className="max-w-2xl text-center">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#4ADE80]">
          MyKSH
        </p>

        <h1 className="mt-5 text-5xl font-semibold tracking-tight">
          Tu dinero, bajo control.
        </h1>

        <p className="mt-5 text-lg text-white/60">
          Una forma más clara de entender, organizar y mejorar tus finanzas.
        </p>

        <Link
          href="/login"
          className="mt-8 inline-flex rounded-xl bg-[#4ADE80] px-6 py-3 font-semibold text-[#0B0F14]"
        >
          Iniciar sesión
        </Link>
      </section>
    </main>
  );
}