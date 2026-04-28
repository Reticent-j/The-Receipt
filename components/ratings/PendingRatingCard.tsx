import Link from "next/link";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RELATIONSHIP_LABEL } from "@/lib/profile-display";
import type { Database } from "@/types/database";

type RatingRow = Database["public"]["Tables"]["ratings"]["Row"];

interface PendingRatingCardProps {
  rating: RatingRow;
  viewerId: string;
  counterpartyUsername: string;
  /** Profile UUID of the other participant — used for /rate/[userId] link. */
  counterpartyId: string;
  /** Premium + you are rated side: who initiated before you submit. */
  revealInitiatorUsername?: string | null;
}

export function PendingRatingCard({
  rating,
  viewerId,
  counterpartyUsername,
  counterpartyId,
  revealInitiatorUsername,
}: PendingRatingCardProps): React.JSX.Element {
  const isRater = rating.rater_id === viewerId;
  const myDone = isRater ? rating.rater_submitted : rating.rated_submitted;
  const waitingOnMe = !myDone;
  const initiatedByMe = isRater;

  return (
    <Card className="border-dashed border-primary/30 bg-muted/10">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
          <Lock className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-lg leading-tight">
            Waiting for their receipt…
          </CardTitle>
          <CardDescription className="mt-1">
            {RELATIONSHIP_LABEL[rating.relationship_type]} ·{" "}
            {revealInitiatorUsername
              ? (
                  <>
                    <span className="font-medium text-foreground">
                      @{revealInitiatorUsername}
                    </span>{" "}
                    initiated
                    <span className="ml-1 text-xs text-primary">(Premium)</span>
                  </>
                )
              : initiatedByMe
                ? "You initiated"
                : "They initiated"}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          @{counterpartyUsername} — scores stay double-blind until both sides
          submit.
        </p>
        {waitingOnMe ? (
          <Button asChild className="w-full sm:w-auto">
            <Link href={`/rate/${counterpartyId}`}>Complete your receipt</Link>
          </Button>
        ) : (
          <p className="rounded-md border border-border/80 bg-background/60 px-3 py-2 text-sm text-muted-foreground">
            You&apos;re all set. We&apos;re waiting on @{counterpartyUsername}{" "}
            to submit theirs before anything unlocks.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
