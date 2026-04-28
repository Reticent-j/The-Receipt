-- Double-blind rating: profile recalculation, notifications, pair uniqueness.
-- App merges partial jsonb into scores when both sides submit (see server actions).
-- See docs/RECEIPT_RATING_SYSTEM.md.

CREATE UNIQUE INDEX IF NOT EXISTS ratings_rater_rated_unique
  ON public.ratings (rater_id, rated_id);

CREATE OR REPLACE FUNCTION public.avg_dimension_scores(j jsonb)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT AVG(v)::numeric
  FROM (
    SELECT (j ->> k)::numeric AS v
    FROM unnest(
      ARRAY[
        'reliability',
        'communication',
        'respect',
        'effort',
        'character'
      ]
    ) AS k
    WHERE (j ->> k) IS NOT NULL
      AND (j ->> k) <> ''
      AND (j ->> k) ~ '^[0-9]+(\.[0-9]+)?$'
  ) s;
$$;

CREATE OR REPLACE FUNCTION public.calculate_profile_scores(p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_overall numeric;
BEGIN
  SELECT
    COUNT(*)::integer,
    COALESCE(AVG(public.avg_dimension_scores(scores)), 0)::numeric
  INTO v_total, v_overall
  FROM public.ratings
  WHERE rated_id = p_profile_id
    AND both_submitted = true
    AND scores IS NOT NULL
    AND scores <> '{}'::jsonb;

  UPDATE public.profiles
  SET
    overall_score = COALESCE(v_overall, 0),
    total_ratings = COALESCE(v_total, 0),
    updated_at = timezone('utc', now())
  WHERE id = p_profile_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_rating_notification(
  p_user_id uuid,
  p_type public.notification_type,
  p_content text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, content, metadata)
  VALUES (p_user_id, p_type, p_content, COALESCE(p_metadata, '{}'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_ratings_on_unlock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT NEW.both_submitted THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.both_submitted = true THEN
    RETURN NEW;
  END IF;

  PERFORM public.calculate_profile_scores(NEW.rated_id);

  PERFORM public.enqueue_rating_notification(
    NEW.rated_id,
    'rating_unlocked'::public.notification_type,
    'A mutual rating with you just unlocked — both receipts are in.',
    jsonb_build_object('rating_id', NEW.id)
  );

  PERFORM public.enqueue_rating_notification(
    NEW.rater_id,
    'rating_unlocked'::public.notification_type,
    'A mutual rating with you just unlocked — both receipts are in.',
    jsonb_build_object('rating_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ratings_on_unlock_recalc ON public.ratings;

CREATE TRIGGER ratings_on_unlock_recalc
  AFTER INSERT OR UPDATE OF both_submitted
  ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_ratings_on_unlock();

CREATE OR REPLACE FUNCTION public.trg_ratings_partial_submit_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.both_submitted THEN
    RETURN NEW;
  END IF;

  IF NEW.rater_submitted = true
     AND (TG_OP = 'INSERT' OR OLD.rater_submitted IS DISTINCT FROM true)
  THEN
    PERFORM public.enqueue_rating_notification(
      NEW.rated_id,
      'new_rating'::public.notification_type,
      'Someone submitted their side of a mutual rating. Add yours to unlock both receipts.',
      jsonb_build_object('rating_id', NEW.id, 'from_user_id', NEW.rater_id)
    );
  END IF;

  IF NEW.rated_submitted = true
     AND (TG_OP = 'INSERT' OR OLD.rated_submitted IS DISTINCT FROM true)
     AND NEW.rater_submitted = true
  THEN
    PERFORM public.enqueue_rating_notification(
      NEW.rater_id,
      'new_rating'::public.notification_type,
      'The other person submitted their receipt. Add yours to unlock both scores.',
      jsonb_build_object('rating_id', NEW.id, 'from_user_id', NEW.rated_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ratings_partial_submit_notify ON public.ratings;

CREATE TRIGGER ratings_partial_submit_notify
  AFTER INSERT OR UPDATE OF rater_submitted, rated_submitted
  ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_ratings_partial_submit_notify();
