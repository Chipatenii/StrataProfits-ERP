-- Migration: 032_add_client_portal_auth
-- Description: Extends profiles to allow a "client" role and maps them to a specific client_id.

-- 1. Modify the role check constraint to allow 'client'
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'team_member', 'virtual_assistant', 'developer', 'social_media_manager', 'book_keeper', 'marketing', 'sales', 'graphic_designer', 'client'));

-- 2. Add client_id column linking directly to the existing public.clients table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_client_id ON public.profiles(client_id);

-- 3. Enhance RLS Policies for the Client Role

-- Clients can view projects assigned to your company
CREATE POLICY "Clients can view their own projects"
  ON public.projects
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM public.profiles WHERE id = auth.uid() AND role = 'client'
    )
  );

-- Clients can view deliverables for their projects
CREATE POLICY "Clients can view their own deliverables"
  ON public.deliverables
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE client_id IN (
        SELECT client_id FROM public.profiles WHERE id = auth.uid() AND role = 'client'
      )
    )
  );

-- Clients can view their invoices
CREATE POLICY "Clients can view their own invoices"
  ON public.invoices
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM public.profiles WHERE id = auth.uid() AND role = 'client'
    )
  );

-- Clients can view their quotes
CREATE POLICY "Clients can view their own quotes"
  ON public.quotes
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM public.profiles WHERE id = auth.uid() AND role = 'client'
    )
  );

-- Clients can view their own profile (Supabase auth necessity)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Clients can view their own profile'
  ) THEN
    CREATE POLICY "Clients can view their own profile"
      ON public.profiles
      FOR SELECT
      USING (id = auth.uid() AND role = 'client');
  END IF;
END
$$;
