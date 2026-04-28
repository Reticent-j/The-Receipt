import { cn } from "@/lib/utils";
import {
  DIMENSION_LABELS,
  SCORE_DIMENSIONS,
  type DimensionAverages,
  type ScoreDimensionKey,
} from "@/lib/profile-scores";

function barTone(average: number): string {
  if (average < 5) return "from-red-500/90 to-red-400/70";
  if (average <= 7) return "from-amber-500 to-amber-300";
  return "from-emerald-500 to-emerald-400";
}

interface ProfileDimensionBarsProps {
  averages: DimensionAverages;
}

export function ProfileDimensionBars({
  averages,
}: ProfileDimensionBarsProps): React.JSX.Element | null {
  const keys = SCORE_DIMENSIONS.filter((k) => averages[k]?.count);
  if (keys.length === 0) return null;

  return (
    <section className="rounded-3xl border border-border/80 bg-card/30 p-6 sm:p-8">
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          Score breakdown
        </h2>
        <p className="text-sm text-muted-foreground">
          Averages from completed mutual ratings
        </p>
      </div>
      <ul className="space-y-5">
        {keys.map((key) => {
          const entry = averages[key]!;
          return (
            <li key={key}>
              <DimensionRow dimKey={key} average={entry.average} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function DimensionRow({
  dimKey,
  average,
}: {
  dimKey: ScoreDimensionKey;
  average: number;
}): React.JSX.Element {
  const pct = Math.min(100, (average / 10) * 100);
  const label = DIMENSION_LABELS[dimKey];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-primary">{average.toFixed(1)}/10</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-all",
            barTone(average)
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
