/**
 * send-rating-notification
 * ---------------------------------------------------------------------------
 * Trigger: Supabase **Database Webhook** on `ratings` **INSERT** (and optionally
 * when `rater_submitted` flips if you add a second webhook). See docs/SMS_AND_WEBHOOKS.md.
 *
 * DONE: Twilio SMS + optional in-app notification row (service role).
 * Set header `x-webhook-secret` = WEBHOOK_SECRET if you lock down the endpoint.
 *
 * SMS-only mode: set SEND_RATING_INAPP=false (default) to avoid duplicating DB
 * trigger notifications — Twilio copy is the growth hook.
 * ---------------------------------------------------------------------------
 */

import { getServiceClient } from "../_shared/supabase-admin.ts";
import { digitsOnly, phonesMatch, toE164 } from "../_shared/phone.ts";
import { sendTwilioSms } from "../_shared/twilio.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

function appBase(): string {
  const u = Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "https://example.com";
  return u.replace(/\/$/, "");
}

function assertSecret(req: Request): void {
  const want = Deno.env.get("WEBHOOK_SECRET");
  if (!want) return;
  const got = req.headers.get("x-webhook-secret");
  if (got !== want) {
    throw new Error("Invalid x-webhook-secret");
  }
}

type WebhookBody = {
  type?: string;
  table?: string;
  record?: Record<string, unknown>;
  old_record?: Record<string, unknown> | null;
};

function extractRatingRecord(body: WebhookBody): Record<string, unknown> | null {
  if (body.record && typeof body.record === "object") return body.record;
  return null;
}

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

  try {
    assertSecret(req);
    const body = (await req.json()) as WebhookBody;
    const rec = extractRatingRecord(body);
    if (!rec?.rated_id || !rec?.rater_id) {
      return new Response(JSON.stringify({ ok: false, error: "Missing rating" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ratedId = String(rec.rated_id);
    const raterId = String(rec.rater_id);
    const supabase = getServiceClient();

    const { data: rated, error: e1 } = await supabase
      .from("profiles")
      .select("id, username, phone_number, full_name")
      .eq("id", ratedId)
      .maybeSingle();

    if (e1 || !rated) {
      return new Response(JSON.stringify({ ok: false, error: "Rated profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /** Primary: profile phone. Fallback: contact row synced for this profile. */
    let smsTo: string | null = rated.phone_number
      ? toE164(rated.phone_number) ?? rated.phone_number
      : null;

    if (!smsTo) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("contact_phone")
        .eq("matched_profile_id", ratedId)
        .not("contact_phone", "is", null)
        .limit(1)
        .maybeSingle();
      if (contact?.contact_phone) {
        smsTo = toE164(contact.contact_phone) ?? contact.contact_phone;
      }
    }

    const base = appBase();
    const openAppLink = `${base}/rate/${encodeURIComponent(raterId)}`;
    const signupLink = `${base}/signup?phone=${encodeURIComponent(digitsOnly(smsTo ?? ""))}`;

    const onPlatformCopy =
      `Someone just left you a Receipt. Not telling you who in a text — that would ruin the game. Open the app, see the name, fire back yours: ${openAppLink}`;

    const inviteCopy =
      `Someone who actually knows you left you a Receipt on The Receipt. It's sitting there unread. One link, your number already filled in — you were always going to look: ${signupLink}`;

    const hasProfilePhone = !!rated.phone_number?.trim();
    const sendInApp =
      hasProfilePhone && Deno.env.get("SEND_RATING_INAPP") === "true";
    if (sendInApp) {
      await supabase.from("notifications").insert({
        user_id: ratedId,
        type: "new_rating",
        content:
          "A new Receipt is waiting — open it while the suspense is still fun.",
        metadata: { rating_id: rec.id, rater_id: raterId, channel: "edge" },
      });
    }

    if (!smsTo) {
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: true,
          reason: "No phone on profile or matched contacts",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const usedProfilePhone =
      !!rated.phone_number && phonesMatch(rated.phone_number, smsTo);
    const bodyText = usedProfilePhone ? onPlatformCopy : inviteCopy;

    const sms = await sendTwilioSms(smsTo, bodyText);
    return new Response(
      JSON.stringify({
        ok: sms.ok,
        twilio: sms,
        used_profile_phone: usedProfilePhone,
      }),
      {
        status: sms.ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: msg === "Invalid x-webhook-secret" ? 401 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
