"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { submitRatingSide } from "@/app/actions/ratings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  RATING_DIMENSION_HELP,
  RATING_DIMENSION_KEYS,
  emptySidePayload,
  type SidePayload,
} from "@/lib/rating-dimensions";
import { RELATIONSHIP_LABEL } from "@/lib/profile-display";
import type { Database, RelationshipType } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type RatingRow = Database["public"]["Tables"]["ratings"]["Row"];

const REL_TYPES: RelationshipType[] = [
  "romantic",
  "roommate",
  "coworker",
  "friend",
  "transaction",
];

interface RateWizardProps {
  viewerId: string;
  counterparty: ProfileRow;
  rating: RatingRow;
  /** Premium: when you are the rated party, shows who started the receipt before you submit. */
  initiatorRevealUsername?: string | null;
}

export function RateWizard({
  viewerId,
  counterparty,
  rating,
  initiatorRevealUsername = null,
}: RateWizardProps): React.JSX.Element {
  const router = useRouter();
  const isRater = rating.rater_id === viewerId;
  const alreadySubmitted = isRater
    ? rating.rater_submitted
    : rating.rated_submitted;

  const [step, setStep] = useState(0);
  const [relationshipType, setRelationshipType] = useState<RelationshipType>(
    rating.relationship_type
  );
  const [payload, setPayload] = useState<SidePayload>(() => {
    const base = emptySidePayload();
    return base;
  });
  const [submitting, setSubmitting] = useState(false);

  const maxStep = useMemo(() => (isRater ? 3 : 2), [isRater]);

  const showInitiatorReveal =
    !isRater &&
    initiatorRevealUsername &&
    !alreadySubmitted &&
    !rating.both_submitted;

  if (alreadySubmitted) {
    return (
      <Card className="border-primary/30 bg-card/60">
        <CardContent className="pt-8 text-center">
          <p className="text-lg font-semibold">You already submitted</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Waiting on @{counterparty.username} if they haven&apos;t finished
            yet, or this receipt is complete.
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link href="/ratings/pending">View pending ratings</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (rating.both_submitted) {
    return (
      <Card className="border-emerald-500/40 bg-card/60">
        <CardContent className="pt-8 text-center">
          <p className="text-lg font-semibold text-emerald-400">
            This receipt is unlocked
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Both sides are visible on the profile.
          </p>
          <Button asChild className="mt-6">
            <Link href={`/profile/${counterparty.username}`}>
              Back to profile
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  async function onSubmit(): Promise<void> {
    setSubmitting(true);
    const res = await submitRatingSide({
      counterpartyProfileId: counterparty.id,
      relationshipType,
      payload,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast({
        variant: "destructive",
        title: "Could not save",
        description: res.error,
      });
      return;
    }
    toast({
      title: res.unlocked ? "Receipt unlocked" : "Your side is saved",
      description: res.unlocked
        ? "Both scores are now public on the profile."
        : "The other person has been nudged to finish their receipt.",
    });
    router.push(`/profile/${counterparty.username}`);
    router.refresh();
  }

  function next(): void {
    if (step < maxStep) setStep((s) => s + 1);
  }

  function back(): void {
    if (step > 0) setStep((s) => s - 1);
  }

  function setDim(
    key: keyof Pick<
      SidePayload,
      "reliability" | "communication" | "respect" | "effort" | "character"
    >,
    value: number
  ): void {
    setPayload((p) => ({ ...p, [key]: value }));
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {showInitiatorReveal ? (
        <div className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm shadow-sm shadow-primary/10">
          <p className="font-semibold text-foreground">Receipt Premium perk</p>
          <p className="mt-1 text-pretty text-muted-foreground">
            <span className="font-medium text-foreground">
              @{initiatorRevealUsername}
            </span>{" "}
            started this mutual receipt. Only you see this before you submit —
            the rest of the marketplace stays blind.
          </p>
        </div>
      ) : null}

      <div className="flex justify-center gap-2">
        {Array.from({ length: maxStep + 1 }).map((_, i) => (
          <span
            key={i}
            className={`h-2 w-8 rounded-full transition-colors ${
              i <= step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <Card className="border-border/80 bg-card/70 shadow-xl shadow-primary/5">
        <CardContent className="space-y-6 pt-8">
          {isRater && step === 0 ? (
            <section className="space-y-4">
              <h2 className="text-xl font-bold">Step 1 — Relationship</h2>
              <p className="text-sm text-muted-foreground">
                How do you primarily know @{counterparty.username}?
              </p>
              <Label htmlFor="rel">Relationship type</Label>
              <select
                id="rel"
                value={relationshipType}
                onChange={(e) =>
                  setRelationshipType(e.target.value as RelationshipType)
                }
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {REL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {RELATIONSHIP_LABEL[t]}
                  </option>
                ))}
              </select>
            </section>
          ) : null}

          {isRater && step === 1 ? (
            <DimensionStep payload={payload} setDim={setDim} />
          ) : null}
          {!isRater && step === 0 ? (
            <DimensionStep payload={payload} setDim={setDim} />
          ) : null}

          {isRater && step === 2 ? (
            <ReviewStep payload={payload} setPayload={setPayload} />
          ) : null}
          {!isRater && step === 1 ? (
            <ReviewStep payload={payload} setPayload={setPayload} />
          ) : null}

          {isRater && step === 3 ? (
            <ConfirmStep counterpartyUsername={counterparty.username} />
          ) : null}
          {!isRater && step === 2 ? (
            <ConfirmStep counterpartyUsername={counterparty.username} />
          ) : null}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              disabled={step === 0 || submitting}
              onClick={back}
            >
              Back
            </Button>
            {step < maxStep ? (
              <Button type="button" onClick={next}>
                Continue
              </Button>
            ) : (
              <Button
                type="button"
                disabled={submitting}
                className="bg-gradient-to-r from-primary to-amber-400 font-bold text-primary-foreground shadow-lg shadow-primary/20"
                onClick={() => void onSubmit()}
              >
                {submitting ? "Locking…" : "Lock in my rating"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DimensionStep({
  payload,
  setDim,
}: {
  payload: SidePayload;
  setDim: (
    k: keyof Pick<
      SidePayload,
      "reliability" | "communication" | "respect" | "effort" | "character"
    >,
    v: number
  ) => void;
}): React.JSX.Element {
  const title = "Rate them on each dimension (1–10)";
  return (
    <section className="space-y-6">
      <h2 className="text-xl font-bold">{title}</h2>
      {RATING_DIMENSION_KEYS.map((key) => {
        const cfg = RATING_DIMENSION_HELP[key];
        const val = payload[key];
        return (
          <div key={key} className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <Label className="text-base font-semibold">{cfg.title}</Label>
              <span className="text-2xl font-black tabular-nums text-primary">
                {val}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{cfg.hint}</p>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={val}
              onChange={(e) => setDim(key, Number(e.target.value))}
              className="h-3 w-full cursor-pointer accent-primary"
            />
          </div>
        );
      })}
    </section>
  );
}

function ReviewStep({
  payload,
  setPayload,
}: {
  payload: SidePayload;
  setPayload: React.Dispatch<React.SetStateAction<SidePayload>>;
}): React.JSX.Element {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold">Optional written review</h2>
      <p className="text-sm text-muted-foreground">
        Max 280 characters. Shown only after both sides submit.
      </p>
      <Textarea
        value={payload.review}
        maxLength={280}
        onChange={(e) =>
          setPayload((p) => ({ ...p, review: e.target.value.slice(0, 280) }))
        }
        placeholder="Anything you want on the record…"
        className="min-h-[120px] resize-none"
      />
      <p className="text-right text-xs text-muted-foreground">
        {payload.review.length}/280
      </p>
    </section>
  );
}

function ConfirmStep({
  counterpartyUsername,
}: {
  counterpartyUsername: string;
}): React.JSX.Element {
  return (
    <section className="space-y-4 text-center sm:text-left">
      <h2 className="text-xl font-bold">Double-blind lock-in</h2>
      <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm leading-relaxed text-foreground">
        <p className="font-semibold text-primary">Your rating is locked</p>
        <p className="mt-2 text-muted-foreground">
          until @{counterpartyUsername} submits theirs. Neither of you can see
          the other&apos;s numbers or review until <strong>both</strong>{" "}
          receipts are in—then they unlock together on the profile.
        </p>
      </div>
    </section>
  );
}
