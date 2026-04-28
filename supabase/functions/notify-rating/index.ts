/**
 * Edge Function: notify-rating
 * ---------------------------------------------------------------------------
 * DEPLOY: `supabase functions deploy notify-rating --no-verify-jwt` (or with
 * JWT verification enabled in dashboard).
 *
 * DONE: Stub endpoint that accepts POST JSON and returns 200 — safe to call
 * from Next.js after a rating update (see `app/actions/ratings.ts`).
 *
 * NOT DONE (extend here): Verify `Authorization: Bearer <user JWT>`, call
 * Auth admin API, insert extra notification rows, or send email/SMS via
 * Resend/Twilio. DB triggers already insert core `notifications` rows for
 * partial + unlock flows — avoid duplicating inserts unless you disable those
 * triggers.
 * ---------------------------------------------------------------------------
 */

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

  try {
    const _body = (await req.json()) as Record<string, unknown>;
    // Placeholder: hook email/push/analytics here.
    return new Response(JSON.stringify({ ok: true, received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
