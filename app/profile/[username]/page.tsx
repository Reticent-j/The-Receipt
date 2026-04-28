import { notFound } from "next/navigation";

import { ProfileDimensionBars } from "@/components/profile/profile-dimension-bars";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileListingsGrid } from "@/components/profile/profile-listings-grid";
import { ProfileOwnerPending } from "@/components/profile/profile-owner-pending";
import {
  PremiumProfileInsights,
  type ProfileViewEntry,
} from "@/components/profile/premium-profile-insights";
import { ProfileRateCta } from "@/components/profile/profile-rate-cta";
import { ProfileRatingsFeed } from "@/components/profile/profile-ratings-feed";
import { ProfileRelationshipBadges } from "@/components/profile/profile-relationship-badges";
import { sortListingsForFeed } from "@/lib/feed-sort";
import { createClient } from "@/lib/supabase/server";
import { aggregateDimensionAverages } from "@/lib/profile-scores";
import { isPremiumSubscription } from "@/lib/subscription";
import type { Database } from "@/types/database";

type RatingRow = Database["public"]["Tables"]["ratings"]["Row"];
type ListingRow = Database["public"]["Tables"]["listings"]["Row"];

interface ProfilePageProps {
  params: { username: string };
}

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<{ title: string; description: string }> {
  const raw = params.username;
  const username = decodeURIComponent(raw);
  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, username, bio")
    .eq("username", username)
    .maybeSingle();

  if (!profile) {
    return { title: "Profile not found · The Receipt", description: "" };
  }

  const name = profile.full_name?.trim() || profile.username;
  return {
    title: `${name} (@${profile.username}) · The Receipt`,
    description:
      profile.bio?.slice(0, 160) ||
      `View ${name}'s public Receipt score and marketplace listings.`,
  };
}

