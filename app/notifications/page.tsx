import { redirect } from "next/navigation";

import { NotificationsFeed } from "@/app/notifications/notifications-feed";
import { createClient } from "@/lib/supabase/server";
import type { NotificationRow } from "@/lib/notification-presentation";

export const dynamic = "force-dynamic";

export default async function NotificationsPage(): Promise<React.JSX.Element> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/notifications");
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-destructive">
        {error.message}
      </div>
    );
  }

  return <NotificationsFeed initial={(data ?? []) as NotificationRow[]} />;
}
