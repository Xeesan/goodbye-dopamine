
CREATE OR REPLACE FUNCTION public.increment_xp(delta integer)
RETURNS TABLE(total_xp integer, level integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_total integer;
  v_level integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF delta <= 0 OR delta > 100 THEN
    RAISE EXCEPTION 'Invalid XP delta';
  END IF;

  INSERT INTO public.user_gamification (user_id, total_xp, level)
  VALUES (v_user_id, delta, (delta / 100) + 1)
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_xp = user_gamification.total_xp + delta,
    level = ((user_gamification.total_xp + delta) / 100) + 1,
    updated_at = now()
  RETURNING user_gamification.total_xp, user_gamification.level
  INTO v_total, v_level;

  RETURN QUERY SELECT v_total, v_level;
END;
$$;
