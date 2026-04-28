import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { appOrigin, getPremiumPriceId, getStripe } from "@/lib/stripe-server";

export async function POST(): Promise<Response> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("id, stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (pErr || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const origin = appOrigin();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: user.id,
      ...(profile.stripe_customer_id
        ? { customer: profile.stripe_customer_id }
        : user.email
          ? { customer_email: user.email }
          : {}),
      line_items: [{ price: getPremiumPriceId(), quantity: 1 }],
      success_url: `${origin}/premium?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/premium`,
      metadata: { supabase_user_id: user.id },
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "No checkout URL returned" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Checkout failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
