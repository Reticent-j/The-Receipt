-- The Receipt — initial schema
-- Run via Supabase CLI: supabase db push / supabase migration up
-- Or paste into SQL Editor in the dashboard.

-- ---------------------------------------------------------------------------
-- Extensions (gen_random_uuid lives in pgcrypto; Supabase enables it by default)
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE public.listing_category AS ENUM (
  'roommate',
  'selling',
  'gig',
  'dating',
  'other'
);

CREATE TYPE public.listing_status AS ENUM (
  'active',
  'closed',
  'pending'
);

CREATE TYPE public.relationship_type AS ENUM (
  'romantic',
  'roommate',
  'coworker',
  'friend',
  'transaction'
);

CREATE TYPE public.notification_type AS ENUM (
  'new_rating',
  'rating_unlocked',
  'new_message',
  'listing_inquiry'
);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  username text NOT NULL,
  full_name text,
  avatar_url text,
  bio text,
  phone_number text,
  overall_score numeric NOT NULL DEFAULT 0,
  total_ratings integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT profiles_username_unique UNIQUE (username),
  CONSTRAINT profiles_phone_number_unique UNIQUE (phone_number),
  CONSTRAINT profiles_total_ratings_non_negative CHECK (total_ratings >= 0)
);

CREATE INDEX profiles_username_lower_idx ON public.profiles (lower(username));

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.profiles IS 'Public user profiles; overall_score is derived from received ratings.';
COMMENT ON COLUMN public.profiles.overall_score IS 'Calculated average of all received ratings (maintain via app or trigger).';
COMMENT ON COLUMN public.profiles.total_ratings IS 'Count of completed mutual ratings received.';

-- ---------------------------------------------------------------------------
-- listings
-- ---------------------------------------------------------------------------
CREATE TABLE public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category public.listing_category NOT NULL,
  price numeric,
  location text,
  status public.listing_status NOT NULL DEFAULT 'active',
  images text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX listings_user_id_idx ON public.listings (user_id);
CREATE INDEX listings_status_idx ON public.listings (status);
CREATE INDEX listings_category_idx ON public.listings (category);
CREATE INDEX listings_created_at_idx ON public.listings (created_at DESC);

CREATE TRIGGER listings_set_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ratings (double-blind mutual ratings)
-- ---------------------------------------------------------------------------
CREATE TABLE public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rater_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  rated_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  relationship_type public.relationship_type NOT NULL,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  review_text text,
  rater_submitted boolean NOT NULL DEFAULT false,
  rated_submitted boolean NOT NULL DEFAULT false,
  rater_score_data jsonb,
  rated_score_data jsonb,
  both_submitted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT ratings_distinct_participants CHECK (rater_id <> rated_id),
  CONSTRAINT ratings_both_submitted_consistency CHECK (
    (both_submitted = true AND rater_submitted = true AND rated_submitted = true)
    OR (both_submitted = false)
  )
);

CREATE INDEX ratings_rater_id_idx ON public.ratings (rater_id);
CREATE INDEX ratings_rated_id_idx ON public.ratings (rated_id);
CREATE INDEX ratings_both_submitted_idx ON public.ratings (both_submitted);
CREATE INDEX ratings_created_at_idx ON public.ratings (created_at DESC);

CREATE TRIGGER ratings_set_updated_at
  BEFORE UPDATE ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON COLUMN public.ratings.scores IS 'Aggregated or final dimension scores when unlocked.';
COMMENT ON COLUMN public.ratings.rater_score_data IS 'Hidden partial submission from rater until both submit.';
COMMENT ON COLUMN public.ratings.rated_score_data IS 'Hidden partial submission from rated until both submit.';

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  content text,
  read boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX notifications_user_id_created_at_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX notifications_user_unread_idx ON public.notifications (user_id) WHERE read = false;

-- ---------------------------------------------------------------------------
-- contacts
-- ---------------------------------------------------------------------------
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  contact_phone text,
  contact_name text,
  matched_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX contacts_user_id_idx ON public.contacts (user_id);
CREATE INDEX contacts_contact_phone_idx ON public.contacts (contact_phone)
  WHERE contact_phone IS NOT NULL;
CREATE INDEX contacts_matched_profile_id_idx ON public.contacts (matched_profile_id)
  WHERE matched_profile_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- profiles: anyone authenticated can read (marketplace); users manage own row
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_own"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- listings: readable by authenticated users; owners full CRUD
CREATE POLICY "listings_select_authenticated"
  ON public.listings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "listings_insert_own"
  ON public.listings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid())
  );

CREATE POLICY "listings_update_own"
  ON public.listings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "listings_delete_own"
  ON public.listings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ratings: only rater or rated can see / mutate
CREATE POLICY "ratings_select_participant"
  ON public.ratings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = rater_id OR auth.uid() = rated_id);

-- Only the initiating party may create a row as rater (prevents forging someone else as rater_id).
CREATE POLICY "ratings_insert_as_rater"
  ON public.ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = rater_id);

CREATE POLICY "ratings_update_participant"
  ON public.ratings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = rater_id OR auth.uid() = rated_id)
  WITH CHECK (auth.uid() = rater_id OR auth.uid() = rated_id);

CREATE POLICY "ratings_delete_participant"
  ON public.ratings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = rater_id OR auth.uid() = rated_id);

-- notifications: read/update/delete own rows only (no INSERT for authenticated — use service role / Edge Functions / triggers).
CREATE POLICY "notifications_select_own"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_delete_own"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.notifications IS 'Inserts from clients are denied by RLS; insert via service_role, database triggers, or SECURITY DEFINER functions.';

-- contacts: owner only
CREATE POLICY "contacts_select_own"
  ON public.contacts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "contacts_insert_own"
  ON public.contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contacts_update_own"
  ON public.contacts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contacts_delete_own"
  ON public.contacts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Grants (tables in public; Supabase exposes to authenticated + anon as needed)
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Enum types for client introspection
GRANT USAGE ON TYPE public.listing_category TO authenticated, service_role;
GRANT USAGE ON TYPE public.listing_status TO authenticated, service_role;
GRANT USAGE ON TYPE public.relationship_type TO authenticated, service_role;
GRANT USAGE ON TYPE public.notification_type TO authenticated, service_role;
