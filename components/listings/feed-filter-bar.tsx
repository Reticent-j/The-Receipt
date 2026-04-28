"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import type { FeedCategoryFilter } from "@/lib/listing-utils";

const FILTERS: { id: FeedCategoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "roommate", label: "Roommate" },
  { id: "selling", label: "Selling" },
  { id: "gig", label: "Gigs" },
  { id: "other", label: "Other" },
];

export function FeedFilterBar(): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = (searchParams.get("category") ?? "all") as FeedCategoryFilter;
  const active: FeedCategoryFilter = FILTERS.some((f) => f.id === current)
    ? current
    : "all";

  function setFilter(id: FeedCategoryFilter): void {
    const next = new URLSearchParams(searchParams.toString());
    if (id === "all") {
      next.delete("category");
    } else {
      next.set("category", id);
    }
    const q = next.toString();
    router.push(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {FILTERS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => setFilter(id)}
          className={cn(
            "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-all",
            active === id
              ? "border-primary bg-primary/15 text-primary shadow-md shadow-primary/15"
              : "border-border/80 bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
