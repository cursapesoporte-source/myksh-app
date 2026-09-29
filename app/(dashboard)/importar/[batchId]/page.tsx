import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ImportReviewScreen, type ImportCandidateRow } from "@/components/imports/ImportReviewScreen";

export default async function ImportReviewPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: batch } = await supabase
    .from("import_batches")
    .select("id, status, file_name")
    .eq("id", batchId)
    .eq("user_id", user.id)
    .single();

  if (!batch || batch.status !== "reviewing") notFound();

  const { data: candidates, error } = await supabase
    .from("import_candidates")
    .select(
      "id, occurred_at, amount, type, description, counterparty, duplicate_transaction_id, duplicate_confidence, review_action, review_note"
    )
    .eq("batch_id", batchId)
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false });

  if (error || !candidates) {
    return <p className="p-6">No se pudieron cargar los movimientos para revisar.</p>;
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-5">
        <p className="text-sm text-neutral-500">Archivo: {batch.file_name}</p>
        <p className="text-sm text-neutral-500">Lote: {batch.id}</p>
      </div>
      <ImportReviewScreen
        batchId={batchId}
        initialCandidates={candidates as ImportCandidateRow[]}
      />
    </main>
  );
}
