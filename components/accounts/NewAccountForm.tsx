"use client";

import { useRef, useState } from "react";
import { createAccount } from "@/app/actions/accounts";

type BankAccountOption = {
  id: string;
  name: string;
};

type NewAccountFormProps = {
  bankAccounts: BankAccountOption[];
};

export default function NewAccountForm({ bankAccounts }: NewAccountFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState("banco");
  const [parentAccountId, setParentAccountId] = useState("");

  const isBank = type === "banco";
  const isWallet = type === "billetera";
  const isLinkedWallet = isWallet && parentAccountId.length > 0;

  async function handleAction(formData: FormData) {
    setError("");
    setLoading(true);

    try {
      await createAccount(formData);
      formRef.current?.reset();
      setType("banco");
      setParentAccountId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      ref={formRef}
      action={handleAction}
      className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <label htmlFor="name" className="mb-2 block text-sm">
          Nombre de la cuenta
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="Ej. BCP Ahorros"
          className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[#4ADE80]"
        />
      </div>

      <div>
        <label htmlFor="type" className="mb-2 block text-sm">
          Tipo
        </label>
        <select
          id="type"
          name="type"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setParentAccountId("");
          }}
          className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-[#E5E7EB] outline-none focus:border-[#4ADE80]"
        >
          <option value="banco" className="bg-[#0B0F14] text-[#E5E7EB]">Banco</option>
          <option value="billetera" className="bg-[#0B0F14] text-[#E5E7EB]">Billetera (Yape/Plin)</option>
          <option value="efectivo" className="bg-[#0B0F14] text-[#E5E7EB]">Efectivo</option>
          <option value="inversion" className="bg-[#0B0F14] text-[#E5E7EB]">Inversión</option>
          <option value="cripto" className="bg-[#0B0F14] text-[#E5E7EB]">Cripto</option>
        </select>
      </div>

      <div>
        <label htmlFor="currency" className="mb-2 block text-sm">
          Moneda
        </label>
        <select
          id="currency"
          name="currency"
          defaultValue="PEN"
          className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-[#E5E7EB] outline-none focus:border-[#4ADE80]"
        >
          <option value="PEN" className="bg-[#0B0F14] text-[#E5E7EB]">Soles (PEN)</option>
          <option value="USD" className="bg-[#0B0F14] text-[#E5E7EB]">Dólares (USD)</option>
          <option value="USDT" className="bg-[#0B0F14] text-[#E5E7EB]">USDT</option>
        </select>
      </div>

      {isBank && (
        <div className="sm:col-span-2">
          <label htmlFor="account_number" className="mb-2 block text-sm">
            Número de cuenta <span className="text-[#F87171]">*</span>
          </label>
          <input
            id="account_number"
            name="account_number"
            required
            placeholder="Ej. 191-11078875-0-81"
            className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[#4ADE80]"
          />
          <p className="mt-2 text-xs text-white/40">
            Tal como aparece impreso en tu estado de cuenta. Es lo que permite identificar esta
            cuenta con exactitud al importar cualquier PDF bancario.
          </p>
        </div>
      )}

      {isWallet && (
        <>
          <div className="sm:col-span-2">
            <label htmlFor="parent_account_id" className="mb-2 block text-sm">
              ¿Está vinculada a una cuenta bancaria?
            </label>
            <select
              id="parent_account_id"
              name="parent_account_id"
              value={parentAccountId}
              onChange={(e) => setParentAccountId(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-[#E5E7EB] outline-none focus:border-[#4ADE80]"
            >
              <option value="" className="bg-[#0B0F14] text-[#E5E7EB]">
                No, es independiente (usa DNI)
              </option>
              {bankAccounts.map((bank) => (
                <option key={bank.id} value={bank.id} className="bg-[#0B0F14] text-[#E5E7EB]">
                  Sí, vinculada a: {bank.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-white/40">
              Si tu Yape/Plin se activó con una cuenta bancaria, elige esa cuenta aquí: no
              manejará saldo propio y sus movimientos se compararán contra los del banco.
            </p>
          </div>

          {!isLinkedWallet && (
            <div className="sm:col-span-2">
              <label htmlFor="phone_number" className="mb-2 block text-sm">
                Celular asociado <span className="text-[#F87171]">*</span>
              </label>
              <input
                id="phone_number"
                name="phone_number"
                required={!isLinkedWallet}
                maxLength={9}
                placeholder="Ej. 982540710"
                className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[#4ADE80]"
              />
              <p className="mt-2 text-xs text-white/40">
                9 dígitos, sin código de país. Se usa para reconocer el número que trae el nombre
                del archivo de reporte Yape/Plin.
              </p>
            </div>
          )}
        </>
      )}

      <div className="sm:col-span-2">
        <label htmlFor="balance" className="mb-2 block text-sm">
          Saldo inicial
        </label>
        <input
          id="balance"
          name="balance"
          type="number"
          step="0.01"
          defaultValue="0"
          className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[#4ADE80]"
        />
      </div>

      {error && (
        <p className="sm:col-span-2 rounded-xl border border-[#F87171]/30 bg-[#F87171]/10 px-4 py-3 text-sm text-[#F87171]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="sm:col-span-2 min-h-11 rounded-xl bg-[#4ADE80] px-4 py-3 font-semibold text-[#0B0F14] disabled:opacity-50"
      >
        {loading ? "Creando..." : "Crear cuenta"}
      </button>
    </form>
  );
}
