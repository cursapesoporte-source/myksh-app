import { createClient } from "@/lib/supabase/server";
import { ImportUploadPanel } from "@/components/imports/ImportUploadPanel";

export default async function ImportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p className="p-6">Debes iniciar sesión para importar archivos.</p>;
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <ImportUploadPanel />
    </main>
	
	
  );
}
