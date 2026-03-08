
DROP POLICY IF EXISTS "Users can delete own health reminder settings" ON public.health_reminder_settings;
DROP POLICY IF EXISTS "Users can insert own health reminder settings" ON public.health_reminder_settings;
DROP POLICY IF EXISTS "Users can read own health reminder settings" ON public.health_reminder_settings;
DROP POLICY IF EXISTS "Users can update own health reminder settings" ON public.health_reminder_settings;

CREATE POLICY "Users can read own health reminder settings"
ON public.health_reminder_settings FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health reminder settings"
ON public.health_reminder_settings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health reminder settings"
ON public.health_reminder_settings FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own health reminder settings"
ON public.health_reminder_settings FOR DELETE TO authenticated
USING (auth.uid() = user_id);
