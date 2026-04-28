import Link from "next/link";

import { PremiumBadge } from "@/components/profile/PremiumBadge";
import { ReceiptScoreBadge } from "@/lib/listing-score-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  LISTING_CATEGORY_LABEL,
  formatPriceUsd,
} from "@/lib/profile-display";
import { isListingBoostActive } from "@/lib/feed-sort";
import {
  formatListedAt,
  headlineScoreForPoster,
  isListingNew,
  listingDescriptionPreview,
} from "@/lib/listing-utils";
import { isPremiumSubscription } from "@/lib/subscription";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type ListingRow = Database["public"]["Tables"]["listings"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type ListingPoster = Pick<
  ProfileRow,
  | "id"
  | "username"
  | "full_name"
  | "avatar_url"
  | "overall_score"
  | "total_ratings"
  | "subscription_status"
>;

export interface ListingCardProps {
  listing: ListingRow;
  poster: ListingPoster;
  variant?: "default" | "compact";
  /** Show truncated description (feed). */
  showDescription?: boolean;
  className?: string;
}

function posterDisplayName(poster: ListingPoster): string {
  return poster.full_name?.trim() || poster.username;
}

function initials(poster: ListingPoster): string {
  const base = posterDisplayName(poster);
  return base.slice(0, 2).toUpperCase();
}

export function ListingCard({
  listing,
  poster,
  variant = "default",
  showDescription = true,
  className,
}: ListingCardProps): React.JSX.Element {
  const thumb = listing.images[0];
  const score = headlineScoreForPoster(
    Number(poster.overall_score),
    poster.total_ratings
  );
  const isNew = isListingNew(listing.created_at);
  const compact = variant === "compact";
  const boosted = isListingBoostActive(listing);
  const sellerVerified = isPremiumSubscription(
    poster.subscription_status ?? "free"
  );

  return (
    <Card
      className={cn(
        "group flex h-full flex-col overflow-hidden border-border/80 bg-gradient-to-b from-card to-card/80 transition-all duration-300 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10",
        boosted &&
          "border-2 border-amber-400/70 shadow-lg shadow-amber-500/15 ring-1 ring-amber-400/30",
        compact ? "max-w-md" : "",
        className
      )}
    >
      <div className="relative aspect-[16/10] w-full shrink-0 bg-muted">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase storage or any CDN URL
          <img
            src={thumb}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted to-background text-muted-foreground">
            <span className="text-4xl opacity-40">📄</span>
            <span className="text-xs font-medium uppercase tracking-wider">
              The Receipt
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
          {boosted ? (
            <Badge className="border border-amber-500/60 bg-amber-500/25 font-bold text-amber-100 shadow-sm backdrop-blur">
              Boosted
            </Badge>
          ) : null}
          {isNew ? (
            <Badge className="border border-emerald-500/50 bg-emerald-500/20 text-emerald-200 shadow-sm backdrop-blur">
              New
            </Badge>
          ) : null}
        </div>
        <div className="absolute bottom-3 right-3 z-10 scale-100 transition-transform group-hover:scale-105">
          <ReceiptScoreBadge score={score} size={compact ? "md" : "lg"} />
        </div>
      </div>

      <CardHeader className={cn("space-y-3 pb-2", compact ? "p-4" : "p-5")}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="secondary"
            className="border border-primary/25 bg-primary/10 text-xs font-semibold text-primary"
          >
            {LISTING_CATEGORY_LABEL[listing.category]}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatListedAt(listing.created_at)}
          </span>
        </div>
        <Link href={`/listings/${listing.id}`} className="block min-w-0">
          <h3
            className={cn(
              "font-bold tracking-tight text-foreground transition-colors group-hover:text-primary",
              compact ? "text-base leading-snug" : "text-lg sm:text-xl"
            )}
          >
            {listing.title}
          </h3>
        </Link>
        {showDescription && listing.description?.trim() ? (
          <CardDescription
            className={cn(
              "line-clamp-2 text-pretty text-muted-foreground",
              compact ? "text-xs" : "text-sm"
            )}
          >
            {listingDescriptionPreview(listing.description)}
          </CardDescription>
        ) : null}
        <div
          className={cn(
            "flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground",
            compact && "text-xs"
          )}
        >
          <span className="font-semibold text-primary">
            {formatPriceUsd(listing.price)}
          </span>
          {listing.location?.trim() ? (
            <span className="text-foreground/80">{listing.location}</span>
          ) : (
            <span className="italic opacity-60">No location</span>
          )}
        </div>
      </CardHeader>

      <CardContent className={cn("mt-auto border-t border-border/60 bg-muted/20", compact ? "p-4 pt-3" : "p-5 pt-4")}>
        <Link
          href={`/profile/${poster.username}`}
          className="flex items-center gap-3 rounded-xl p-1 -m-1 transition-colors hover:bg-background/60"
        >
          <Avatar className="h-11 w-11 border-2 border-primary/30 shadow-md shadow-primary/10">
            {poster.avatar_url ? (
              <AvatarImage src={poster.avatar_url} alt="" />
            ) : null}
            <AvatarFallback className="bg-primary/15 text-sm font-bold text-primary">
              {initials(poster)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate font-semibold text-foreground">
              <span className="truncate">{posterDisplayName(poster)}</span>
              {sellerVerified ? <PremiumBadge size="sm" /> : null}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              @{poster.username}
            </p>
          </div>
          <ReceiptScoreBadge score={score} size="md" className="shrink-0" />
        </Link>
      </CardContent>
    </Card>
  );
}
