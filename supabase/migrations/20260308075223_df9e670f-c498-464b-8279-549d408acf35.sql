-- Drop the overly permissive anonymous select policy
DROP POLICY IF EXISTS "Anyone can check username availability" ON public.profiles;

-- Create a secure function for username availability check
CREATE OR REPLACE FUNCTION public.check_username_available(desired_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE username = desired_username
  );
$$;