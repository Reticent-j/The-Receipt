import type { LucideIcon } from "lucide-react";
import {
  Eye,
  Lock,
  MessageCircle,
  Sparkles,
  Store,
} from "lucide-react";

import type { Database, RelationshipType } from "@/types/database";

export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

function meta(n: NotificationRow): Record<string, unknown> {
  return (n.metadata && typeof n.metadata === "object"
    ? (n.metadata as Record<string, unknown>)
    : {}) as Record<string, unknown>;
}

/** Human phrase for unlock / curiosity copy, e.g. "a friend". */
export function relationshipPhraseForCopy(
  raw: string | undefined
): string {
  const t = (raw ?? "").toLowerCase() as RelationshipType | "";
  const map: Record<string, string> = {
    romantic: "a romantic connection",
    roommate: "a roommate",
    coworker: "a coworker",
    friend: "a friend",
    transaction: "someone you transacted with",
  };
  return map[t] ?? "someone you know";
}

export function notificationTitle(n: NotificationRow): string {
  const m = meta(n);
  const relRaw =
    typeof m.relationship_type === "string" ? m.relationship_type : undefined;
  const phrase = relationshipPhraseForCopy(relRaw);

  switch (n.type) {
    case "new_rating":
      return "Someone left you a Receipt — submit yours to unlock it 🔒";
    case "rating_unlocked":
      return `Your Receipt with ${phrase} just unlocked 👀`;
    case "listing_inquiry": {
      const name =
        typeof m.inquirer_name === "string" && m.inquirer_name.trim()
          ? m.inquirer_name.trim()
          : "Someone";
      return `${name} is interested in your listing`;
    }
    case "new_message":
      return "You have a new message";
    default:
      return n.content?.trim() || "Something new on The Receipt";
  }
}

/** Subline when we want extra urgency beyond the DB `content` field. */
export function notificationSubtitle(n: NotificationRow): string | null {
  switch (n.type) {
    case "new_rating":
      return "They went first. Your move — or you’ll wonder what they wrote.";
    case "rating_unlocked":
      return "Both sides are live. Open it now while the adrenaline’s honest.";
    case "listing_inquiry":
      return "Reply before they move on to the next listing.";
    case "new_message":
      return "Silence is louder than you think — check it.";
    default:
      return null;
  }
}

export function notificationIcon(n: NotificationRow): LucideIcon {
  switch (n.type) {
    case "new_rating":
      return Lock;
    case "rating_unlocked":
      return Eye;
    case "listing_inquiry":
      return Store;
    case "new_message":
      return MessageCircle;
    default:
      return Sparkles;
  }
}

export function notificationHref(n: NotificationRow): string {
  const m = meta(n);
  switch (n.type) {
    case "new_rating": {
      const from = m.from_user_id;
      return typeof from === "string" ? `/rate/${from}` : "/ratings/pending";
    }
    case "rating_unlocked":
      return "/ratings/pending";
    case "listing_inquiry": {
      const lid = m.listing_id;
      return typeof lid === "string" ? `/listings/${lid}` : "/feed";
    }
    case "new_message":
      return "/messages";
    default:
      return "/notifications";
  }
}
