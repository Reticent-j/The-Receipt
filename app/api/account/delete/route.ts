import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * Deletes the authenticated user via Auth Admin API.
 * Requires `SUPABASE_SERVICE_ROLE_KEY` on the server (never expose to the client).
 */
export async function POST(req: Request): Promise<Response> {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { confirmUsername?: string };
  try {
    body = (await req.json()) as { confirmUsername?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.confirmUsername?.trim()) {
    return NextResponse.json(
      { error: "confirmUsername is required" },
      { status: 400 }
    );
  }

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  if (pErr || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 400 });
  }

  if (profile.username !== body.confirmUsername.trim()) {
    return NextResponse.json(
      { error: "Username does not match — type your @username exactly." },
      { status: 400 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      {
        error:
          "Account deletion is not configured. Add SUPABASE_SERVICE_ROLE_KEY to the server environment.",
      },
      { status: 501 }
    );
  }

  const admin = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
