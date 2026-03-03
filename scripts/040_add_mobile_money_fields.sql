-- Add mobile money fields to organization_settings
ALTER TABLE public.organization_settings
    ADD COLUMN IF NOT EXISTS mobile_money_provider text,
    ADD COLUMN IF NOT EXISTS mobile_money_name text,
    ADD COLUMN IF NOT EXISTS mobile_money_number text;
