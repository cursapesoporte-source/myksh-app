import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let serviceClient: ReturnType<typeof createSupabaseClient> | null = null;

export function createServiceRoleClient() {
  if (serviceClient) return serviceClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Faltan las variables de Supabase para el cliente de servicio.");
  }

  serviceClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serviceClient;
}
