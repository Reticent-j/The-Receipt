import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const contactSchema = z.object({
  phone: z.string().min(3, "phone required"),
  name: z.string().optional(),
});

const bodySchema = z.object({
  contacts: z.array(contactSchema).max(5000),
});

const INVITE_PROMPT =
  "Not on The Receipt yet — text them this link so they can claim their Receipt and see what was said.";

export async function POST(req: Request): Promise<Response> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json(
      { error: "Server missing Supabase configuration" },
      { status: 500 }
    );
  }

  const fnUrl = `${url.replace(/\/$/, "")}/functions/v1/contact-matching`;
  const upstream = await fetch(fnUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
    },
    body: JSON.stringify({ contacts: parsed.data.contacts }),
  });

  const data = (await upstream.json()) as Record<string, unknown>;

  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status });
  }

  const unmatched = Array.isArray(data.unmatched)
    ? (data.unmatched as Array<{ inviteHref?: string; phone?: string; name?: string }>)
    : [];

  const unmatchedWithPrompt = unmatched.map((u) => ({
    ...u,
    invitePrompt: INVITE_PROMPT,
  }));

  return NextResponse.json(
    {
      ...data,
      unmatched: unmatchedWithPrompt,
      matchedSummary:
        typeof data.message === "string"
          ? data.message
          : "Sync complete — rate matched people, invite the rest.",
    },
    { status: 200 }
  );
}
