import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RatingUnlockCard } from "@/components/ratings/RatingUnlockCard";
import {
  DIMENSION_LABELS,
  parseScoresJson,
  SCORE_DIMENSIONS,
  type ScoreDimensionKey,
} from "@/lib/profile-scores";
import { RELATIONSHIP_LABEL } from "@/lib/profile-display";
import type { Database } from "@/types/database";

type RatingRow = Database["public"]["Tables"]["ratings"]["Row"];

function formatRatingDate(iso: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

interface ProfileRatingsFeedProps {
  ratings: RatingRow[];
  /** When set, participants see the dramatic unlock card instead of the public-only card. */
  viewerId: string | null;
}

export function ProfileRatingsFeed({
  ratings,
  viewerId,
}: ProfileRatingsFeedProps): React.JSX.Element {
  if (ratings.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-border/80 bg-muted/10 p-8 text-center">
        <h2 className="text-lg font-semibold text-foreground">
          Completed ratings
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No unlocked mutual ratings yet. When exchanges complete, they show up
          here—raters stay anonymous.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          Completed ratings
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Double-blind reviews. Only relationship type and date are shown—never
          who left the rating.
        </p>
      </div>
      <ul className="flex flex-col gap-4">
        {ratings.map((r) => (
          <li key={r.id}>
            <RatingListItem rating={r} viewerId={viewerId} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function RatingListItem({
  rating,
  viewerId,
}: {
  rating: RatingRow;
  viewerId: string | null;
}): React.JSX.Element {
  const isParticipant =
    viewerId != null &&
    (viewerId === rating.rater_id || viewerId === rating.rated_id);

  if (rating.both_submitted && isParticipant && viewerId) {
    return <RatingUnlockCard rating={rating} viewerId={viewerId} />;
  }

  return <PublicRatingCard rating={rating} />;
}

function PublicRatingCard({ rating }: { rating: RatingRow }): React.JSX.Element {
  const scores = parseScoresJson(rating.scores);
  const dims = SCORE_DIMENSIONS.filter((k) => scores[k] != null);

  return (
    <Card className="border-border/80 bg-card/50 overflow-hidden">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 border-b border-border/60 bg-muted/20 pb-4">
        <Badge className="border-primary/30 bg-primary/15 text-primary hover:bg-primary/20">
          {RELATIONSHIP_LABEL[rating.relationship_type]}
        </Badge>
        <time
          className="text-xs text-muted-foreground sm:text-sm"
          dateTime={rating.created_at}
        >
          {formatRatingDate(rating.created_at)}
        </time>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {dims.length > 0 ? (
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            {dims.map((k) => (
              <div
                key={k}
                className="rounded-lg border border-border/60 bg-background/40 px-2 py-2 text-center"
              >
                <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                  {DIMENSION_LABELS[k as ScoreDimensionKey]}
                </dt>
                <dd className="text-lg font-bold tabular-nums text-primary">
                  {scores[k]!.toFixed(1)}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {rating.review_text?.trim() ? (
          <blockquote className="border-l-2 border-primary/50 pl-4 text-sm leading-relaxed text-muted-foreground">
            {rating.review_text}
          </blockquote>
        ) : (
          <p className="text-xs italic text-muted-foreground/70">
            No written review for this exchange.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
