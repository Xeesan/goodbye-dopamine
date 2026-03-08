-- Explicitly deny all direct access — only the security definer function should touch this table
CREATE POLICY "No direct access to rate_limits" ON public.rate_limits FOR ALL USING (false);