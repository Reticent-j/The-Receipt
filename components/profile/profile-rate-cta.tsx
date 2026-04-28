"use client";

import Link from "next/link";

import { RatePersonDialog } from "@/components/profile/rate-person-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ProfileRateCtaProps {
  viewerId: string | null;
  profileUserId: string;
  profileUsername: string;
  hasExistingRating: boolean;
  canInitiateRating?: boolean;
  whoCanRate?: string;
}

export function ProfileRateCta({
  viewerId,
  profileUserId,
  profileUsername,
  hasExistingRating,
  canInitiateRating = true,
  whoCanRate = "anyone",
}: ProfileRateCtaProps): React.JSX.Element | null {
  if (viewerId === profileUserId) {
    return null;
  }

  if (!viewerId) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-6 text-center sm:text-left">
        <p className="text-sm font-medium text-foreground">
          Know this person? Rate them on The Receipt.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Sign in to start a double-blind mutual rating.
        </p>
        <Button asChild className="mt-4" variant="secondary">
          <Link href={`/login?next=/profile/${encodeURIComponent(profileUsername)}`}>
            Log in to rate
          </Link>
        </Button>
      </div>
    );
  }

  if (!canInitiateRating && whoCanRate === "contacts_only") {
    return (
      <div className="rounded-2xl border border-border/80 bg-muted/20 p-6 text-center sm:text-left">
        <p className="text-sm font-medium text-foreground">
          Ratings are invite-only for @{profileUsername}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          They only accept Receipts from people who appear in their synced
          contacts as a match. Sync your contacts from the app first — or ask
          them to open things up in settings.
        </p>
      </div>
    );
  }

  if (hasExistingRating) {
    return (
      <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-border/80 bg-muted/20 p-5 sm:flex-row sm:items-center">
        <p className="text-sm text-muted-foreground">
          You already have a rating in progress with this person.
        </p>
        <Badge variant="outline" className="border-primary/40 text-primary">
          In progress
        </Badge>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 via-background to-background p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
      <div className="text-center sm:text-left">
        <p className="text-base font-semibold text-foreground">
          Worked, lived, or transacted with @{profileUsername}?
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Leave a double-blind mutual rating. Identities stay private until both
          sides submit.
        </p>
      </div>
      <div className="mt-4 flex justify-center sm:mt-0 sm:justify-end">
        <RatePersonDialog
          ratedUserId={profileUserId}
          ratedUsername={profileUsername}
        />
      </div>
    </div>
  );
}
