"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { PREMIUM_MONTHLY_DISPLAY } from "@/lib/subscription";

type SubscribeButtonProps = {
  disabled?: boolean;
  label?: string;
};

export function SubscribeButton({
  disabled = false,
  label,
}: SubscribeButtonProps): React.JSX.Element {
  const [loading, setLoading] = useState(false);

  async function onClick(): Promise<void> {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        toast({
          variant: "destructive",
          title: "Checkout unavailable",
          description:
            body.error ??
            "Stripe may not be configured — add STRIPE_SECRET_KEY and price IDs.",
        });
        return;
      }
      window.location.href = body.url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      size="lg"
      className="w-full bg-gradient-to-r from-primary to-amber-400 font-bold text-primary-foreground shadow-lg shadow-primary/25 sm:w-auto sm:min-w-[220px]"
      disabled={disabled || loading}
      onClick={() => void onClick()}
    >
      {loading
        ? "Opening checkout…"
        : (label ?? `Subscribe — ${PREMIUM_MONTHLY_DISPLAY}`)}
    </Button>
  );
}
