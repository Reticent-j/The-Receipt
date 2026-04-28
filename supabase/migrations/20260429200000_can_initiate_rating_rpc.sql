-- Lets any authenticated user ask whether they may start a rating toward `p_rated`
-- when that profile has who_can_rate = contacts_only (contacts are private under RLS).

CREATE OR REPLACE FUNCTION public.can_initiate_rating(p_rated uuid, p_rater uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN (SELECT who_can_rate FROM public.profiles WHERE id = p_rated) = 'contacts_only' THEN
      EXISTS (
        SELECT 1
        FROM public.contacts c
        WHERE c.user_id = p_rated
          AND c.matched_profile_id = p_rater
      )
    ELSE true
  END;
$$;

REVOKE ALL ON FUNCTION public.can_initiate_rating(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_initiate_rating(uuid, uuid) TO authenticated;
