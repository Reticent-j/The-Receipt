/**
 * contact-matching
 * ---------------------------------------------------------------------------
 * Auth: end-user JWT (Authorization: Bearer <access_token>).
 * Body: { contacts: { phone: string; name?: string }[] }
 *
 * Replaces prior rows for this user + these phone values, then inserts fresh
 * rows with matched_profile_id when digits match profiles.phone_number.
 * ---------------------------------------------------------------------------
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { digitsOnly, phonesMatch, toE164 } from "../_shared/phone.ts";
import { getServiceClient } from "../_shared/supabase-admin.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ContactInput = { phone: string; name?: string };

type ProfileLite = {
  id: string;
  phone_number: string | null;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  overall_score: number;
  total_ratings: number;
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as { contacts?: ContactInput[] };
    const raw = Array.isArray(body.contacts) ? body.contacts : [];
    const seen = new Set<string>();
    const normalized: ContactInput[] = [];
    for (const c of raw) {
      const d = digitsOnly(c.phone);
      if (!d || seen.has(d)) continue;
      seen.add(d);
      normalized.push({
        phone: c.phone.trim(),
        name: c.name?.trim() || undefined,
      });
    }

    const service = getServiceClient();
    const { data: profiles } = await service
      .from("profiles")
      .select(
        "id, phone_number, username, full_name, avatar_url, overall_score, total_ratings"
      )
      .not("phone_number", "is", null);

    const list = (profiles ?? []) as ProfileLite[];

    const base = (Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "").replace(/\/$/, "");

    type RowPlan = {
      contact_phone: string;
      contact_name: string | null;
      matched_profile_id: string | null;
      profile?: ProfileLite;
    };

    const plans: RowPlan[] = [];

    for (const c of normalized) {
      const e164 = toE164(c.phone);
      const storedPhone = e164 ?? c.phone;
      const profile = list.find((p) =>
        phonesMatch(p.phone_number, e164 ?? c.phone)
      );
      plans.push({
        contact_phone: storedPhone,
        contact_name: c.name ?? null,
        matched_profile_id: profile?.id ?? null,
        profile,
      });
    }

    const matched: Array<{
      profile: ProfileLite;
      normalizedPhone: string;
      prompt: string;
    }> = [];
    const unmatched: Array<{ phone: string; name?: string; inviteHref: string }> =
      [];

    for (const p of plans) {
      if (p.profile) {
        matched.push({
          profile: p.profile,
          normalizedPhone: digitsOnly(p.contact_phone),
          prompt: `Leave them a Receipt — @${p.profile.username} is on The Receipt.`,
        });
      } else {
        unmatched.push({
          phone: p.contact_phone,
          name: p.contact_name ?? undefined,
          inviteHref: `${base}/signup?phone=${encodeURIComponent(digitsOnly(p.contact_phone))}`,
        });
      }
    }

    const phoneVariants = new Set<string>();
    for (const p of plans) {
      phoneVariants.add(p.contact_phone);
      phoneVariants.add(digitsOnly(p.contact_phone));
    }

    const variantList = Array.from(phoneVariants).filter(Boolean);
    if (variantList.length > 0) {
      await service
        .from("contacts")
        .delete()
        .eq("user_id", user.id)
        .in("contact_phone", variantList);
    }

    if (plans.length > 0) {
      const { error: insErr } = await service.from("contacts").insert(
        plans.map((p) => ({
          user_id: user.id,
          contact_phone: p.contact_phone,
          contact_name: p.contact_name,
          matched_profile_id: p.matched_profile_id,
        }))
      );
      if (insErr) {
        return new Response(JSON.stringify({ ok: false, error: insErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        matched,
        unmatched,
        message:
          matched.length > 0
            ? "Matched people are on The Receipt — open their profile to start a rating."
            : "No phone matches in the directory yet — invite friends with the links below.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
