-- ============================================================
-- Migration: Add user_books, user_semesters, user_focus_sessions
-- ============================================================

-- ── user_books ──────────────────────────────────────────────
CREATE TABLE public.user_books (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  author text DEFAULT '',
  genre text DEFAULT 'Fiction',
  status text DEFAULT 'reading',
  pages integer DEFAULT 0,
  current_page integer DEFAULT 0,
  rating integer DEFAULT 0,
  notes_text text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone DEFAULT NULL
);

ALTER TABLE public.user_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own books" ON public.user_books FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own books" ON public.user_books FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own books" ON public.user_books FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own books" ON public.user_books FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── user_semesters ──────────────────────────────────────────
CREATE TABLE public.user_semesters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  courses jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone DEFAULT NULL
);

ALTER TABLE public.user_semesters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own semesters" ON public.user_semesters FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own semesters" ON public.user_semesters FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own semesters" ON public.user_semesters FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own semesters" ON public.user_semesters FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── user_focus_sessions ─────────────────────────────────────
CREATE TABLE public.user_focus_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date text NOT NULL,
  duration integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone DEFAULT NULL
);

ALTER TABLE public.user_focus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own focus sessions" ON public.user_focus_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own focus sessions" ON public.user_focus_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own focus sessions" ON public.user_focus_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own focus sessions" ON public.user_focus_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);
