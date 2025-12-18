-- =================================================================
-- STRATA PROFIT ERP: ULTIMATE RLS RESCUE MISSION
-- Description: Standardizes all role-based security checks using a
--              SECURITY DEFINER function to break infinite recursion.
--              Drops all known recursive policies across all tables.
-- =================================================================

-- 0. ADD MISSING COLUMNS
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2) DEFAULT 0;

-- 1. DEFINE SECURE HELPER FUNCTION
-- Bypasses RLS by using SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. GLOBAL CLEANUP: DROP ALL POTENTIALLY RECURSIVE POLICIES
-- We drop by name across all tables to ensure a clean slate.

-- PROFILES
DROP POLICY IF EXISTS "Admins full access profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles access" ON public.profiles;
DROP POLICY IF EXISTS "Staff read all profiles" ON public.profiles;

-- TASKS
DROP POLICY IF EXISTS "Admins full access tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can update all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can delete all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks assigned to them" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks assigned to them or created by them" ON public.tasks;
DROP POLICY IF EXISTS "View tasks: assigned, created, or admin" ON public.tasks;
DROP POLICY IF EXISTS "View tasks" ON public.tasks;
DROP POLICY IF EXISTS "Staff manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team members can create pending tasks" ON public.tasks;

-- TIME LOGS
DROP POLICY IF EXISTS "Admins full access time_logs" ON public.time_logs;
DROP POLICY IF EXISTS "Admins can view all time logs" ON public.time_logs;
DROP POLICY IF EXISTS "Users can view their own time logs" ON public.time_logs;
DROP POLICY IF EXISTS "Users manage own time logs" ON public.time_logs;
DROP POLICY IF EXISTS "Admins view all time logs" ON public.time_logs;

-- PROJECTS
DROP POLICY IF EXISTS "Admins manage projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated view projects" ON public.projects;
DROP POLICY IF EXISTS "Team members view all projects" ON public.projects;

-- CLIENTS
DROP POLICY IF EXISTS "Staff manage clients" ON public.clients;
DROP POLICY IF EXISTS "VA manage clients" ON public.clients;
DROP POLICY IF EXISTS "Book keeper view clients" ON public.clients;
DROP POLICY IF EXISTS "Team view clients" ON public.clients;

-- DEALS
DROP POLICY IF EXISTS "VA manage deals" ON public.deals;
DROP POLICY IF EXISTS "Book keeper view deals" ON public.deals;
DROP POLICY IF EXISTS "Staff manage deals" ON public.deals;

-- INVOICES
DROP POLICY IF EXISTS "Admin/Bookkeeper manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "VA manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Finance manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "VA view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Book keeper manage invoices" ON public.invoices;

-- QUOTES
DROP POLICY IF EXISTS "Admin/VA manage quotes" ON public.quotes;
DROP POLICY IF EXISTS "Staff manage quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admin/VA manage quote items" ON public.quote_items;

-- 3. RE-IMPLEMENT CLEAN POLICIES (Using get_my_role())

-- PROFILES
CREATE POLICY "Users view own" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users update own" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Staff view all" ON profiles FOR SELECT USING (get_my_role() IN ('admin', 'book_keeper', 'virtual_assistant'));

-- TASKS
CREATE POLICY "Users select tasks" ON tasks FOR SELECT USING (auth.uid() = assigned_to OR auth.uid() = created_by OR get_my_role() IN ('admin', 'virtual_assistant'));
CREATE POLICY "Staff manage tasks" ON tasks FOR ALL USING (get_my_role() IN ('admin', 'virtual_assistant'));

-- TIME LOGS
CREATE POLICY "Users manage logs" ON time_logs FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins view logs" ON time_logs FOR SELECT USING (get_my_role() = 'admin');

-- CLIENTS
CREATE POLICY "Staff manage clients" ON clients FOR ALL USING (get_my_role() IN ('admin', 'book_keeper', 'virtual_assistant'));
CREATE POLICY "Team view clients" ON clients FOR SELECT USING (get_my_role() = 'team_member');

-- PROJECTS
CREATE POLICY "Auth view projects" ON projects FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage projects" ON projects FOR ALL USING (get_my_role() = 'admin');

-- DEALS
CREATE POLICY "Staff manage deals" ON deals FOR ALL USING (get_my_role() IN ('admin', 'virtual_assistant', 'book_keeper'));

-- INVOICES
CREATE POLICY "Finance manage invoices" ON invoices FOR ALL USING (get_my_role() IN ('admin', 'book_keeper'));
CREATE POLICY "VA view invoices" ON invoices FOR SELECT USING (get_my_role() = 'virtual_assistant');

-- QUOTES
CREATE POLICY "Staff manage quotes" ON quotes FOR ALL USING (get_my_role() IN ('admin', 'virtual_assistant', 'book_keeper'));
CREATE POLICY "Staff manage quote items" ON quote_items FOR ALL USING (get_my_role() IN ('admin', 'virtual_assistant', 'book_keeper'));

-- =================================================================
-- END OF RESCUE MISSION
-- =================================================================
