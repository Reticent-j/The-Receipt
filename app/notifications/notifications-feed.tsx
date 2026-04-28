"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/notifications";
import {
  notificationHref,
  notificationIcon,
  notificationSubtitle,
  notificationTitle,
  type NotificationRow,
} from "@/lib/notification-presentation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NotificationsFeedProps = {
  initial: NotificationRow[];
};

export function NotificationsFeed({
  initial,
}: NotificationsFeedProps): React.JSX.Element {
  const router = useRouter();
  const [markingAll, setMarkingAll] = useState(false);

  async function markAllRead(): Promise<void> {
    setMarkingAll(true);
    try {
      const res = await markAllNotificationsRead();
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every ping is someone moving on you — don&apos;t let curiosity go
            cold.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 border-primary/40"
          disabled={markingAll || initial.every((n) => n.read)}
          onClick={() => void markAllRead()}
        >
          Mark all as read
        </Button>
      </div>

      <ul className="space-y-2">
        {initial.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-border/80 bg-muted/10 px-6 py-16 text-center text-sm text-muted-foreground">
            Nothing here yet. When someone touches your Receipt, it shows up
            first — make sure you&apos;re not missing the fun.
          </li>
        ) : (
          initial.map((n) => {
            const Icon = notificationIcon(n);
            const href = notificationHref(n);
            const unread = !n.read;
            const sub = notificationSubtitle(n);
            return (
              <li key={n.id}>
                <Link
                  href={href}
                  onClick={() => {
                    if (unread) {
                      void markNotificationRead(n.id).then(() =>
                        router.refresh()
                      );
                    }
                  }}
                  className={cn(
                    "flex gap-4 rounded-2xl border px-4 py-4 transition-colors hover:bg-muted/30",
                    unread
                      ? "border-primary/35 bg-primary/[0.07] shadow-sm shadow-primary/5"
                      : "border-border/60 bg-card/40"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-background",
                      unread && "border-primary/40 bg-primary/10 text-primary"
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-snug text-foreground">
                      {notificationTitle(n)}
                    </span>
                    {sub ? (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {sub}
                      </span>
                    ) : null}
                    <span className="mt-2 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
                      {formatWhen(n.created_at)}
                    </span>
                  </span>
                  {unread ? (
                    <span className="flex shrink-0 items-start pt-1">
                      <span className="h-2 w-2 rounded-full bg-primary shadow-sm shadow-primary/60" />
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}
