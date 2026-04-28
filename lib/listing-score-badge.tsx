import { cn } from "@/lib/utils";
import { scoreGlowClass, scoreIndicatorClass } from "@/lib/profile-scores";

interface ReceiptScoreBadgeProps {
  score: number;
  /** Larger variant for hero areas */
  size?: "md" | "lg" | "xl";
  className?: string;
}

/**
 * Non-negotiable Receipt score pill — color bands: &lt;5 red, 5–7 amber, &gt;7 green.
 */
export function ReceiptScoreBadge({
  score,
  size = "md",
  className,
}: ReceiptScoreBadgeProps): React.JSX.Element {
  const label =
    score > 0 && Number.isFinite(score) ? score.toFixed(1) : "—";
  const color = scoreIndicatorClass(score);
  const glow = scoreGlowClass(score);

  const sizeCls =
    size === "xl"
      ? "min-w-[4.5rem] px-4 py-2 text-3xl sm:text-4xl"
      : size === "lg"
        ? "min-w-[3.75rem] px-3 py-1.5 text-2xl sm:text-3xl"
        : "min-w-[2.75rem] px-2.5 py-1 text-lg sm:text-xl";

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center justify-center rounded-xl border-2 border-primary/50 bg-background/95 font-black tabular-nums leading-none shadow-lg backdrop-blur-sm",
        sizeCls,
        color,
        glow,
        className
      )}
      aria-label={`Receipt score ${label} out of 10`}
    >
      <span>{label}</span>
      <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        /10
      </span>
    </div>
  );
}
