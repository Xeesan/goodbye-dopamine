
-- Soft-delete the duplicate 'lend' entries (newer ones created by sync bug)
UPDATE public.user_debts SET deleted_at = now() WHERE id IN (
  '4e6cd276-84b7-45d0-a5ca-7a0abd33850a',
  '1745c819-b91b-48f7-bffc-6ebced43ae12',
  '029e9d4d-d9dc-4962-a05f-9750f1a488d9',
  'cb5b7739-af2f-47da-93dc-51db2985c7fd'
);

-- Fix the original entries: change debt_type from 'lend' to 'borrow'
UPDATE public.user_debts SET debt_type = 'borrow' WHERE id IN (
  'c6908dfa-a262-4343-bbc1-51a722282a00',
  '7b967f6f-f8f1-4f77-ad2b-2c159c539190',
  '577b1cf0-f613-4f24-9ce3-0d3420cb21b3',
  '808ddecd-5f20-49ca-aee7-a72e5a0da5c9'
)
