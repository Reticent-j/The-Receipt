import { Suspense } from "react";

import { ListingCard } from "@/components/listings/ListingCard";
import { FeedFilterBar } from "@/components/listings/feed-filter-bar";
import { FloatingNewListingButton } from "@/components/listings/floating-new-listing";
import { sortListingsForFeed } from "@/lib/feed-sort";
import { createClient } from "@/lib/supabase/server";
import { parseFeedCategory } from "@/lib/listing-utils";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

type ListingRow = Database["public"]["Tables"]["listings"]["Row"];
type PosterRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  | "id"
  | "username"
  | "full_name"
  | "avatar_url"
  | "overall_score"
  | "total_ratings"
  | "subscription_status"
>;

interface FeedPageProps {
  searchParams: { category?: string };
}

export default async function FeedPage({
  searchParams,
}: FeedPageProps): Promise<React.JSX.Element> {
  const category = parseFeedCategory(searchParams.category);
  const supabase = createClient();

  let query = supabase
    .from("listings")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (category !== "all") {
    query = query.eq("category", category);
  }

  const { data: listings, error } = await query;

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-destructive">
        {error.message}
      </div>
    );
  }

  const rows = sortListingsForFeed((listings ?? []) as ListingRow[]);
  const ids = Array.from(new Set(rows.map((r) => r.user_id)));

  const { data: posters } =
    ids.length > 0
      ? await supabase
          .from("profiles")
          .select(
            "id, username, full_name, avatar_url, overall_score, total_ratings, subscription_status"
          )
          .in("id", ids)
      : { data: [] as PosterRow[] };

  const posterById = new Map(
    (posters ?? []).map((p) => [p.id, p as PosterRow])
  );

  return (
    <>
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-40">
        <div className="absolute left-1/4 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
            Find people with a{" "}
            <span className="text-primary">Receipt you can trust</span>
          </h1>
          <p className="max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            Every card shows a live Receipt score — the whole point of the
            marketplace. Browse listings from people who&apos;ve put their
            reputation on the line.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="h-12 w-full animate-pulse rounded-full bg-muted" />
          }
        >
          <FeedFilterBar />
        </Suspense>

        {rows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/80 bg-muted/10 px-6 py-20 text-center">
            <p className="text-lg font-semibold text-foreground">
              No listings in this filter yet
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Be the first — tap the + button to post.
            </p>
          </div>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((listing) => {
              const poster = posterById.get(listing.user_id);
              if (!poster) return null;
              return (
                <li key={listing.id} className="min-h-0">
                  <ListingCard listing={listing} poster={poster} />
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <FloatingNewListingButton />
    </>
  );
}
