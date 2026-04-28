import {
  Briefcase,
  Handshake,
  Heart,
  Home,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { RelationshipType } from "@/types/database";

const REL_CONFIG: Record<
  RelationshipType,
  { label: string; Icon: LucideIcon }
> = {
  romantic: { label: "Romantic", Icon: Heart },
  roommate: { label: "Roommate", Icon: Home },
  coworker: { label: "Coworker", Icon: Briefcase },
  friend: { label: "Friend", Icon: UserRound },
  transaction: { label: "Transaction", Icon: Handshake },
};

interface ProfileRelationshipBadgesProps {
  types: RelationshipType[];
}

export function ProfileRelationshipBadges({
  types,
}: ProfileRelationshipBadgesProps): React.JSX.Element | null {
  const unique = Array.from(new Set(types));
  if (unique.length === 0) return null;

  return (
    <section className="rounded-3xl border border-border/80 bg-card/30 p-6 sm:p-8">
      <h2 className="mb-4 text-xl font-bold tracking-tight sm:text-2xl">
        Relationship context
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        They have completed ratings from these kinds of relationships.
      </p>
      <div className="flex flex-wrap gap-2">
        {unique.map((t) => {
          const cfg = REL_CONFIG[t];
          const Icon = cfg.Icon;
          return (
            <Badge
              key={t}
              variant="secondary"
              className="gap-1.5 border border-primary/25 bg-primary/10 py-1.5 pl-2 pr-3 text-foreground hover:bg-primary/15"
            >
              <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
              {cfg.label}
            </Badge>
          );
        })}
      </div>
    </section>
  );
}
