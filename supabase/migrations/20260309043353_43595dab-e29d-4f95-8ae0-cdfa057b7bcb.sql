
-- 1. Block anon SELECT on profiles explicitly
CREATE POLICY "Anon cannot read profiles"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (false);

-- 2. Add explicit DELETE policy scoped to own profile
CREATE POLICY "Users can delete own profile"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);
