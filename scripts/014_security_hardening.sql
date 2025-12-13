-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- INVOICES POLICIES
-- Admin & Bookkeeper: Full Access
CREATE POLICY "Admin/Bookkeeper manage invoices" ON invoices
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'book_keeper')
        )
    );

-- Virtual Assistant: View and Create (Drafts)
CREATE POLICY "VA manage invoices" ON invoices
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'virtual_assistant'
        )
    );

-- CLIENTS POLICIES
-- Admin, Bookkeeper, VA: Full Access
CREATE POLICY "Staff manage clients" ON clients
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'book_keeper', 'virtual_assistant')
        )
    );

-- Team Members: View Only (To see client names in projects/tasks)
CREATE POLICY "Team view clients" ON clients
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'team_member'
        )
    );

-- Additional cleanup: Ensure user profiles can read themselves
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT
    USING (id = auth.uid());
    
-- Allow Admins to view all profiles
DROP POLICY IF EXISTS "Admins view all profiles" ON profiles;
CREATE POLICY "Admins view all profiles" ON profiles
    FOR SELECT
    USING (
         EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'book_keeper', 'virtual_assistant')
        )
    );
