"use server";
/** Rating persistence + optional Edge hook — status: docs/RECEIPT_RATING_SYSTEM.md */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  publicScoresFromRaterData,
  reviewFromSideData,
  sidePayloadToJsonb,
  type SidePayload,
} from "@/lib/rating-dimensions";
import type { Database, RelationshipType } from "@/types/database";

type SupabaseServer = SupabaseClient<Database>;

type RatingRow = Database["public"]["Tables"]["ratings"]["Row"];

async function revalidateProfileById(
  supabase: SupabaseServer,
  profileId: string
): Promise<void> {
  const { data } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", profileId)
    .maybeSingle();
  if (data?.username) {
    revalidatePath(`/profile/${data.username}`);
  }
}

async function invokeNotifyEdge(
  accessToken: string,
  body: Record<string, unknown>
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return;

  try {
    await fetch(`${url}/functions/v1/notify-rating`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: anon,
      },
      body: JSON.stringify(body),
    });
  } catch {
    // Edge function may not be deployed; DB triggers still enqueue notifications.
  }
}

function finalizeIfBothReady(row: RatingRow): Pick<
  RatingRow,
  "scores" | "review_text" | "both_submitted"
> | null {
  if (!row.rater_submitted || !row.rated_submitted) return null;
  if (row.rater_score_data == null || row.rated_score_data == null) {
    return null;
  }
  const scores = publicScoresFromRaterData(row.rater_score_data);
  const review = reviewFromSideData(row.rater_score_data);
  return {
    scores,
    review_text: review,
    both_submitted: true,
  };
}

export type SubmitRatingResult =
  | { ok: true; ratingId: string; unlocked: boolean }
  | { ok: false; error: string };

/**
 * Persist one side of a mutual rating. Merges into public `scores` + unlock when both sides exist.
 */
export async function submitRatingSide(input: {
  counterpartyProfileId: string;
  /** Who you are rating (the other profile in the pair). */
  relationshipType: RelationshipType;
  payload: SidePayload;
}): Promise<SubmitRatingResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const me = user.id;
  const other = input.counterpartyProfileId;

  const { data: rows, error: fetchErr } = await supabase
    .from("ratings")
    .select("*")
    .or(
      `and(rater_id.eq.${me},rated_id.eq.${other}),and(rater_id.eq.${other},rated_id.eq.${me})`
    )
    .order("created_at", { ascending: false })
    .limit(1);

  if (fetchErr) {
    return { ok: false, error: fetchErr.message };
  }

  const row = rows?.[0] as RatingRow | undefined;
  if (!row) {
    return { ok: false, error: "No rating found. Start from the profile page." };
  }

  const jsonPayload = sidePayloadToJsonb(input.payload);
  const isRater = row.rater_id === me;

  if (isRater) {
    if (row.rater_submitted) {
      return { ok: false, error: "You already submitted your side as the initiator." };
    }

    const next: Database["public"]["Tables"]["ratings"]["Update"] = {
      relationship_type: input.relationshipType,
      rater_score_data: jsonPayload,
      rater_submitted: true,
    };

    const draft: RatingRow = {
      ...row,
      relationship_type: input.relationshipType,
      rater_score_data: jsonPayload,
      rater_submitted: true,
      rated_submitted: row.rated_submitted,
    };
    const fin = finalizeIfBothReady(draft);
    if (fin) {
      next.scores = fin.scores;
      next.review_text = fin.review_text;
      next.both_submitted = fin.both_submitted;
    }

    const { data: updated, error: upErr } = await supabase
      .from("ratings")
      .update(next)
      .eq("id", row.id)
      .select("id, both_submitted")
      .single();

    if (upErr || !updated) {
      return { ok: false, error: upErr?.message ?? "Update failed." };
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      await invokeNotifyEdge(session.access_token, {
        event: "rater_submitted",
        ratingId: row.id,
      });
    }

    revalidatePath("/ratings/pending");
    await revalidateProfileById(supabase, row.rated_id);
    revalidatePath(`/rate/${other}`);

    return {
      ok: true,
      ratingId: updated.id,
      unlocked: Boolean(updated.both_submitted),
    };
  }

  if (row.rated_id !== me) {
    return { ok: false, error: "You are not a participant in this rating." };
  }

  if (row.rated_submitted) {
    return { ok: false, error: "You already submitted your side." };
  }

  const next: Database["public"]["Tables"]["ratings"]["Update"] = {
    rated_score_data: jsonPayload,
    rated_submitted: true,
  };

  const draft: RatingRow = {
    ...row,
    rated_score_data: jsonPayload,
    rated_submitted: true,
  };
  const fin = finalizeIfBothReady(draft);
  if (fin) {
    next.scores = fin.scores;
    next.review_text = fin.review_text;
    next.both_submitted = fin.both_submitted;
  }

  const { data: updated, error: upErr } = await supabase
    .from("ratings")
    .update(next)
    .eq("id", row.id)
    .select("id, both_submitted")
    .single();

  if (upErr || !updated) {
    return { ok: false, error: upErr?.message ?? "Update failed." };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    await invokeNotifyEdge(session.access_token, {
      event: "rated_submitted",
      ratingId: row.id,
    });
  }

  revalidatePath("/ratings/pending");
  await revalidateProfileById(supabase, row.rated_id);
  revalidatePath(`/rate/${other}`);

  return {
    ok: true,
    ratingId: updated.id,
    unlocked: Boolean(updated.both_submitted),
  };
}