export default async function ProfilePage({
  params,
}: ProfilePageProps): Promise<React.JSX.Element> {
  const username = decodeURIComponent(params.username);
  const supabase = createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (profileError || !profile) {
    notFound();
  }

  const [{ data: completedRatings }, { data: activeListings }, userRes] =
    await Promise.all([
      supabase
        .from("ratings")
        .select("*")
        .eq("rated_id", profile.id)
        .eq("both_submitted", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("listings")
        .select("*")
        .eq("user_id", profile.id)
        .eq("status", "active")
        .order("created_at", { ascending: false }),
      supabase.auth.getUser(),
    ]);

  const ratings = completedRatings ?? [];
  const listingsSorted = sortListingsForFeed(
    (activeListings ?? []) as ListingRow[]
  );
  const viewerId = userRes.data.user?.id ?? null;
  const isOwnProfile = viewerId === profile.id;

  if (viewerId && !isOwnProfile) {
    const { error: viewErr } = await supabase.rpc("touch_profile_view", {
      p_profile_id: profile.id,
    });
    if (viewErr) {
      // RPC missing until migration applied — non-fatal.
    }
  }

  const ownerPremium = isPremiumSubscription(profile.subscription_status);

  let profileViewEntries: ProfileViewEntry[] = [];
  if (isOwnProfile && ownerPremium) {
    const { data: viewRows } = await supabase
      .from("profile_views")
      .select("viewer_id, created_at")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(80);

    const ids = Array.from(new Set((viewRows ?? []).map((v) => v.viewer_id)));
    const { data: vprof } =
      ids.length > 0
        ? await supabase
            .from("profiles")
            .select("id, username")
            .in("id", ids)
        : { data: [] as { id: string; username: string }[] };

    const uname = new Map((vprof ?? []).map((p) => [p.id, p.username] as const));
    const seen = new Set<string>();
    profileViewEntries = [];
    for (const v of viewRows ?? []) {
      if (seen.has(v.viewer_id)) continue;
      seen.add(v.viewer_id);
      profileViewEntries.push({
        username: uname.get(v.viewer_id) ?? "unknown",
        viewedAt: v.created_at,
      });
    }
  }

  let ownerPending: RatingRow[] = [];
  let ownerPendingUsernames: Record<string, string> = {};
  if (isOwnProfile && viewerId) {
    const { data: pend } = await supabase
      .from("ratings")
      .select("*")
      .or(`rater_id.eq.${profile.id},rated_id.eq.${profile.id}`)
      .eq("both_submitted", false)
      .order("updated_at", { ascending: false });
    ownerPending = (pend ?? []) as RatingRow[];
    const ids = Array.from(
      new Set(
        ownerPending.map((r) =>
          r.rater_id === profile.id ? r.rated_id : r.rater_id
        )
      )
    );
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", ids);
      ownerPendingUsernames = Object.fromEntries(
        (profs ?? []).map((p) => [p.id, p.username])
      );
    }
  }

  const dimensionAverages = aggregateDimensionAverages(ratings);

  let hasExistingRating = false;
  if (viewerId && !isOwnProfile) {
    const { data: asRater } = await supabase
      .from("ratings")
      .select("id")
      .eq("rater_id", viewerId)
      .eq("rated_id", profile.id)
      .limit(1);
    const { data: asRated } = await supabase
      .from("ratings")
      .select("id")
      .eq("rater_id", profile.id)
      .eq("rated_id", viewerId)
      .limit(1);
    hasExistingRating =
      (asRater != null && asRater.length > 0) ||
      (asRated != null && asRated.length > 0);
  }

  const scorePublic =
    (profile as { score_public?: boolean }).score_public !== false;
  const scoreLockedForVisitor = !isOwnProfile && !scorePublic;

  const whoCanRate =
    (profile as { who_can_rate?: string }).who_can_rate ?? "anyone";
  let canInitiateRating = true;
  if (viewerId && !isOwnProfile) {
    const { data: allowed, error: rpcErr } = await supabase.rpc(
      "can_initiate_rating",
      {
        p_rated: profile.id,
        p_rater: viewerId,
      }
    );
    if (rpcErr) {
      canInitiateRating = whoCanRate !== "contacts_only";
    } else {
      canInitiateRating = !!allowed;
    }
  }

  const relationshipTypes = ratings.map((r) => r.relationship_type);

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6 sm:py-14">
        <ProfileHeader
          profile={profile}
          dimensionAverages={dimensionAverages}
          isOwnProfile={isOwnProfile}
          scoreLockedForVisitor={scoreLockedForVisitor}
        />

        {!scoreLockedForVisitor ? (
          <div className="space-y-2">
            <ProfileDimensionBars averages={dimensionAverages} />
            {isOwnProfile && ownerPremium ? (
              <p className="text-center text-xs text-muted-foreground">
                Premium: full dimension breakdown above — trend over time below.
              </p>
            ) : null}
          </div>
        ) : (
          <section className="rounded-2xl border border-dashed border-border/80 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
            Dimension breakdown is hidden while this Receipt score is private.
          </section>
        )}

        {isOwnProfile && ownerPremium ? (
          <PremiumProfileInsights
            profileViews={profileViewEntries}
            completedRatings={ratings}
          />
        ) : null}

        <ProfileRelationshipBadges types={relationshipTypes} />

        {isOwnProfile && viewerId ? (
          <ProfileOwnerPending
            viewerId={viewerId}
            pending={ownerPending}
            usernames={ownerPendingUsernames}
          />
        ) : null}

        {!scoreLockedForVisitor ? (
          <ProfileRatingsFeed ratings={ratings} viewerId={viewerId} />
        ) : (
          <section className="rounded-3xl border border-dashed border-border/80 bg-muted/10 p-8 text-center">
            <h2 className="text-lg font-semibold text-foreground">
              Completed ratings
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Unlocked receipts for this profile are private — you&apos;re seeing
              the teaser, not the verdict.
            </p>
          </section>
        )}

        <ProfileListingsGrid listings={listingsSorted} poster={profile} />

        <ProfileRateCta
          viewerId={viewerId}
          profileUserId={profile.id}
          profileUsername={profile.username}
          hasExistingRating={hasExistingRating}
          canInitiateRating={canInitiateRating}
          whoCanRate={whoCanRate}
        />
    </div>
  );
}
