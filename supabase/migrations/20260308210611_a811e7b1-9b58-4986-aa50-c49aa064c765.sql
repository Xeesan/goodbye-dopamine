
-- Create backups storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for backups bucket: users can only access their own backups
CREATE POLICY "Users can upload own backups"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'backups' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own backups"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'backups' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own backups"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'backups' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own backups"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'backups' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Add deleted_at columns for soft delete support
ALTER TABLE public.user_exams ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.user_routine ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.user_transactions ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.user_debts ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.task_reminders ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
