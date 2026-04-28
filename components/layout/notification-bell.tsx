"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { markNotificationRead } from "@/app/actions/notifications";
import {
  notificationHref,
  notificationIcon,
  notificationSubtitle,
  notificationTitle,
  type NotificationRow,
} from "@/lib/notification-presentation";
import { useClickOutside } from "@/lib/use-click-outside";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NotificationBellProps = {
  userId: string;
};

export function NotificationBell({
  userId,
}: NotificationBellProps): React.JSX.Element {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const load = useCallback(async (): Promise<void> => {
    const [{ data: rows, error }, { count, error: cErr }] = await Promise.all([
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("read", false),
    ]);
    if (!error && rows) {
      setPreview(rows as NotificationRow[]);
    }
    if (!cErr && typeof count === "number") {
      setUnreadCount(count);
    }
  }, [supabase, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void load();
        }
      )
      .subscribe();

    const interval = window.setInterval(() => {
      void load();
    }, 30_000);

    return () => {
      void supabase.removeChannel(channel);
      window.clearInterval(interval);
    };
  }, [supabase, userId, load]);

  useClickOutside(panelRef, () => setOpen(false), open);

  async function onPreviewClick(n: NotificationRow): Promise<void> {
    setOpen(false);
    if (!n.read) {
      await markNotificationRead(n.id);
      void load();
    }
    router.push(notificationHref(n));
    router.refresh();
  }

  return (
    <div className="relative" ref={panelRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,22rem)] rounded-xl border border-border/80 bg-popover p-2 shadow-xl shadow-black/40 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-border/60 px-2 pb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Latest
            </p>
            <Link
              href="/notifications"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              View all
            </Link>
          </div>
          <ul className="max-h-80 overflow-y-auto py-1">
            {preview.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                You&apos;re all caught up — go stir up some Receipts.
              </li>
            ) : (
              preview.map((n) => {
                const Icon = notificationIcon(n);
                const unread = !n.read;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => void onPreviewClick(n)}
                      className={cn(
                        "flex w-full gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted/80",
                        unread && "bg-primary/5 ring-1 ring-primary/20"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/80 bg-background",
                          unread && "border-primary/40 bg-primary/10 text-primary"
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                          {notificationTitle(n)}
                        </span>
                        {notificationSubtitle(n) ? (
                          <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {notificationSubtitle(n)}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function BellIcon(props: React.SVGProps<SVGSVGElement>): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
