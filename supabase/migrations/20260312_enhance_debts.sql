-- Migration: Add due_date and original_debt_id to user_debts
-- Description: Supports due dates for debts and tracking partial payments back to the original debt record.

ALTER TABLE "public"."user_debts"
ADD COLUMN "due_date" text NULL,
ADD COLUMN "original_debt_id" uuid NULL;

-- Add comment to the columns for Supabase documentation
COMMENT ON COLUMN "public"."user_debts"."due_date" IS 'Optional expected return date for the debt.';
COMMENT ON COLUMN "public"."user_debts"."original_debt_id" IS 'Links a partial payment settled record back to the original active debt ID.';
