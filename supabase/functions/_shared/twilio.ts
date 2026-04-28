import { digitsOnly } from "./phone.ts";

export async function sendTwilioSms(
  toE164: string,
  body: string
): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!sid || !token || !from) {
    return { ok: false, error: "Twilio env vars missing" };
  }

  const to = toE164.startsWith("+") ? toE164 : `+${digitsOnly(toE164)}`;
  const auth = btoa(`${sid}:${token}`);
  const params = new URLSearchParams({
    To: to,
    From: from,
    Body: body,
  });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );

  const json = (await res.json()) as { sid?: string; message?: string };
  if (!res.ok) {
    return { ok: false, error: json.message ?? res.statusText };
  }
  return { ok: true, sid: json.sid };
}
