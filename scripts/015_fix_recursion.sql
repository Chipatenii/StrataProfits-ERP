-- Fix Infinite Recursion in RLS Policies

-- 1. Create a secure function to get the current user's role
-- SECURITY DEFINER allows this function to bypass RLS on profiles table
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- 2. Drop the recursive policies on PROFILES
DROP POLICY IF EXISTS "Admins view all profiles" ON profiles;
DROP POLICY IF EXISTS "Staff manage clients" ON clients;
DROP POLICY IF EXISTS "Admin/Bookkeeper manage invoices" ON invoices;
DROP POLICY IF EXISTS "VA manage invoices" ON invoices;
DROP POLICY IF EXISTS "Admin/VA manage quotes" ON quotes;

-- 3. Re-create secure policies for PROFILES
-- Users can read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT
    USING (id = auth.uid());

-- Admins/Staff can view all profiles (using the secure function to avoid recursion)
CREATE POLICY "Staff view all profiles" ON profiles
    FOR SELECT
    USING (
        get_my_role() IN ('admin', 'book_keeper', 'virtual_assistant')
    );

-- 4. Re-create secure policies for other tables using the function
-- CLIENTS
CREATE POLICY "Staff manage clients" ON clients
    FOR ALL
    USING (
        get_my_role() IN ('admin', 'book_keeper', 'virtual_assistant')
    );

-- INVOICES
CREATE POLICY "Admin/Bookkeeper manage invoices" ON invoices
    FOR ALL
    USING (
        get_my_role() IN ('admin', 'book_keeper')
    );

CREATE POLICY "VA manage invoices" ON invoices
    FOR ALL
    USING (
        get_my_role() = 'virtual_assistant'
    );

-- QUOTES
CREATE POLICY "Admin/VA manage quotes" ON quotes
    FOR ALL
    USING (
        get_my_role() IN ('admin', 'virtual_assistant', 'book_keeper')
    );

-- QUOTE ITEMS
DROP POLICY IF EXISTS "Admin/VA manage quote items" ON quote_items;
CREATE POLICY "Admin/VA manage quote items" ON quote_items
    FOR ALL
    USING (
        get_my_role() IN ('admin', 'virtual_assistant', 'book_keeper')
    );

-- APPROVALS
DROP POLICY IF EXISTS "Admins manage all approvals" ON approval_requests;
CREATE POLICY "Admins manage all approvals" ON approval_requests
    FOR ALL
    USING (
        get_my_role() IN ('admin', 'book_keeper')
    );

-- Ensure generated columns are handled if missing (cleanup from previous attempts)
