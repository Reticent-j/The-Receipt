/**
 * send-unlock-notification
 * ---------------------------------------------------------------------------
 * Trigger: Database Webhook on `ratings` **UPDATE** when `both_submitted`
 * becomes true (filter in webhook config if available).
 * ---------------------------------------------------------------------------
 */

import { getServiceClient } from "../_shared/supabase-admin.ts";
import { toE164 } from "../_shared/phone.ts";
import { sendTwilioSms } from "../_shared/twilio.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

function appBase(): string {
  return (Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "https://example.com").replace(
    /\/$/,
    ""
  );
}

function assertSecret(req: Request): void {
  const want = Deno.env.get("WEBHOOK_SECRET");
  if (!want) return;
  if (req.headers.get("x-webhook-secret") !== want) {
    throw new Error("Invalid x-webhook-secret");
  }
}

type WebhookBody = {
  record?: Record<string, unknown>;
  old_record?: Record<string, unknown> | null;
};

function getOldRecord(body: WebhookBody): Record<string, unknown> | null {
  if (body.old_record && typeof body.old_record === "object") {
    return body.old_record;
  }
  const alt = (body as { oldRecord?: Record<string, unknown> }).oldRecord;
  return alt && typeof alt === "object" ? alt : null;
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
    const rec = body.record;
    const old_record = getOldRecord(body);
    if (!rec?.both_submitted || !rec.rater_id || !rec.rated_id) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const wasUnlocked =
      old_record &&
      (old_record as { both_submitted?: boolean }).both_submitted === true;
    if (wasUnlocked) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "already unlocked" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getServiceClient();
    const ids = [String(rec.rater_id), String(rec.rated_id)];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, phone_number, username")
      .in("id", ids);

    const link = `${appBase()}/ratings/pending`;
    const copy = `Your Receipt just unlocked — both sides are live. Whatever they wrote about you is one tap away. Pretend you won't open it, then open it: ${link}`;

    const results: Array<{ id: string; ok: boolean; error?: string }> = [];

    for (const p of profiles ?? []) {
      if (!p.phone_number) {
        results.push({ id: p.id, ok: false, error: "no phone" });
        continue;
      }
      const to = toE164(p.phone_number) ?? p.phone_number;
      const sms = await sendTwilioSms(to, copy);
      results.push({ id: p.id, ok: sms.ok, error: sms.error });
    }

    const allOk = results.every((r) => r.ok);
    return new Response(JSON.stringify({ ok: allOk, results }), {
      status: allOk ? 200 : 207,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: msg === "Invalid x-webhook-secret" ? 401 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
