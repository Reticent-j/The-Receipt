import Link from "next/link";

import { PremiumBadge } from "@/components/profile/PremiumBadge";
import { ReceiptScoreBadge } from "@/lib/listing-score-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListingInquireButton } from "@/components/listings/listing-inquire-button";
import {
  DIMENSION_LABELS,
  SCORE_DIMENSIONS,
  type DimensionAverages,
  type ScoreDimensionKey,
  headlineScoreOutOf10,
} from "@/lib/profile-scores";
import { isPremiumSubscription } from "@/lib/subscription";
import type { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

function displayName(p: ProfileRow): string {
  return p.full_name?.trim() || p.username;
}

function initials(p: ProfileRow): string {
  return displayName(p).slice(0, 2).toUpperCase();
}

interface ListingSellerSidebarProps {
  seller: ProfileRow;
  dimensionAverages: DimensionAverages;
  listingTitle: string;
}

export function ListingSellerSidebar({
  seller,
  dimensionAverages,
  listingTitle,
}: ListingSellerSidebarProps): React.JSX.Element {
  const headline = headlineScoreOutOf10(
    Number(seller.overall_score),
    dimensionAverages
  );

  const topDims = SCORE_DIMENSIONS.map((k) => {
    const v = dimensionAverages[k];
    return v && v.count > 0 ? { key: k, ...v } : null;
  })
    .filter(Boolean) as Array<{
      key: ScoreDimensionKey;
      average: number;
      count: number;
    }>;
  topDims.sort((a, b) => b.average - a.average);
  const topThree = topDims.slice(0, 3);
  const sellerVerified = isPremiumSubscription(
    seller.subscription_status ?? "free"
  );

  return (
    <Card className="border-primary/25 bg-gradient-to-b from-primary/10 via-card to-card shadow-xl shadow-primary/5">
      <CardHeader className="space-y-4 pb-2">
        <div className="flex items-start gap-3">
          <Avatar className="h-16 w-16 border-2 border-primary/40 shadow-lg">
            {seller.avatar_url ? (
              <AvatarImage src={seller.avatar_url} alt="" />
            ) : null}
            <AvatarFallback className="text-lg font-bold text-primary">
              {initials(seller)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-lg leading-tight">
              <span>{displayName(seller)}</span>
              {sellerVerified ? <PremiumBadge size="sm" /> : null}
            </CardTitle>
            <p className="text-sm text-muted-foreground">@{seller.username}</p>
            <Badge variant="secondary" className="mt-2 border border-border/80">
              {seller.total_ratings}{" "}
              {seller.total_ratings === 1 ? "rating" : "ratings"}
            </Badge>
          </div>
        </div>
        <div className="flex justify-center py-2">
          <ReceiptScoreBadge score={headline} size="xl" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {topThree.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Top dimensions (unlocked receipts)
            </p>
            <ul className="space-y-2">
              {topThree.map((row) => (
                <li
                  key={row.key}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm"
                >
                  <span>{DIMENSION_LABELS[row.key]}</span>
                  <span className="font-bold tabular-nums text-primary">
                    {row.average.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            Dimension breakdown appears after enough unlocked mutual ratings.
          </p>
        )}
        <Button asChild variant="outline" className="w-full border-primary/40">
          <Link href={`/profile/${seller.username}`}>Full profile</Link>
        </Button>
        <ListingInquireButton
          listingTitle={listingTitle}
          sellerUsername={seller.username}
        />
      </CardContent>
    </Card>
  );
}
