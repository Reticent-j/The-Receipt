-- Profile: SMS toggles per notification type, privacy (who can rate, score visibility).
-- Realtime: notifications table for live bell updates.
-- Triggers: richer metadata for UI (relationship_type on unlock).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sms_notify_new_rating boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_notify_rating_unlocked boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_notify_listing_inquiry boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_notify_new_message boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS who_can_rate text NOT NULL DEFAULT 'anyone'
    CHECK (who_can_rate IN ('anyone', 'contacts_only')),
  ADD COLUMN IF NOT EXISTS score_public boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.who_can_rate IS 'anyone: open ratings; contacts_only: only matched contacts may initiate.';
COMMENT ON COLUMN public.profiles.score_public IS 'When false, overall_score may be hidden from non-participants (app-enforced; optional future).';

-- Realtime for in-app notification bell (Supabase projects expose supabase_realtime).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END;
  END IF;
END $$;

-- Include relationship_type in unlock notification metadata for display copy
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
    jsonb_build_object(
      'rating_id', NEW.id,
      'relationship_type', NEW.relationship_type::text
    )
  );

  PERFORM public.enqueue_rating_notification(
    NEW.rater_id,
    'rating_unlocked'::public.notification_type,
    'A mutual rating with you just unlocked — both receipts are in.',
    jsonb_build_object(
      'rating_id', NEW.id,
      'relationship_type', NEW.relationship_type::text
    )
  );

  RETURN NEW;
END;
$$;

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
      jsonb_build_object(
        'rating_id', NEW.id,
        'from_user_id', NEW.rater_id,
        'relationship_type', NEW.relationship_type::text
      )
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
      jsonb_build_object(
        'rating_id', NEW.id,
        'from_user_id', NEW.rated_id,
        'relationship_type', NEW.relationship_type::text
      )
    );
  END IF;

  RETURN NEW;
END;
$$;
