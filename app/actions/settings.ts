"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type UpdateProfileResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateProfileBasics(input: {
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}): Promise<UpdateProfileResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: input.full_name?.trim() || null,
      bio: input.bio?.trim() || null,
      avatar_url: input.avatar_url?.trim() || null,
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  const { data: row } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  if (row?.username) {
    revalidatePath(`/profile/${row.username}`);
  }
  revalidatePath("/settings");
  return { ok: true };
}

export async function updateSmsNotificationPrefs(input: {
  sms_notify_new_rating: boolean;
  sms_notify_rating_unlocked: boolean;
  sms_notify_listing_inquiry: boolean;
  sms_notify_new_message: boolean;
}): Promise<UpdateProfileResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      sms_notify_new_rating: input.sms_notify_new_rating,
      sms_notify_rating_unlocked: input.sms_notify_rating_unlocked,
      sms_notify_listing_inquiry: input.sms_notify_listing_inquiry,
      sms_notify_new_message: input.sms_notify_new_message,
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }
  revalidatePath("/settings");
  return { ok: true };
}

export async function updatePrivacyPrefs(input: {
  who_can_rate: "anyone" | "contacts_only";
  score_public: boolean;
}): Promise<UpdateProfileResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      who_can_rate: input.who_can_rate,
      score_public: input.score_public,
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  const { data: row } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  if (row?.username) {
    revalidatePath(`/profile/${row.username}`);
  }
  revalidatePath("/settings");
  return { ok: true };
}

export async function updateAccountEmail(
  newEmail: string
): Promise<UpdateProfileResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Unauthorized" };
  }

  const email = newEmail.trim();
  if (!email) {
    return { ok: false, error: "Email is required." };
  }

  const { error } = await supabase.auth.updateUser({ email });
  if (error) {
    return { ok: false, error: error.message };
  }
  revalidatePath("/settings");
  return { ok: true };
}

export async function updateAccountPassword(input: {
  newPassword: string;
}): Promise<UpdateProfileResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Unauthorized" };
  }

  if (input.newPassword.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const { error } = await supabase.auth.updateUser({
    password: input.newPassword,
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
