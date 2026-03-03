-- Create organization_settings table
CREATE TABLE IF NOT EXISTS public.organization_settings (
    id serial PRIMARY KEY,
    name text NOT NULL DEFAULT 'StrataForge Business Suite',
    logo_url text,
    address text,
    phone text,
    email text DEFAULT 'contact@strataforge.com',
    website text,
    tax_id text,
    bank_name text DEFAULT 'FNB Zambia',
    bank_account text DEFAULT '6655443322',
    bank_branch text DEFAULT 'Lusaka Main',
    updated_at timestamp with time zone DEFAULT now()
);

-- Insert a default row if not exists
INSERT INTO public.organization_settings (id) 
VALUES (1) 
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- Admins can update
CREATE POLICY "Admins can update organization settings"
    ON public.organization_settings FOR UPDATE
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Everyone authenticated can view
CREATE POLICY "Authenticated users can view organization settings"
    ON public.organization_settings FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Create a storage bucket for company logos if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for company-logos bucket
-- Admins can insert/update/delete
CREATE POLICY "Admins can manage company logos"
ON storage.objects FOR ALL
USING (
    bucket_id = 'company-logos' 
    AND (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
)
WITH CHECK (
    bucket_id = 'company-logos' 
    AND (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
);

-- Everyone can view company logos
CREATE POLICY "Anyone can view company logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');
