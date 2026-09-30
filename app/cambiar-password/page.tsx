"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MIN_LENGTH = 8;

const inputClass =
  "min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[#4ADE80]";

export default function ChangePasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < MIN_LENGTH) {
      setError(`La nueva contraseña debe tener al menos ${MIN_LENGTH} caracteres.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("La nueva contraseña debe ser distinta de la actual.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: currentPassword,
    });

    if (signInError) {
      setError("El correo o la contraseña actual no son correctos.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      await supabase.auth.signOut();
      setError("No se pudo cambiar la contraseña. Inténtalo con otra más segura.");
      setLoading(false);
      return;
    }

    await supabase.auth.signOut({ scope: "global" });

    setSuccess("Contraseña actualizada. Te llevamos al inicio de sesión…");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => router.push("/login"), 1800);
  }

  const passwordType = showPasswords ? "text" : "password";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B0F14] px-5 py-10 text-[#E5E7EB]">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#4ADE80]">MYKSH</p>
        <h1 className="mt-4 text-3xl font-semibold">Cambiar contraseña</h1>
        <p className="mt-2 text-sm text-white/60">
          Confirma tu correo y tu contraseña actual para elegir una nueva.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm">Correo electrónico</label>
            <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label htmlFor="current" className="mb-2 block text-sm">Contraseña actual</label>
            <input id="current" type={passwordType} required autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label htmlFor="new" className="mb-2 block text-sm">Nueva contraseña</label>
            <input id="new" type={passwordType} required minLength={MIN_LENGTH} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} />
            <p className="mt-1 text-xs text-white/50">Mínimo {MIN_LENGTH} caracteres. Mezcla letras y números.</p>
          </div>

          <div>
            <label htmlFor="confirm" className="mb-2 block text-sm">Repite la nueva contraseña</label>
            <input id="confirm" type={passwordType} required minLength={MIN_LENGTH} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} />
            {confirmPassword && newPassword !== confirmPassword ? (
              <p className="mt-1 text-xs text-[#F87171]">Las contraseñas no coinciden.</p>
            ) : null}
          </div>

          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" checked={showPasswords} onChange={(e) => setShowPasswords(e.target.checked)} />
            Mostrar contraseñas
          </label>

          {error ? (
            <p className="rounded-xl border border-[#F87171]/30 bg-[#F87171]/10 px-4 py-3 text-sm text-[#F87171]">{error}</p>
          ) : null}

          {success ? (
            <p className="rounded-xl border border-[#4ADE80]/30 bg-[#4ADE80]/10 px-4 py-3 text-sm text-[#4ADE80]">{success}</p>
          ) : null}

          <button type="submit" disabled={loading || Boolean(success)} className="min-h-11 w-full rounded-xl bg-[#4ADE80] px-4 py-3 font-semibold text-[#0B0F14] transition hover:bg-[#86EFAC] disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? "Verificando…" : "Cambiar contraseña"}
          </button>
        </form>

        <Link href="/login" className="mt-6 inline-block text-sm text-[#4ADE80] hover:underline">
          ← Volver al inicio de sesión
        </Link>
      </section>
    </main>
  );
}
