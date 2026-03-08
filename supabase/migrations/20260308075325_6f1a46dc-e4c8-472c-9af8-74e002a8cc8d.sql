-- Drop the overly permissive authenticated select policy
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;

-- Users can only read their own profile
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);