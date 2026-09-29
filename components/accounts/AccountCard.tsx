"use client";

import { useState } from "react";
import {
  deleteAccount,
  updateAccountAlias,
  updateAccountNumber,
  updateAccountPhoneNumber,
} from "@/app/actions/accounts";

type AccountCardProps = {
  account: {
    id: string;
    name: string;
    type: string;
    currency: string;
    balance: number;
    alias: string[];
    account_number: string | null;
    phone_number: string | null;
    parent_account_id: string | null;
  };
};

const typeLabels: Record<string, string> = {
  banco: "Banco",
  efectivo: "Efectivo",
  inversion: "Inversión",
  cripto: "Cripto",
  billetera: "Billetera",
};

export default function AccountCard({ account }: AccountCardProps) {
  const [loading, setLoading] = useState(false);
  const [aliasInput, setAliasInput] = useState(account.alias.join(", "));
  const [savingAlias, setSavingAlias] = useState(false);

  const [accountNumberInput, setAccountNumberInput] = useState(account.account_number ?? "");
  const [savingAccountNumber, setSavingAccountNumber] = useState(false);
  const [accountNumberError, setAccountNumberError] = useState<string | null>(null);

  const [phoneNumberInput, setPhoneNumberInput] = useState(account.phone_number ?? "");
  const [savingPhoneNumber, setSavingPhoneNumber] = useState(false);
  const [phoneNumberError, setPhoneNumberError] = useState<string | null>(null);

  const isBankAccount = account.type === "banco";
  const isIndependentWallet = account.type === "billetera" && !account.parent_account_id;

  async function handleDelete() {
    const confirmed = window.confirm(
      `¿Eliminar la cuenta "${account.name}"? Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      await deleteAccount(account.id);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAlias() {
    setSavingAlias(true);
    try {
      await updateAccountAlias(account.id, aliasInput);
    } finally {
      setSavingAlias(false);
    }
  }

  async function handleSaveAccountNumber() {
    setAccountNumberError(null);
    setSavingAccountNumber(true);
    try {
      await updateAccountNumber(account.id, accountNumberInput);
    } catch (error) {
      setAccountNumberError(error instanceof Error ? error.message : "No se pudo guardar el número de cuenta.");
    } finally {
      setSavingAccountNumber(false);
    }
  }

  async function handleSavePhoneNumber() {
    setPhoneNumberError(null);
    setSavingPhoneNumber(true);
    try {
      await updateAccountPhoneNumber(account.id, phoneNumberInput);
    } catch (error) {
      setPhoneNumberError(error instanceof Error ? error.message : "No se pudo guardar el celular.");
    } finally {
      setSavingPhoneNumber(false);
    }
  }

  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">{account.name}</p>
          <p className="mt-1 text-sm text-white/50">
            {typeLabels[account.type] ?? account.type} · {account.currency}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <p className="font-mono text-lg font-semibold text-[#4ADE80]">
            {account.currency} {account.balance.toFixed(2)}
          </p>

          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="min-h-11 rounded-xl border border-[#F87171]/40 px-3 py-2 text-sm text-[#F87171] disabled:opacity-50"
          >
            Eliminar
          </button>
        </div>
      </div>

      {isBankAccount && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <label htmlFor={`account-number-${account.id}`} className="mb-2 block text-sm text-white/60">
            Número de cuenta <span className="text-[#F87171]">*</span>
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id={`account-number-${account.id}`}
              value={accountNumberInput}
              onChange={(e) => setAccountNumberInput(e.target.value)}
              placeholder="Ej. 191-11078875-0-81"
              className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-[#E5E7EB] outline-none focus:border-[#4ADE80]"
            />
            <button
              type="button"
              onClick={handleSaveAccountNumber}
              disabled={savingAccountNumber}
              className="min-h-11 rounded-xl bg-[#60A5FA] px-4 text-sm font-semibold text-[#0B0F14] disabled:opacity-50"
            >
              {savingAccountNumber ? "Guardando..." : "Guardar"}
            </button>
          </div>
          {accountNumberError && (
            <p className="mt-2 text-xs text-[#F87171]">{accountNumberError}</p>
          )}
          <p className="mt-2 text-xs text-white/40">
            Tal como aparece impreso en tu estado de cuenta. Se usa para identificar con exactitud
            esta cuenta al importar cualquier PDF bancario, sin depender de alias.
          </p>
        </div>
      )}

      {isIndependentWallet && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <label htmlFor={`phone-number-${account.id}`} className="mb-2 block text-sm text-white/60">
            Celular asociado <span className="text-[#F87171]">*</span>
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id={`phone-number-${account.id}`}
              value={phoneNumberInput}
              onChange={(e) => setPhoneNumberInput(e.target.value)}
              placeholder="Ej. 982540710"
              maxLength={9}
              className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-[#E5E7EB] outline-none focus:border-[#4ADE80]"
            />
            <button
              type="button"
              onClick={handleSavePhoneNumber}
              disabled={savingPhoneNumber}
              className="min-h-11 rounded-xl bg-[#60A5FA] px-4 text-sm font-semibold text-[#0B0F14] disabled:opacity-50"
            >
              {savingPhoneNumber ? "Guardando..." : "Guardar"}
            </button>
          </div>
          {phoneNumberError && (
            <p className="mt-2 text-xs text-[#F87171]">{phoneNumberError}</p>
          )}
          <p className="mt-2 text-xs text-white/40">
            Solo aplica si esta billetera usa DNI (sin banco vinculado). Se usa para reconocer el
            número embebido en el nombre del archivo Yape/Plin, sin necesidad de alias.
          </p>
        </div>
      )}

      <div className="mt-4 border-t border-white/10 pt-4">
        <label htmlFor={`alias-${account.id}`} className="mb-2 block text-sm text-white/60">
          Alias para importaciones (Yape, BCP, etc.)
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={`alias-${account.id}`}
            value={aliasInput}
            onChange={(e) => setAliasInput(e.target.value)}
            placeholder="Ej. Yapesito, Yape BCP, mi Yape"
            className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-[#E5E7EB] outline-none focus:border-[#4ADE80]"
          />
          <button
            type="button"
            onClick={handleSaveAlias}
            disabled={savingAlias}
            className="min-h-11 rounded-xl bg-[#60A5FA] px-4 text-sm font-semibold text-[#0B0F14] disabled:opacity-50"
          >
            {savingAlias ? "Guardando..." : "Guardar"}
          </button>
        </div>
        <p className="mt-2 text-xs text-white/40">
          Sepáralos con comas. Ayudan a reconocer tu cuenta al importar archivos de bancos o billeteras.
        </p>
      </div>
    </article>
  );
}
