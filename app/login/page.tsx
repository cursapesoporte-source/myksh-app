"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError("Correo o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B0F14] px-6 text-[#E5E7EB]">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <div className="mb-8">
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.25em] text-[#4ADE80]">
            MyKSH
          </p>
          <h1 className="text-3xl font-semibold">Iniciar sesión</h1>
          <p className="mt-2 text-sm text-white/60">
            Accede a tu espacio financiero.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none transition focus:border-[#4ADE80]"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none transition focus:border-[#4ADE80]"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-[#F87171]/30 bg-[#F87171]/10 px-4 py-3 text-sm text-[#F87171]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#4ADE80] px-4 py-3 font-semibold text-[#0B0F14] transition hover:bg-[#86EFAC] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </section>
    </main>
  );
}