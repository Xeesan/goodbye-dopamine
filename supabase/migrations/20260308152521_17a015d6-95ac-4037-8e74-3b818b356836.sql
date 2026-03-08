CREATE TABLE public.health_reminder_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reminder_id text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  interval_minutes integer NOT NULL,
  last_sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, reminder_id)
);

ALTER TABLE public.health_reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own health reminder settings"
  ON public.health_reminder_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health reminder settings"
  ON public.health_reminder_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health reminder settings"
  ON public.health_reminder_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own health reminder settings"
  ON public.health_reminder_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);