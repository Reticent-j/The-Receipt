"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RATING_DIMENSION_KEYS, parseSidePayload } from "@/lib/rating-dimensions";
import {
  DIMENSION_LABELS,
  type ScoreDimensionKey,
} from "@/lib/profile-scores";
import { RELATIONSHIP_LABEL } from "@/lib/profile-display";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type RatingRow = Database["public"]["Tables"]["ratings"]["Row"];

interface RatingUnlockCardProps {
  rating: RatingRow;
  viewerId: string;
}

export function RatingUnlockCard({
  rating,
  viewerId,
}: RatingUnlockCardProps): React.JSX.Element {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setRevealed(true), 500);
    return () => window.clearTimeout(t);
  }, [rating.id]);

  const isRater = rating.rater_id === viewerId;
  const myData = isRater ? rating.rater_score_data : rating.rated_score_data;
  const theirData = isRater ? rating.rated_score_data : rating.rater_score_data;
  const mine = parseSidePayload(myData);
  const theirs = parseSidePayload(theirData);

  return (
    <Card
      className={cn(
        "overflow-hidden border-2 border-primary/50 bg-gradient-to-b from-primary/10 via-card to-card shadow-2xl shadow-primary/10 transition-all duration-700",
        revealed && "ring-2 ring-primary/40"
      )}
    >
      <CardHeader className="relative border-b border-primary/20 bg-muted/30 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge className="gap-1 border-amber-400/50 bg-amber-500/15 text-amber-200">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Receipt unlocked
          </Badge>
          <span className="text-xs text-muted-foreground">
            {RELATIONSHIP_LABEL[rating.relationship_type]}
          </span>
        </div>
        <p className="mt-2 text-sm font-medium text-foreground">
          Your scores vs theirs — revealed together
        </p>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <ul className="space-y-5">
          {RATING_DIMENSION_KEYS.map((key, i) => {
            const a = mine[key];
            const b = theirs[key];
            if (a == null && b == null) return null;
            const delta =
              a != null && b != null ? Math.round((a - b) * 10) / 10 : null;
            return (
              <li
                key={key}
                className={cn(
                  "grid gap-3 rounded-xl border border-border/60 bg-background/50 p-4 transition-all duration-500 sm:grid-cols-[1fr_auto_auto]",
                  revealed ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                )}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {DIMENSION_LABELS[key as ScoreDimensionKey]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    You vs them (same 1–10 scale)
                  </p>
                </div>
                <div className="text-center sm:text-right">
                  <p className="text-[10px] uppercase tracking-wide text-primary">
                    You
                  </p>
                  <p className="text-2xl font-black tabular-nums text-primary">
                    {a ?? "—"}
                  </p>
                </div>
                <div className="text-center sm:text-right">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Them
                  </p>
                  <p className="text-2xl font-black tabular-nums text-foreground">
                    {b ?? "—"}
                  </p>
                </div>
                {delta != null ? (
                  <p className="col-span-full text-center text-xs text-amber-400/90 sm:text-right">
                    Δ {delta > 0 ? "+" : ""}
                    {delta.toFixed(1)} (you minus them)
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
        <p className="text-center text-xs text-muted-foreground">
          Public profile feed below shows the aggregate receipt for this exchange.
        </p>
      </CardContent>
    </Card>
  );
}
