import { redirect } from "next/navigation";

import { PendingRatingCard } from "@/components/ratings/PendingRatingCard";
import { createClient } from "@/lib/supabase/server";
import { isPremiumSubscription } from "@/lib/subscription";
import type { Database } from "@/types/database";

type RatingRow = Database["public"]["Tables"]["ratings"]["Row"];

export default async function PendingRatingsPage(): Promise<React.JSX.Element> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/ratings/pending");
  }

  const { data: rows, error } = await supabase
    .from("ratings")
    .select("*")
    .or(`rater_id.eq.${user.id},rated_id.eq.${user.id}`)
    .eq("both_submitted", false)
    .order("updated_at", { ascending: false });

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-destructive">
        {error.message}
      </div>
    );
  }

  const list = (rows ?? []) as RatingRow[];
  const otherIds = Array.from(
    new Set(
      list.map((r) =>
        r.rater_id === user.id ? r.rated_id : r.rater_id
      )
    )
  );

  const { data: profiles } =
    otherIds.length > 0
      ? await supabase.from("profiles").select("id, username").in("id", otherIds)
      : { data: [] as { id: string; username: string }[] };

  const usernameById = new Map(
    (profiles ?? []).map((p) => [p.id, p.username] as const)
  );

  const { data: meProf } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  const viewerPremium = isPremiumSubscription(meProf?.subscription_status);

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pending receipts</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Mutual ratings that haven&apos;t unlocked yet — finish yours or wait on
          the other person.
        </p>
      </div>

      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/80 bg-muted/10 px-4 py-10 text-center text-sm text-muted-foreground">
          Nothing pending. You&apos;re all caught up.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {list.map((r) => {
            const counterpartyId =
              r.rater_id === user.id ? r.rated_id : r.rater_id;
            const un = usernameById.get(counterpartyId) ?? "unknown";
            let reveal: string | null | undefined;
            if (
              viewerPremium &&
              r.rated_id === user.id &&
              !r.rated_submitted
            ) {
              reveal = usernameById.get(r.rater_id) ?? null;
            }
            return (
              <li key={r.id}>
                <PendingRatingCard
                  rating={r}
                  viewerId={user.id}
                  counterpartyUsername={un}
                  counterpartyId={counterpartyId}
                  revealInitiatorUsername={reveal}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
