-- Stripe subscription + listing boosts + profile view analytics (premium).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS premium_boost_month_used text;

COMMENT ON COLUMN public.profiles.subscription_status IS 'free when unsubscribed; otherwise Stripe subscription.status (active, trialing, past_due, canceled, unpaid, etc).';
COMMENT ON COLUMN public.profiles.premium_boost_month_used IS 'YYYY-MM of the month the subscriber last used their included listing boost.';

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS boost_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS listings_active_boost_idx
  ON public.listings (boost_expires_at DESC NULLS LAST)
  WHERE status = 'active' AND boost_expires_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- profile_views: who viewed whose profile (premium owners read their rows)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT profile_views_no_self CHECK (profile_id <> viewer_id),
  CONSTRAINT profile_views_pair_unique UNIQUE (profile_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS profile_views_profile_created_idx
  ON public.profile_views (profile_id, created_at DESC);

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_views_insert_auth"
  ON public.profile_views
  FOR INSERT
  TO authenticated
  WITH CHECK (viewer_id = auth.uid() AND profile_id <> auth.uid());

CREATE POLICY "profile_views_update_own_viewer"
  ON public.profile_views
  FOR UPDATE
  TO authenticated
  USING (viewer_id = auth.uid())
  WITH CHECK (viewer_id = auth.uid());

CREATE POLICY "profile_views_select_owner"
  ON public.profile_views
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

COMMENT ON TABLE public.profile_views IS 'Latest view timestamp per (profile, viewer) pair; upserted via touch_profile_view.';

-- Upsert view row (SECURITY DEFINER so ON CONFLICT works under RLS for the viewer row)
CREATE OR REPLACE FUNCTION public.touch_profile_view(p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v uuid := auth.uid();
BEGIN
  IF v IS NULL OR v = p_profile_id THEN
    RETURN;
  END IF;

  INSERT INTO public.profile_views (profile_id, viewer_id)
  VALUES (p_profile_id, v)
  ON CONFLICT (profile_id, viewer_id) DO UPDATE
  SET created_at = timezone('utc', now());
END;
$$;

REVOKE ALL ON FUNCTION public.touch_profile_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_profile_view(uuid) TO authenticated;
