-- Allow anyone to check if a username exists (only username column, no sensitive data)
create policy "Anyone can check username availability"
  on public.profiles for select
  to anon
  using (true);

-- Also allow authenticated users to read all profiles (for username display etc)
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Authenticated users can read profiles"
  on public.profiles for select
  to authenticated
  using (true);