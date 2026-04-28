import { PendingRatingCard } from "@/components/ratings/PendingRatingCard";
import type { Database } from "@/types/database";

type RatingRow = Database["public"]["Tables"]["ratings"]["Row"];

interface ProfileOwnerPendingProps {
  viewerId: string;
  pending: RatingRow[];
  /** Map other participant id → username */
  usernames: Record<string, string>;
}

export function ProfileOwnerPending({
  viewerId,
  pending,
  usernames,
}: ProfileOwnerPendingProps): React.JSX.Element | null {
  if (pending.length === 0) return null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          Your open mutual receipts
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Only you see this block — finish your side or wait on the other person.
        </p>
      </div>
      <ul className="flex flex-col gap-4">
        {pending.map((r) => {
          const counterpartyId =
            r.rater_id === viewerId ? r.rated_id : r.rater_id;
          const un = usernames[counterpartyId] ?? "user";
          return (
            <li key={r.id}>
              <PendingRatingCard
                rating={r}
                viewerId={viewerId}
                counterpartyUsername={un}
                counterpartyId={counterpartyId}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
