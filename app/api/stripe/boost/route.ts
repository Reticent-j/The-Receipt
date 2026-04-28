import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { appOrigin, getBoostPriceId, getStripe } from "@/lib/stripe-server";
import {
  currentMonthKey,
  isBoostActive,
  isPremiumSubscription,
} from "@/lib/subscription";

const bodySchema = z.object({
  listingId: z.string().uuid(),
  /** Premium subscribers: one free 48h boost per calendar month (UTC). */
  usePremiumAllocation: z.boolean().optional(),
});

export async function POST(req: Request): Promise<Response> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
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

    const { listingId, usePremiumAllocation } = parsed.data;

    const { data: listing, error: lErr } = await supabase
      .from("listings")
      .select("id, user_id, boost_expires_at, status")
      .eq("id", listingId)
      .maybeSingle();

    if (lErr || !listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    if (listing.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (listing.status !== "active") {
      return NextResponse.json(
        { error: "Only active listings can be boosted" },
        { status: 400 }
      );
    }

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select(
        "stripe_customer_id, subscription_status, premium_boost_month_used"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (pErr || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 400 });
    }

    const premium = isPremiumSubscription(profile.subscription_status);
    const month = currentMonthKey();

    if (usePremiumAllocation) {
      if (!premium) {
        return NextResponse.json(
          { error: "Premium subscription required for free monthly boost" },
          { status: 403 }
        );
      }

      if (profile.premium_boost_month_used === month) {
        return NextResponse.json(
          {
            error:
              "You already used your free boost this month — pay for another or wait until next month.",
          },
          { status: 400 }
        );
      }

      const expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      const { error: upErr } = await supabase
        .from("listings")
        .update({ boost_expires_at: expires })
        .eq("id", listingId)
        .eq("user_id", user.id);

      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }

      const { error: profErr } = await supabase
        .from("profiles")
        .update({ premium_boost_month_used: month })
        .eq("id", user.id);

      if (profErr) {
        return NextResponse.json({ error: profErr.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, boost_expires_at: expires });
    }

    if (isBoostActive(listing.boost_expires_at)) {
      return NextResponse.json(
        {
          error: "This listing is already boosted — wait for it to expire or pick another.",
        },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const origin = appOrigin();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: user.id,
      ...(profile.stripe_customer_id
        ? { customer: profile.stripe_customer_id }
        : user.email
          ? { customer_email: user.email }
          : {}),
      line_items: [{ price: getBoostPriceId(), quantity: 1 }],
      success_url: `${origin}/listings/${listingId}?boosted=1`,
      cancel_url: `${origin}/listings/${listingId}`,
      metadata: {
        type: "listing_boost",
        listing_id: listingId,
        supabase_user_id: user.id,
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "No checkout URL returned" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Boost checkout failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
