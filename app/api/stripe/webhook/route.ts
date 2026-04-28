import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { createServiceClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe-server";

export const dynamic = "force-dynamic";

async function applyListingBoost(listingId: string): Promise<void> {
  const admin = createServiceClient();
  const expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const { error } = await admin
    .from("listings")
    .update({ boost_expires_at: expires })
    .eq("id", listingId);
  if (error) {
    console.error("[stripe webhook] boost update failed", error);
  }
}

async function syncProfileFromSubscription(
  sub: Stripe.Subscription
): Promise<void> {
  const admin = createServiceClient();
  const customerId =
    typeof sub.customer === "string"
      ? sub.customer
      : sub.customer && "id" in sub.customer
        ? sub.customer.id
        : null;

  let userId = sub.metadata?.supabase_user_id as string | undefined;
  if (!userId) {
    const { data: row } = await admin
      .from("profiles")
      .select("id")
      .eq("stripe_subscription_id", sub.id)
      .maybeSingle();
    userId = row?.id;
  }

  if (!userId) {
    console.warn("[stripe webhook] subscription without user mapping", sub.id);
    return;
  }

  const periodEnd =
    sub.current_period_end != null
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null;

  const { error } = await admin
    .from("profiles")
    .update({
      stripe_subscription_id: sub.id,
      stripe_customer_id: customerId,
      subscription_status: sub.status,
      subscription_current_period_end: periodEnd,
    })
    .eq("id", userId);

  if (error) {
    console.error("[stripe webhook] profile sync failed", error);
  }
}

async function clearSubscription(sub: Stripe.Subscription): Promise<void> {
  const admin = createServiceClient();
  const { error } = await admin
    .from("profiles")
    .update({
      stripe_subscription_id: null,
      subscription_status: "canceled",
      subscription_current_period_end: null,
    })
    .eq("stripe_subscription_id", sub.id);

  if (error) {
    console.error("[stripe webhook] clear subscription failed", error);
  }
}

async function markPastDueForCustomer(customerId: string): Promise<void> {
  const admin = createServiceClient();
  const { error } = await admin
    .from("profiles")
    .update({ subscription_status: "past_due" })
    .eq("stripe_customer_id", customerId)
    .neq("subscription_status", "free");

  if (error) {
    console.error("[stripe webhook] past_due update failed", error);
  }
}

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET not configured" },
      { status: 500 }
    );
  }

  const body = await req.text();
  const sig = headers().get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "invalid payload";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === "payment" && session.payment_status === "paid") {
          if (session.metadata?.type === "listing_boost" && session.metadata.listing_id) {
            await applyListingBoost(session.metadata.listing_id);
          }
          break;
        }

        if (session.mode === "subscription" && session.subscription) {
          const paymentOk =
            session.payment_status === "paid" ||
            session.payment_status === "no_payment_required";
          if (!paymentOk) {
            break;
          }

          const stripe = getStripe();
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          const userId =
            session.client_reference_id ||
            (session.metadata?.supabase_user_id as string | undefined);
          if (userId) {
            const admin = createServiceClient();
            const customerId =
              typeof session.customer === "string"
                ? session.customer
                : session.customer && "id" in session.customer
                  ? session.customer.id
                  : null;
            const periodEnd =
              sub.current_period_end != null
                ? new Date(sub.current_period_end * 1000).toISOString()
                : null;
            const { error } = await admin
              .from("profiles")
              .update({
                stripe_customer_id: customerId,
                stripe_subscription_id: sub.id,
                subscription_status: sub.status,
                subscription_current_period_end: periodEnd,
              })
              .eq("id", userId);
            if (error) {
              console.error(
                "[stripe webhook] subscription checkout profile update",
                error
              );
            }
          }
        }
        break;
      }

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (
          session.mode === "payment" &&
          session.metadata?.type === "listing_boost" &&
          session.metadata.listing_id
        ) {
          await applyListingBoost(session.metadata.listing_id);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        await syncProfileFromSubscription(sub);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await clearSubscription(sub);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer && "id" in invoice.customer
              ? invoice.customer.id
              : null;
        if (customerId) {
          await markPastDueForCustomer(customerId);
        }
        break;
      }

      default:
        break;
    }
  } catch (e) {
    console.error("[stripe webhook] handler error", e);
    return NextResponse.json({ received: true, error: "handler" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
