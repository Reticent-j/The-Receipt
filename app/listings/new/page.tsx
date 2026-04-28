import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateListingForm } from "@/components/listings/create-listing-form";
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
  FREE_TIER_ACTIVE_LISTING_LIMIT,
  isPremiumSubscription,
} from "@/lib/subscription";

export default async function NewListingPage(): Promise<React.JSX.Element> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/listings/new");
  }

  const { data: poster } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!poster) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Card className="border-border/80 bg-card/60">
          <CardHeader>
            <CardTitle>Create a profile first</CardTitle>
            <CardDescription>
              Listings are tied to your public profile. Finish onboarding (a{" "}
              <code className="text-xs">profiles</code> row for your user) before
              posting.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/">Back home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const premium = isPremiumSubscription(
    poster.subscription_status ?? "free"
  );

  const { count: activeCount } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "active");

  const n = activeCount ?? 0;
  const atListingLimit =
    !premium && n >= FREE_TIER_ACTIVE_LISTING_LIMIT;

  return (
    <CreateListingForm
      poster={poster}
      atListingLimit={atListingLimit}
      activeListingCount={n}
    />
  );
}
