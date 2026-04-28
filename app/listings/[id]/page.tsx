import Link from "next/link";
import { notFound } from "next/navigation";

import { BoostButton } from "@/components/listings/BoostButton";
import { ListingCard } from "@/components/listings/ListingCard";
import { ListingImageGallery } from "@/components/listings/listing-image-gallery";
import { ListingSellerSidebar } from "@/components/listings/listing-seller-sidebar";
import { Badge } from "@/components/ui/badge";
import { LISTING_CATEGORY_LABEL, formatPriceUsd } from "@/lib/profile-display";
import { sortListingsForFeed } from "@/lib/feed-sort";
import { createClient } from "@/lib/supabase/server";
import { aggregateDimensionAverages } from "@/lib/profile-scores";
import type { Database } from "@/types/database";

type ListingRow = Database["public"]["Tables"]["listings"]["Row"];

interface ListingPageProps {
  params: { id: string };
}

export async function generateMetadata({
  params,
}: ListingPageProps): Promise<{ title: string; description: string }> {
  const supabase = createClient();
  const { data } = await supabase
    .from("listings")
    .select("title, description")
    .eq("id", params.id)
    .maybeSingle();
  if (!data) {
    return { title: "Listing · The Receipt", description: "" };
  }
  return {
    title: `${data.title} · The Receipt`,
    description: data.description?.slice(0, 160) ?? "",
  };
}

export default async function ListingDetailPage({
  params,
}: ListingPageProps): Promise<React.JSX.Element> {
  const supabase = createClient();
  const { data: listing, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !listing) {
    notFound();
  }

  const row = listing as ListingRow;

  const { data: seller } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", row.user_id)
    .maybeSingle();

  if (!seller) {
    notFound();
  }

  const { data: sellerRatings } = await supabase
    .from("ratings")
    .select("scores")
    .eq("rated_id", seller.id)
    .eq("both_submitted", true);

  const dimensionAverages = aggregateDimensionAverages(sellerRatings ?? []);

  const { data: related } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "active")
    .eq("category", row.category)
    .neq("id", row.id)
    .order("created_at", { ascending: false })
    .limit(12);

  const relatedRows = sortListingsForFeed((related ?? []) as ListingRow[]).slice(
    0,
    6
  );
  const relIds = Array.from(new Set(relatedRows.map((r) => r.user_id)));
  const { data: relPosters } =
    relIds.length > 0
      ? await supabase
          .from("profiles")
          .select(
            "id, username, full_name, avatar_url, overall_score, total_ratings, subscription_status"
          )
          .in("id", relIds)
      : { data: [] };
  const relPosterMap = new Map((relPosters ?? []).map((p) => [p.id, p]));

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const isOwner = authUser?.id === row.user_id;

  let viewerProfile: {
    subscription_status: string;
    premium_boost_month_used: string | null;
  } | null = null;
  if (isOwner && authUser) {
    const { data } = await supabase
      .from("profiles")
      .select("subscription_status, premium_boost_month_used")
      .eq("id", authUser.id)
      .maybeSingle();
    viewerProfile = data;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
        <Link href="/feed" className="hover:text-primary">
          Marketplace
        </Link>
        <span>/</span>
        <span className="text-foreground">{LISTING_CATEGORY_LABEL[row.category]}</span>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_340px] lg:items-start">
        <article className="min-w-0 space-y-8">
          <header className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-primary/40 bg-primary/15 text-primary">
                {LISTING_CATEGORY_LABEL[row.category]}
              </Badge>
              {row.status !== "active" ? (
                <Badge variant="destructive">Not active</Badge>
              ) : null}
            </div>
            <h1 className="text-balance text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
              {row.title}
            </h1>
            <div className="flex flex-wrap items-baseline gap-4 text-lg">
              <span className="text-2xl font-bold text-primary">
                {formatPriceUsd(row.price)}
              </span>
              {row.location?.trim() ? (
                <span className="text-muted-foreground">{row.location}</span>
              ) : null}
            </div>
          </header>

          <ListingImageGallery images={row.images} title={row.title} />

          {row.description?.trim() ? (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">Description</h2>
              <p className="whitespace-pre-wrap text-pretty leading-relaxed text-muted-foreground">
                {row.description}
              </p>
            </section>
          ) : null}
        </article>

        <aside className="lg:sticky lg:top-24 space-y-4">
          {isOwner && authUser ? (
            <BoostButton
              listingId={row.id}
              boostExpiresAt={row.boost_expires_at}
              viewerSubscriptionStatus={
                viewerProfile?.subscription_status ?? "free"
              }
              premiumBoostMonthUsed={
                viewerProfile?.premium_boost_month_used ?? null
              }
            />
          ) : null}
          <ListingSellerSidebar
            seller={seller}
            dimensionAverages={dimensionAverages}
            listingTitle={row.title}
          />
        </aside>
      </div>

      {relatedRows.length > 0 ? (
        <section className="space-y-4 border-t border-border/60 pt-12">
          <h2 className="text-2xl font-bold tracking-tight">Related listings</h2>
          <p className="text-sm text-muted-foreground">
            More in {LISTING_CATEGORY_LABEL[row.category]}.
          </p>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedRows.map((r) => {
              const p = relPosterMap.get(r.user_id);
              if (!p) return null;
              return (
                <li key={r.id}>
                  <ListingCard listing={r} poster={p} variant="compact" />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
