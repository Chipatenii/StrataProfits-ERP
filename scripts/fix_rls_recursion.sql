-- =================================================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- Description: Standardizes all role-based security checks using a
--              SECURITY DEFINER function to prevent circular 
--              references to the profiles table.
-- =================================================================

-- 0. ADD MISSING COLUMNS
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2) DEFAULT 0;

-- 1. REDEFINE ROLE HELPER FUNCTION
-- Bypasses RLS by using SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. DROP POTENTIALLY RECURSIVE POLICIES
-- Profiles
DROP POLICY IF EXISTS "Admins view all profiles" ON profiles;
DROP POLICY IF EXISTS "Staff view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins full access profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Tasks
DROP POLICY IF EXISTS "Users can view tasks assigned to them" ON tasks;
DROP POLICY IF EXISTS "Users can view tasks assigned to them or created by them" ON tasks;
DROP POLICY IF EXISTS "Admins can view all tasks" ON tasks;
DROP POLICY IF EXISTS "View tasks" ON tasks;
DROP POLICY IF EXISTS "Users view tasks" ON tasks;
DROP POLICY IF EXISTS "Staff manage tasks" ON tasks;

-- Clients
DROP POLICY IF EXISTS "Staff manage clients" ON clients;
DROP POLICY IF EXISTS "Book keeper view clients" ON clients;
DROP POLICY IF EXISTS "VA manage clients" ON clients;
DROP POLICY IF EXISTS "Team view clients" ON clients;

-- Projects
DROP POLICY IF EXISTS "Authenticated view projects" ON projects;
DROP POLICY IF EXISTS "Admins manage projects" ON projects;
DROP POLICY IF EXISTS "Team members view all projects" ON projects;

-- Deals
DROP POLICY IF EXISTS "Book keeper view deals" ON deals;
DROP POLICY IF EXISTS "VA manage deals" ON deals;
DROP POLICY IF EXISTS "Staff manage deals" ON deals;

-- Time Logs
DROP POLICY IF EXISTS "Users can view their own time logs" ON time_logs;
DROP POLICY IF EXISTS "Admins can view all time logs" ON time_logs;
DROP POLICY IF EXISTS "Users manage own time logs" ON time_logs;

-- Invoices
DROP POLICY IF EXISTS "Admin/Bookkeeper manage invoices" ON invoices;
DROP POLICY IF EXISTS "Finance manage invoices" ON invoices;
DROP POLICY IF EXISTS "VA view invoices" ON invoices;

-- Quotes
DROP POLICY IF EXISTS "Admin/VA manage quotes" ON quotes;
DROP POLICY IF EXISTS "Staff manage quotes" ON quotes;

-- 3. RE-IMPLEMENT CLEAN POLICIES

-- PROFILES
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Staff view all profiles" ON profiles FOR SELECT USING (get_my_role() IN ('admin', 'book_keeper', 'virtual_assistant'));

-- TASKS
CREATE POLICY "Users view tasks" ON tasks FOR SELECT USING (auth.uid() = assigned_to OR auth.uid() = created_by OR get_my_role() IN ('admin', 'virtual_assistant'));
CREATE POLICY "Staff manage tasks" ON tasks FOR ALL USING (get_my_role() IN ('admin', 'virtual_assistant'));

-- CLIENTS
CREATE POLICY "Staff manage clients" ON clients FOR ALL USING (get_my_role() IN ('admin', 'book_keeper', 'virtual_assistant'));
CREATE POLICY "Team view clients" ON clients FOR SELECT USING (get_my_role() = 'team_member');

-- PROJECTS
CREATE POLICY "Authenticated view projects" ON projects FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage projects" ON projects FOR ALL USING (get_my_role() = 'admin');

-- DEALS
CREATE POLICY "Staff manage deals" ON deals FOR ALL USING (get_my_role() IN ('admin', 'virtual_assistant', 'book_keeper'));

-- TIME LOGS
CREATE POLICY "Users manage own time logs" ON time_logs FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins view all time logs" ON time_logs FOR SELECT USING (get_my_role() = 'admin');

-- INVOICES & FINANCE
CREATE POLICY "Finance manage invoices" ON invoices FOR ALL USING (get_my_role() IN ('admin', 'book_keeper'));
CREATE POLICY "VA view invoices" ON invoices FOR SELECT USING (get_my_role() = 'virtual_assistant');

-- QUOTES
CREATE POLICY "Staff manage quotes" ON quotes FOR ALL USING (get_my_role() IN ('admin', 'virtual_assistant', 'book_keeper'));

-- =================================================================
-- END OF FIX
-- =================================================================
