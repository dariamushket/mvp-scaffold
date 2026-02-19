import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with the service-role key, bypassing RLS.
 * ONLY use this in Route Handlers and Server Actions — never in Client Components.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
