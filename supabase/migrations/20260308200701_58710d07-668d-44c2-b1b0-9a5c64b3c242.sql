-- Rate limiting table for edge functions
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1,
  UNIQUE(user_id, function_name)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Function to check and increment rate limit atomically
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id uuid,
  p_function_name text,
  p_max_requests integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record rate_limits%ROWTYPE;
  v_window_start timestamptz;
BEGIN
  v_window_start := now() - (p_window_seconds || ' seconds')::interval;
  
  SELECT * INTO v_record
  FROM rate_limits
  WHERE user_id = p_user_id AND function_name = p_function_name
  FOR UPDATE;
  
  IF NOT FOUND THEN
    INSERT INTO rate_limits (user_id, function_name, window_start, request_count)
    VALUES (p_user_id, p_function_name, now(), 1)
    ON CONFLICT (user_id, function_name) DO NOTHING;
    RETURN true;
  END IF;
  
  IF v_record.window_start < v_window_start THEN
    UPDATE rate_limits
    SET window_start = now(), request_count = 1
    WHERE id = v_record.id;
    RETURN true;
  END IF;
  
  IF v_record.request_count >= p_max_requests THEN
    RETURN false;
  END IF;
  
  UPDATE rate_limits
  SET request_count = request_count + 1
  WHERE id = v_record.id;
  RETURN true;
END;
$$;