-- Fix 1: Revoke public access to check_rate_limit to prevent bypass and DoS
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer)
  FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer)
  TO service_role;

-- Fix 2: Add UPDATE policy for push_subscriptions
CREATE POLICY "Users can update own push subscriptions"
ON public.push_subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);