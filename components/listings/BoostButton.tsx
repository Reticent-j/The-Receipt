"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  BOOST_ONETIME_DISPLAY,
  PREMIUM_MONTHLY_DISPLAY,
  isBoostActive,
  isPremiumSubscription,
} from "@/lib/subscription";
import { cn } from "@/lib/utils";

type BoostButtonProps = {
  listingId: string;
  boostExpiresAt: string | null;
  /** Current user's subscription_status */
  viewerSubscriptionStatus: string;
  /** YYYY-MM when viewer last used included premium boost */
  premiumBoostMonthUsed: string | null;
};

export function BoostButton({
  listingId,
  boostExpiresAt,
  viewerSubscriptionStatus,
  premiumBoostMonthUsed,
}: BoostButtonProps): React.JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState<"paid" | "free" | null>(null);
  const boosted = isBoostActive(boostExpiresAt);
  const premium = isPremiumSubscription(viewerSubscriptionStatus);

  const month = new Date().toISOString().slice(0, 7);
  const freeBoostAvailable =
    premium && premiumBoostMonthUsed !== month && !boosted;

  async function startPaidBoost(): Promise<void> {
    setLoading("paid");
    try {
      const res = await fetch("/api/stripe/boost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        toast({
          variant: "destructive",
          title: "Checkout failed",
          description: body.error ?? res.statusText,
        });
        return;
      }
      window.location.href = body.url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setLoading(null);
    }
  }

  async function useFreeBoost(): Promise<void> {
    setLoading("free");
    try {
      const res = await fetch("/api/stripe/boost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, usePremiumAllocation: true }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        error?: string;
        boost_expires_at?: string;
      };
      if (!res.ok || !body.ok) {
        toast({
          variant: "destructive",
          title: "Could not apply boost",
          description: body.error ?? res.statusText,
        });
        return;
      }
      toast({
        title: "Listing boosted",
        description:
          "You’re pinned to the top of the feed in this category for 48 hours.",
      });
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setLoading(null);
    }
  }

  if (boosted && boostExpiresAt) {
    const end = new Date(boostExpiresAt);
    const rel = new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(end);
    return (
      <div
        className={cn(
          "rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm",
          "text-amber-100"
        )}
      >
        <p className="flex items-center gap-2 font-semibold text-foreground">
          <Zap className="h-4 w-4 text-amber-400" aria-hidden />
          Boost active
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Feed bump + bold card until{" "}
          <span className="font-medium text-foreground">{rel}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Boost this listing</p>
        <p className="mt-1 text-xs text-muted-foreground">
          48 hours at the top of the marketplace in this category, with a bold
          card treatment — {BOOST_ONETIME_DISPLAY} one-time.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          size="sm"
          className="bg-gradient-to-r from-amber-500 to-primary font-semibold"
          disabled={loading !== null}
          onClick={() => void startPaidBoost()}
        >
          {loading === "paid" ? "Redirecting…" : `Pay ${BOOST_ONETIME_DISPLAY}`}
        </Button>
        {freeBoostAvailable ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-primary/50"
            disabled={loading !== null}
            onClick={() => void useFreeBoost()}
          >
            {loading === "free"
              ? "Applying…"
              : `Use monthly boost (${PREMIUM_MONTHLY_DISPLAY})`}
          </Button>
        ) : premium ? (
          <p className="text-xs text-muted-foreground">
            Included monthly boost already used this month — paid boost still
            available.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Subscribers get one free boost each month — see{" "}
            <a href="/premium" className="text-primary underline">
              Receipt Premium
            </a>
            .
          </p>
        )}
      </div>
    </div>
  );
}
