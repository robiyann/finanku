import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role Supabase client — bypasses RLS. SERVER-ONLY.
// Used by the Telegram webhook to read/write on behalf of a user who has
// been mapped via telegram_links. Never import this into client code.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
