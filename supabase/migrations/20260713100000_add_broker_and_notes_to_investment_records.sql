-- Add broker and notes columns to investment_records table
ALTER TABLE public.investment_records ADD COLUMN IF NOT EXISTS broker TEXT;
ALTER TABLE public.investment_records ADD COLUMN IF NOT EXISTS notes TEXT;
