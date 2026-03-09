
-- 1. Fix profiles: Add a PERMISSIVE SELECT policy so the RESTRICTIVE one works correctly
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 2. Fix rate_limits: Drop the restrictive-only policy and add a proper deny-all permissive policy
DROP POLICY IF EXISTS "No direct access to rate_limits" ON public.rate_limits;
-- Create a permissive policy that denies all access (using false)
CREATE POLICY "No direct access to rate_limits"
  ON public.rate_limits
  FOR ALL
  TO authenticated, anon
  USING (false);

-- 3. Fix notifications insert: Only allow service_role to insert, not regular authenticated users
DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications"
  ON public.notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);
