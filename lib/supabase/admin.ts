import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Service-role client for webhooks and other server-only flows.
 * Never import from client components.
 */
export function createServiceClient(): ReturnType<
  typeof createClient<Database>
> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
