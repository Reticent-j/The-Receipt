"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function markNotificationRead(id: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/notifications");
  revalidatePath("/feed");
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/notifications");
  revalidatePath("/feed");
  return { ok: true };
}
