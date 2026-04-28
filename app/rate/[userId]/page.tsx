import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { RateWizard } from "@/components/ratings/rate-wizard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { isPremiumSubscription } from "@/lib/subscription";

interface RatePageProps {
  params: { userId: string };
}

export default async function RatePage({
  params,
}: RatePageProps): Promise<React.JSX.Element> {
  const userId = params.userId;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/rate/${encodeURIComponent(userId)}`);
  }

  const { data: counterparty, error: cpErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (cpErr || !counterparty) {
    notFound();
  }

  if (counterparty.id === user.id) {
    redirect("/ratings/pending");
  }

  const { data: rows, error: rErr } = await supabase
    .from("ratings")
    .select("*")
    .or(
      `and(rater_id.eq.${user.id},rated_id.eq.${userId}),and(rater_id.eq.${userId},rated_id.eq.${user.id})`
    )
    .order("created_at", { ascending: false })
    .limit(1);

  if (rErr) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-destructive">
        {rErr.message}
      </div>
    );
  }

  const rating = rows?.[0];

  let initiatorRevealUsername: string | null = null;
  if (rating && rating.rated_id === user.id) {
    const { data: mep } = await supabase
      .from("profiles")
      .select("subscription_status")
      .eq("id", user.id)
      .maybeSingle();
    if (isPremiumSubscription(mep?.subscription_status)) {
      const { data: raterp } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", rating.rater_id)
        .maybeSingle();
      initiatorRevealUsername = raterp?.username ?? null;
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href={`/profile/${counterparty.username}`}
        className="inline-block text-sm font-medium text-muted-foreground hover:text-primary"
      >
        ← @{counterparty.username}
      </Link>

      <h1 className="mt-6 text-center text-3xl font-black tracking-tight text-foreground sm:text-4xl">
        Mutual <span className="text-primary">receipt</span>
      </h1>
      <p className="mx-auto mt-2 max-w-md text-center text-sm text-muted-foreground">
        Double-blind rating with @{counterparty.username}. Your submission stays
        locked until both of you finish.
      </p>

      <div className="mt-10">
        {rating ? (
          <RateWizard
            viewerId={user.id}
            counterparty={counterparty}
            rating={rating}
            initiatorRevealUsername={initiatorRevealUsername}
          />
        ) : (
          <Card className="border-border/80 bg-card/60">
            <CardHeader>
              <CardTitle>No open rating yet</CardTitle>
              <CardDescription>
                Start from their profile with &quot;Rate this person&quot; so we
                can create the mutual row.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href={`/profile/${counterparty.username}`}>
                  Go to profile
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
