import { BadgeCheck } from "lucide-react";

import { cn } from "@/lib/utils";

type PremiumBadgeProps = {
  className?: string;
  /** Larger on profile header */
  size?: "sm" | "md";
};

export function PremiumBadge({
  className,
  size = "sm",
}: PremiumBadgeProps): React.JSX.Element {
  const dim = size === "md" ? "h-7 w-7" : "h-5 w-5";
  return (
    <span
      className={cn("inline-flex shrink-0 text-primary", dim, className)}
      title="Receipt Premium — identity verified through an active subscription. Boosts, analytics, and marketplace perks apply."
      aria-label="Receipt Premium verified"
    >
      <BadgeCheck className="h-full w-full drop-shadow-[0_0_8px_hsl(43_96%_56%/0.45)]" />
    </span>
  );
}
