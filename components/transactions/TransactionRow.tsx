"use client";

import { useState } from "react";
import { deleteTransaction } from "@/app/actions/transactions";

type TransactionRowProps = {
  transaction: {
    id: string;
    amount: number;
    type: string;
    description: string | null;
    occurred_at: string;
    account_name: string;
    category_name: string | null;
    currency: string;
  };
};

export default function TransactionRow({ transaction }: TransactionRowProps) {
  const [loading, setLoading] = useState(false);
  const isIncome = transaction.type === "ingreso";

  async function handleDelete() {
    const confirmed = window.confirm("¿Eliminar esta transacción?");
    if (!confirmed) return;

    setLoading(true);
    try {
      await deleteTransaction(transaction.id);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="min-w-0">
        <p className="truncate font-medium">
          {transaction.description || transaction.category_name || "Sin descripción"}
        </p>
        <p className="mt-1 truncate text-sm text-white/50">
          {transaction.account_name}
          {transaction.category_name ? ` · ${transaction.category_name}` : ""}
          {" · "}
          {new Date(transaction.occurred_at).toLocaleString("es-PE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      <div className="flex flex-shrink-0 items-center gap-3">
        <p
          className={`font-mono font-semibold ${
            isIncome ? "text-[#4ADE80]" : "text-[#F87171]"
          }`}
        >
          {isIncome ? "+" : "-"}
          {transaction.currency} {transaction.amount.toFixed(2)}
        </p>

        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="min-h-11 rounded-xl border border-white/10 px-3 py-2 text-sm text-white/60 hover:border-[#F87171] hover:text-[#F87171] disabled:opacity-50"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}