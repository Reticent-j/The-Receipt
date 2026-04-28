-- Allow public (anon) marketplace reads and completed ratings for profile pages.
-- Note: API responses still include rater_id; the app must not render it. Harden later with a SECURITY DEFINER view if needed.

CREATE POLICY "profiles_select_anon"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "listings_select_anon_active"
  ON public.listings
  FOR SELECT
  TO anon
  USING (status = 'active');

CREATE POLICY "ratings_select_anon_completed"
  ON public.ratings
  FOR SELECT
  TO anon
  USING (both_submitted = true);

CREATE POLICY "ratings_select_authenticated_completed_public"
  ON public.ratings
  FOR SELECT
  TO authenticated
  USING (both_submitted = true);
