import Link from "next/link";
import { Calendar } from "lucide-react";

import { PremiumBadge } from "@/components/profile/PremiumBadge";
import { ProfileHeroScore } from "@/components/profile/profile-hero-score";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { DimensionAverages } from "@/lib/profile-scores";
import { isPremiumSubscription } from "@/lib/subscription";
import type { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

function initials(profile: ProfileRow): string {
  const fromName = profile.full_name?.trim();
  if (fromName) {
    const parts = fromName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
    }
    return fromName.slice(0, 2).toUpperCase();
  }
  return profile.username.slice(0, 2).toUpperCase();
}

function formatJoinDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(d);
}

interface ProfileHeaderProps {
  profile: ProfileRow;
  dimensionAverages: DimensionAverages;
  isOwnProfile: boolean;
  /** Hide numeric score for visitors when profile has score_public = false */
  scoreLockedForVisitor?: boolean;
}

export function ProfileHeader({
  profile,
  dimensionAverages,
  isOwnProfile,
  scoreLockedForVisitor = false,
}: ProfileHeaderProps): React.JSX.Element {
  const displayName = profile.full_name?.trim() || profile.username;
  const showVerified = isPremiumSubscription(
    profile.subscription_status ?? "free"
  );

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/40 p-6 sm:p-10">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-amber-500/5 blur-3xl" />

      <div className="relative grid gap-10 lg:grid-cols-[1fr_minmax(260px,320px)] lg:items-start">
        <div className="flex flex-col items-center gap-6 text-center lg:flex-row lg:items-start lg:text-left">
          <Avatar className="h-28 w-28 border-4 border-primary/40 shadow-xl shadow-primary/20 sm:h-32 sm:w-32">
            {profile.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={displayName} />
            ) : null}
            <AvatarFallback className="bg-primary/20 text-3xl font-bold text-primary sm:text-4xl">
              {initials(profile)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="flex flex-wrap items-center gap-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  <span>{displayName}</span>
                  {showVerified ? <PremiumBadge size="md" /> : null}
                </h1>
                <p className="mt-1 text-lg text-muted-foreground">
                  @{profile.username}
                </p>
              </div>
              {isOwnProfile ? (
                <Button
                  asChild
                  variant="outline"
                  className="shrink-0 border-primary/50 lg:self-start"
                >
                  <Link href="/settings">Edit profile</Link>
                </Button>
              ) : null}
            </div>

            {profile.bio ? (
              <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">
                {profile.bio}
              </p>
            ) : (
              <p className="text-sm italic text-muted-foreground/80">
                No bio yet.
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground lg:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/60 px-3 py-1">
                <span className="font-semibold text-foreground">
                  {profile.total_ratings}
                </span>
                {profile.total_ratings === 1 ? "rating" : "ratings"} received
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/60 px-3 py-1">
                <Calendar className="h-4 w-4 text-primary" aria-hidden />
                Joined {formatJoinDate(profile.created_at)}
              </span>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-sm lg:mx-0 lg:max-w-none">
          <ProfileHeroScore
            profileOverall={Number(profile.overall_score)}
            dimensionAverages={dimensionAverages}
            lockedForVisitor={scoreLockedForVisitor}
          />
        </div>
      </div>
    </section>
  );
}
