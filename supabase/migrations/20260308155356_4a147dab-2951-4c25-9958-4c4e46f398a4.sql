-- User exams table
CREATE TABLE public.user_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  date text NOT NULL,
  time text DEFAULT '09:00',
  grade text DEFAULT '',
  credits integer DEFAULT 3,
  teacher text DEFAULT '',
  room text DEFAULT '',
  type text DEFAULT 'exams',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own exams" ON public.user_exams FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own exams" ON public.user_exams FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own exams" ON public.user_exams FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own exams" ON public.user_exams FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- User routine table
CREATE TABLE public.user_routine (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day text NOT NULL,
  subject text NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  room text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_routine ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own routine" ON public.user_routine FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own routine" ON public.user_routine FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own routine" ON public.user_routine FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own routine" ON public.user_routine FOR DELETE TO authenticated USING (auth.uid() = user_id);