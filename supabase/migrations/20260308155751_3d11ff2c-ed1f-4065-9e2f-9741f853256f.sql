-- User transactions table
CREATE TABLE public.user_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'expense',
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transactions" ON public.user_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.user_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON public.user_transactions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON public.user_transactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- User debts table
CREATE TABLE public.user_debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  debt_type text NOT NULL DEFAULT 'lend',
  person text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  description text DEFAULT '',
  date text DEFAULT '',
  settled boolean NOT NULL DEFAULT false,
  settled_date text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own debts" ON public.user_debts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own debts" ON public.user_debts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own debts" ON public.user_debts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own debts" ON public.user_debts FOR DELETE TO authenticated USING (auth.uid() = user_id);