import { ListingCard } from "@/components/listings/ListingCard";
import type { Database } from "@/types/database";

type ListingRow = Database["public"]["Tables"]["listings"]["Row"];
type PosterRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  | "id"
  | "username"
  | "full_name"
  | "avatar_url"
  | "overall_score"
  | "total_ratings"
  | "subscription_status"
>;

interface ProfileListingsGridProps {
  listings: ListingRow[];
  poster: PosterRow;
}

export function ProfileListingsGrid({
  listings,
  poster,
}: ProfileListingsGridProps): React.JSX.Element {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          Active listings
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Open marketplace posts from this profile.
        </p>
      </div>
      {listings.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/80 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
          No active listings right now.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <li key={listing.id}>
              <ListingCard listing={listing} poster={poster} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
