-- Fix Infinite Recursion and Enable Team Member Task Creation

-- 1. Secure Role Helper (Breaks Recursion)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- 2. Clean up existing recursive policies
DROP POLICY IF EXISTS "Admins view all profiles" ON profiles;
DROP POLICY IF EXISTS "Staff view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Staff manage clients" ON clients;
DROP POLICY IF EXISTS "Admin/Bookkeeper manage invoices" ON invoices;
DROP POLICY IF EXISTS "VA manage invoices" ON invoices;

-- 3. Fix PROFILES Policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Staff view all profiles" ON profiles
    FOR SELECT USING (
        get_my_role() IN ('admin', 'book_keeper', 'virtual_assistant')
    );

-- 4. Enable Team Member Task Creation (And Fix Tasks RLS)
-- Ensure columns exist
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS is_self_created BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approval_status TEXT CHECK (approval_status IN ('auto_approved', 'pending', 'approved', 'rejected')) DEFAULT 'auto_approved',
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Drop old tasks policies to start fresh
DROP POLICY IF EXISTS "Users can view tasks assigned to them" ON tasks;
DROP POLICY IF EXISTS "Users can view tasks assigned to them or created by them" ON tasks;
DROP POLICY IF EXISTS "Users can create their own self-created tasks" ON tasks;
DROP POLICY IF EXISTS "Admins manage all tasks" ON tasks;

-- New Tasks Policies
-- Select: See assigned OR created OR if admin/bookkeeper/va (maybe VA needs all?)
-- Let's stick to: assigned OR created OR admin/manager
CREATE POLICY "View tasks: assigned, created, or admin" ON tasks
    FOR SELECT USING (
        auth.uid() = assigned_to OR 
        auth.uid() = created_by OR
        get_my_role() IN ('admin', 'project_manager') -- Adjust roles as needed
    );

-- Insert: Allow self-creation
CREATE POLICY "Team members can create pending tasks" ON tasks
    FOR INSERT WITH CHECK (
        auth.uid() = created_by AND
        is_self_created = true AND
        approval_status = 'pending'
    );

-- Admin Manage: Full access for admins
CREATE POLICY "Admins manage all tasks" ON tasks
    FOR ALL USING (
        get_my_role() = 'admin'
    );

-- 5. Fix Other Tables using get_my_role()
-- CLIENTS
CREATE POLICY "Staff manage clients" ON clients
    FOR ALL USING (
        get_my_role() IN ('admin', 'book_keeper', 'virtual_assistant')
    );

-- INVOICES
CREATE POLICY "Admin/Bookkeeper manage invoices" ON invoices
    FOR ALL USING (
        get_my_role() IN ('admin', 'book_keeper')
    );

CREATE POLICY "VA manage invoices" ON invoices
    FOR ALL USING (
        get_my_role() = 'virtual_assistant'
    );
