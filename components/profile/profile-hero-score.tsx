import { cn } from "@/lib/utils";
import {
  headlineScoreOutOf10,
  scoreGlowClass,
  scoreIndicatorClass,
  type DimensionAverages,
} from "@/lib/profile-scores";

interface ProfileHeroScoreProps {
  profileOverall: number;
  dimensionAverages: DimensionAverages;
  /** When true, visitors see a curiosity teaser instead of the numeric score. */
  lockedForVisitor?: boolean;
}

export function ProfileHeroScore({
  profileOverall,
  dimensionAverages,
  lockedForVisitor = false,
}: ProfileHeroScoreProps): React.JSX.Element {
  const score = headlineScoreOutOf10(profileOverall, dimensionAverages);
  const colorClass = scoreIndicatorClass(score);
  const glow = scoreGlowClass(score);

  if (lockedForVisitor) {
    return (
      <div
        className={cn(
          "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/40 bg-gradient-to-b from-muted/40 via-background to-background px-6 py-10 sm:px-10 sm:py-12",
          "shadow-lg shadow-black/20"
        )}
      >
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Private Receipt
        </p>
        <p className="mt-4 max-w-xs text-center text-2xl font-black leading-tight text-foreground sm:text-3xl">
          Score hidden
        </p>
        <p className="mt-3 max-w-sm text-center text-sm text-muted-foreground">
          They&apos;re keeping the number close — mutual ratings still happen,
          but you don&apos;t get the digit until they say so.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-2xl border-2 border-primary/50 bg-gradient-to-b from-primary/15 via-background to-background px-6 py-8 sm:px-10 sm:py-10",
        "shadow-2xl shadow-primary/10",
        glow
      )}
    >
      <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        Receipt score
      </p>
      <div className="mt-2 flex items-baseline justify-center gap-1">
        <span
          className={cn(
            "text-7xl font-black tabular-nums tracking-tighter sm:text-8xl md:text-9xl",
            colorClass
          )}
        >
          {score.toFixed(1)}
        </span>
        <span className="text-2xl font-bold text-muted-foreground sm:text-3xl">
          /10
        </span>
      </div>
      <div
        className={cn(
          "mt-4 h-2 w-full max-w-xs rounded-full bg-muted",
          "ring-2 ring-primary/30"
        )}
        aria-hidden
      >
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r from-primary via-amber-300 to-amber-200 transition-all",
            score <= 0 && "w-0"
          )}
          style={{ width: `${Math.min(100, (score / 10) * 100)}%` }}
        />
      </div>
    </div>
  );
}
