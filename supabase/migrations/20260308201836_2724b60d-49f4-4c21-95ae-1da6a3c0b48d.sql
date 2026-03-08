
CREATE OR REPLACE FUNCTION public.increment_xp(delta integer)
 RETURNS TABLE(total_xp integer, level integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  new_total integer;
  new_level integer;
  base_xp integer := 100;
  scale numeric := 1.5;
  cumulative integer := 0;
  lvl integer := 1;
  needed integer;
  allowed boolean;
BEGIN
  IF delta IS NULL OR delta <= 0 OR delta > 100 THEN
    RAISE EXCEPTION 'Invalid XP delta: must be between 1 and 100';
  END IF;

  -- Rate limit: max 20 XP awards per 60 seconds per user
  SELECT public.check_rate_limit(auth.uid(), 'increment_xp', 20, 60) INTO allowed;
  IF NOT allowed THEN
    RAISE EXCEPTION 'Rate limit exceeded for XP awards. Try again shortly.';
  END IF;

  UPDATE user_gamification g
  SET total_xp = g.total_xp + delta,
      updated_at = now()
  WHERE g.user_id = auth.uid()
  RETURNING g.total_xp INTO new_total;

  LOOP
    needed := round(base_xp * power(scale, lvl - 1))::integer;
    IF cumulative + needed > new_total THEN
      EXIT;
    END IF;
    cumulative := cumulative + needed;
    lvl := lvl + 1;
  END LOOP;
  new_level := lvl;

  UPDATE user_gamification g
  SET level = new_level
  WHERE g.user_id = auth.uid();

  RETURN QUERY SELECT new_total, new_level;
END;
$$;
