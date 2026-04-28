import Link from "next/link";
import { redirect } from "next/navigation";

import { SubscribeButton } from "@/app/premium/subscribe-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import {
  BOOST_ONETIME_DISPLAY,
  PREMIUM_MONTHLY_DISPLAY,
} from "@/lib/subscription";
import { isPremiumSubscription } from "@/lib/subscription";

export const dynamic = "force-dynamic";

const features = [
  {
    name: "Active listings",
    free: "Up to 2",
    premium: "Unlimited",
  },
  {
    name: "Receipt score on profile",
    free: "Basic headline score",
    premium: "Full dimension breakdown + monthly trend chart",
  },
  {
    name: "Profile viewers",
    free: "—",
    premium: "See who viewed your profile",
  },
  {
    name: "Pending ratings",
    free: "Anonymous until unlock",
    premium: "See who started a receipt before you submit (your side only)",
  },
  {
    name: "Verified badge",
    free: "—",
    premium: "Checkmark on profile & listings",
  },
  {
    name: "Listing boost",
    free: `${BOOST_ONETIME_DISPLAY} each`,
    premium: "One free 48h boost / month + paid boosts",
  },
] as const;

export default async function PremiumPage(props: {
  searchParams: { session_id?: string };
}): Promise<React.JSX.Element> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/premium");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, subscription_current_period_end")
    .eq("id", user.id)
    .maybeSingle();

  const active = isPremiumSubscription(profile?.subscription_status);
  const periodEnd = profile?.subscription_current_period_end
    ? new Date(profile.subscription_current_period_end)
    : null;
  const periodLabel =
    periodEnd && !Number.isNaN(periodEnd.getTime())
      ? new Intl.DateTimeFormat("en", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }).format(periodEnd)
      : null;

  const justReturned = Boolean(props.searchParams.session_id);

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6 sm:py-14">
      <div className="space-y-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          The Receipt
        </p>
        <h1 className="text-balance text-4xl font-black tracking-tight sm:text-5xl">
          Turn your reputation into{" "}
          <span className="text-primary">leverage</span>
        </h1>
        <p className="mx-auto max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
          Free stays honest. Premium makes you dangerous — unlimited listings,
          visibility into who&apos;s watching, and the unlocks that make mutual
          ratings feel unfair (in your favor).
        </p>
      </div>

      {justReturned ? (
        <div className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-center text-sm text-foreground">
          Checkout complete — Stripe webhooks sync your plan in a few seconds.
          Refresh if your status doesn&apos;t flip to active immediately.
        </div>
      ) : null}

      {active ? (
        <Card className="border-primary/40 bg-gradient-to-br from-primary/15 to-transparent">
          <CardHeader>
            <CardTitle className="text-2xl">You&apos;re on Receipt Premium</CardTitle>
            <CardDescription>
              Status:{" "}
              <span className="font-medium text-foreground">
                {profile?.subscription_status}
              </span>
              {periodLabel ? (
                <>
                  {" "}
                  · Renews or rolls after{" "}
                  <span className="font-medium text-foreground">{periodLabel}</span>
                </>
              ) : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="border-primary/50">
              <Link href="/feed">Browse feed</Link>
            </Button>
            <Button asChild variant="outline" className="border-primary/50">
              <Link href="/listings/new">Post another listing</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border/80 bg-card/50 p-8 text-center">
          <p className="max-w-md text-sm text-muted-foreground">
            Unlock everything below for{" "}
            <span className="font-semibold text-foreground">
              {PREMIUM_MONTHLY_DISPLAY}
            </span>
            . Cancel anytime in Stripe — we sync status automatically.
          </p>
          <SubscribeButton />
        </div>
      )}

      <Card className="overflow-hidden border-border/80">
        <CardHeader>
          <CardTitle className="text-2xl">Free vs Receipt Premium</CardTitle>
          <CardDescription>
            Same double-blind ratings for everyone — Premium is distribution and
            intelligence on top.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40">
                <th className="px-4 py-3 font-semibold">Feature</th>
                <th className="px-4 py-3 font-semibold">Free</th>
                <th className="px-4 py-3 font-semibold text-primary">
                  Receipt Premium
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((f) => (
                <tr
                  key={f.name}
                  className="border-b border-border/60 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {f.name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{f.free}</td>
                  <td className="px-4 py-3 text-foreground">{f.premium}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-dashed border-border/80 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
        <p>
          One-time listing boost — {BOOST_ONETIME_DISPLAY} for 48h top placement
          + bold card — available from your listing page (owner only).
        </p>
      </div>
    </div>
  );
}
