"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { isSupabaseConfigured } from "@/lib/env";
import { RELATIONSHIP_LABEL } from "@/lib/profile-display";
import { createClient } from "@/lib/supabase/client";
import type { RelationshipType } from "@/types/database";

const REL_TYPES: RelationshipType[] = [
  "romantic",
  "roommate",
  "coworker",
  "friend",
  "transaction",
];

interface RatePersonDialogProps {
  ratedUserId: string;
  ratedUsername: string;
}

export function RatePersonDialog({
  ratedUserId,
  ratedUsername,
}: RatePersonDialogProps): React.JSX.Element {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [relationshipType, setRelationshipType] =
    useState<RelationshipType>("transaction");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      toast({
        variant: "destructive",
        title: "Not configured",
        description: "Supabase environment variables are missing.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: "destructive",
          title: "Sign in required",
          description: "Log in to start a rating.",
        });
        setSubmitting(false);
        return;
      }

      const { data: allowed, error: gateErr } = await supabase.rpc(
        "can_initiate_rating",
        { p_rated: ratedUserId, p_rater: user.id }
      );

      if (!gateErr && !allowed) {
        toast({
          variant: "destructive",
          title: "Ratings are contact-only",
          description:
            "This person only accepts Receipts from matched contacts. Sync contacts or ask them to change privacy in settings.",
        });
        return;
      }

      const { error } = await supabase.from("ratings").insert({
        rater_id: user.id,
        rated_id: ratedUserId,
        relationship_type: relationshipType,
        scores: {},
        rater_submitted: false,
        rated_submitted: false,
        both_submitted: false,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Could not start rating",
          description: error.message,
        });
        return;
      }

      toast({
        title: "Rating started",
        description:
          "Complete your side when you’re ready. The other person will be notified to submit theirs.",
      });
      setOpen(false);
      router.push(`/rate/${ratedUserId}`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="w-full bg-gradient-to-r from-primary to-amber-400 font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:from-primary/95 hover:to-amber-400/90 sm:w-auto sm:min-w-[220px]"
        >
          Rate this person
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border bg-card sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Start a mutual rating</DialogTitle>
            <DialogDescription>
              You&apos;re initiating a double-blind exchange with{" "}
              <span className="font-medium text-foreground">@{ratedUsername}</span>
              . Choose the relationship that best describes how you know them.
              Neither score is visible until both of you submit.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <Label htmlFor="relationship">Relationship type</Label>
            <select
              id="relationship"
              value={relationshipType}
              onChange={(ev) =>
                setRelationshipType(ev.target.value as RelationshipType)
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {REL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {RELATIONSHIP_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Starting…" : "Start rating"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
