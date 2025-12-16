-- RESCUE MISSION: Fix Infinite Recursion and 500 Errors
-- This script aggressively drops potentially conflicting policies and simplifies security checks.

-- 1. Redefine the Helper Function with FORCE
-- Ensure it is SECURITY DEFINER and checks auth.uid()
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- 2. Drop ALL related policies to ensure clean slate
-- Profiles
DROP POLICY IF EXISTS "Admins view all profiles" ON profiles;
DROP POLICY IF EXISTS "Staff view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles access" ON profiles;

-- Tasks
DROP POLICY IF EXISTS "Users can view tasks assigned to them" ON tasks;
DROP POLICY IF EXISTS "Users can view tasks assigned to them or created by them" ON tasks;
DROP POLICY IF EXISTS "Users can create their own self-created tasks" ON tasks;
DROP POLICY IF EXISTS "View tasks: assigned, created, or admin" ON tasks;
DROP POLICY IF EXISTS "Team members can create pending tasks" ON tasks;
DROP POLICY IF EXISTS "Admins manage all tasks" ON tasks;

-- Projects
DROP POLICY IF EXISTS "Team members view all projects" ON projects;
DROP POLICY IF EXISTS "Admins manage projects" ON projects;
DROP POLICY IF EXISTS "Authenticated view projects" ON projects;

-- 3. Re-apply SIMPLIFIED Policies

-- PROFILES (The usual suspect for recursion)
-- Allow users to see their own profile (NO RECURSION POSSIBLE)
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (id = auth.uid());

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- Allow admins/staff to see all profiles.
-- CRITICAL: Uses get_my_role() which is SECURITY DEFINER.
CREATE POLICY "Staff view all profiles" ON profiles
    FOR SELECT USING (
        get_my_role() IN ('admin', 'book_keeper', 'virtual_assistant', 'project_manager')
    );

-- TASKS
-- Simple: If it's yours (assigned or created) OR you are admin-like
CREATE POLICY "View tasks" ON tasks
    FOR SELECT USING (
        auth.uid() = assigned_to OR 
        auth.uid() = created_by OR
        get_my_role() IN ('admin', 'project_manager')
    );

CREATE POLICY "Create tasks" ON tasks
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
    );

CREATE POLICY "Update tasks" ON tasks
    FOR UPDATE USING (
        auth.uid() = assigned_to OR 
        auth.uid() = created_by OR
        get_my_role() IN ('admin', 'project_manager')
    );

-- PROJECTS
-- Open to all authenticated users for reading (simple, avoids recursion)
CREATE POLICY "Authenticated view projects" ON projects
    FOR SELECT USING (
        auth.role() = 'authenticated'
    );

-- Admin manage projects
CREATE POLICY "Admins manage projects" ON projects
    FOR ALL USING (
        get_my_role() = 'admin'
    );

-- 4. Fix other potential recursion points
-- Ensure no other table relies on complex cross-joins for simple select
-- Clients - open to staff
DROP POLICY IF EXISTS "Staff manage clients" ON clients;
CREATE POLICY "Staff manage clients" ON clients
    FOR ALL USING (
        get_my_role() IN ('admin', 'book_keeper', 'virtual_assistant', 'project_manager')
    );
