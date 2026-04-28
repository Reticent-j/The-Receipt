import Link from "next/link";
import { TrendingUp, Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildMonthlyScoreTrend } from "@/lib/score-trend";
import type { Database } from "@/types/database";

type RatingRow = Database["public"]["Tables"]["ratings"]["Row"];

export type ProfileViewEntry = {
  username: string;
  viewedAt: string;
};

export function PremiumProfileInsights(props: {
  profileViews: ProfileViewEntry[];
  completedRatings: RatingRow[];
}): React.JSX.Element {
  const trend = buildMonthlyScoreTrend(props.completedRatings);
  const views = props.profileViews;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" aria-hidden />
            Who viewed you
          </CardTitle>
          <CardDescription>
            Premium-only visibility — recent visitors on your profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {views.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No views logged yet. Share your profile link and watch this fill
              up.
            </p>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
              {views.map((v) => (
                <li
                  key={`${v.username}-${v.viewedAt}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/50 px-3 py-2"
                >
                  <Link
                    href={`/profile/${encodeURIComponent(v.username)}`}
                    className="font-medium text-primary hover:underline"
                  >
                    @{v.username}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("en", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(v.viewedAt))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" aria-hidden />
            Score trend
          </CardTitle>
          <CardDescription>
            Average unlocked Receipt score by month (UTC).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trend.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Not enough completed ratings to chart yet — finish a few mutual
              receipts first.
            </p>
          ) : (
            <div className="flex h-36 items-end gap-2">
              {trend.map((p) => {
                const maxPx = 120;
                const hpx = Math.max(
                  10,
                  Math.round((p.average / 10) * maxPx)
                );
                return (
                  <div
                    key={p.month}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <div
                      className="w-full max-w-[2.5rem] rounded-t-md bg-gradient-to-t from-primary/80 to-amber-300/90"
                      style={{ height: `${hpx}px` }}
                      title={`${p.label}: ${p.average.toFixed(2)} /10 (${p.count} rating${p.count === 1 ? "" : "s"})`}
                    />
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {p.label.split(" ")[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
