"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import {
  FREE_TIER_ACTIVE_LISTING_LIMIT,
  isPremiumSubscription,
} from "@/lib/subscription";
import type { ListingCategory } from "@/types/database";

const listingCategorySchema = z.enum([
  "roommate",
  "selling",
  "gig",
  "dating",
  "other",
]);

const createListingSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(8000).optional().nullable(),
  category: listingCategorySchema,
  price: z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .optional()
    .transform((v) => {
      if (v === "" || v == null || v === undefined) return null;
      const n = typeof v === "string" ? Number.parseFloat(v) : Number(v);
      return Number.isFinite(n) && n >= 0 ? n : null;
    }),
  location: z.string().trim().max(200).optional().nullable(),
  images: z.array(z.string().url()).max(4).optional().default([]),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;

export type CreateListingResult =
  | { ok: true; listingId: string }
  | { ok: false; error: string };

export async function createListing(
  raw: CreateListingInput
): Promise<CreateListingResult> {
  const parsed = createListingSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().formErrors.join("; ") };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You must be signed in to post." };
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  const premium = isPremiumSubscription(me?.subscription_status);

  if (!premium) {
    const { count, error: cErr } = await supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "active");

    if (cErr) {
      return { ok: false, error: cErr.message };
    }
    const n = count ?? 0;
    if (n >= FREE_TIER_ACTIVE_LISTING_LIMIT) {
      return {
        ok: false,
        error: `Free accounts can have up to ${FREE_TIER_ACTIVE_LISTING_LIMIT} active listings. Upgrade to Receipt Premium for unlimited posts.`,
      };
    }
  }

  const body = parsed.data;
  const { data, error } = await supabase
    .from("listings")
    .insert({
      user_id: user.id,
      title: body.title,
      description: body.description || null,
      category: body.category as ListingCategory,
      price: body.price ?? null,
      location: body.location || null,
      status: "active",
      images: body.images,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  const { data: prof } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  if (prof?.username) {
    revalidatePath(`/profile/${prof.username}`);
  }

  revalidatePath("/feed");
  revalidatePath("/listings/new");
  revalidatePath(`/listings/${data.id}`);
  return { ok: true, listingId: data.id };
}
