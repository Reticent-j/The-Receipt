"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FloatingNewListingButton({
  className,
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <Button
      asChild
      size="icon"
      className={cn(
        "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full border-2 border-primary/60 bg-gradient-to-br from-primary to-amber-400 text-primary-foreground shadow-2xl shadow-primary/30 transition-transform hover:scale-105 hover:shadow-primary/40 sm:bottom-8 sm:right-8 sm:h-16 sm:w-16",
        className
      )}
      aria-label="Create new listing"
    >
      <Link href="/listings/new">
        <Plus className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={2.5} />
      </Link>
    </Button>
  );
}
