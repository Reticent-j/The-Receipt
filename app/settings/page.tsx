import { redirect } from "next/navigation";

import { SettingsPageClient } from "@/app/settings/settings-page-client";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

function withSettingsDefaults(
  row: Database["public"]["Tables"]["profiles"]["Row"]
): ProfileRow {
  const r = row as Record<string, unknown>;
  return {
    ...row,
    sms_notify_new_rating: Boolean(r.sms_notify_new_rating ?? true),
    sms_notify_rating_unlocked: Boolean(
      r.sms_notify_rating_unlocked ?? true
    ),
    sms_notify_listing_inquiry: Boolean(r.sms_notify_listing_inquiry ?? true),
    sms_notify_new_message: Boolean(r.sms_notify_new_message ?? true),
    who_can_rate:
      r.who_can_rate === "contacts_only" ? "contacts_only" : "anyone",
    score_public: Boolean(r.score_public ?? true),
    stripe_customer_id:
      typeof r.stripe_customer_id === "string" ? r.stripe_customer_id : null,
    stripe_subscription_id:
      typeof r.stripe_subscription_id === "string"
        ? r.stripe_subscription_id
        : null,
    subscription_status:
      typeof r.subscription_status === "string"
        ? r.subscription_status
        : "free",
    subscription_current_period_end:
      typeof r.subscription_current_period_end === "string"
        ? r.subscription_current_period_end
        : null,
    premium_boost_month_used:
      typeof r.premium_boost_month_used === "string"
        ? r.premium_boost_month_used
        : null,
  };
}

export default async function SettingsPage(): Promise<React.JSX.Element> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-destructive">
        {error?.message ?? "Profile not found."}
      </div>
    );
  }

  return <SettingsPageClient profile={withSettingsDefaults(profile)} />;
}
