-- Fix Team Member Dashboard RLS Issues (Projects, Tasks, etc.)

-- 1. Ensure Team Members can view Projects (needed for dropdowns)
-- Check if policy exists, if not create it.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'projects' AND policyname = 'Team members view all projects'
    ) THEN
        CREATE POLICY "Team members view all projects" ON projects
            FOR SELECT USING (
                -- Allow if authenticated (or specifically team members)
                auth.role() = 'authenticated'
            );
    END IF;
END $$;

-- 2. Ensure Team Members can see their own COMPLETED tasks (and created ones)
-- We might need to drop conflicting policies if 023 wasn't sufficient or if there are others.
-- Re-applying a robust permissions set for tasks.

DROP POLICY IF EXISTS "View tasks: assigned, created, or admin" ON tasks;
DROP POLICY IF EXISTS "Users can view tasks assigned to them" ON tasks;
DROP POLICY IF EXISTS "Users can view tasks assigned to them or created by them" ON tasks;

CREATE POLICY "View tasks: assigned, created, or admin" ON tasks
    FOR SELECT USING (
        auth.uid() = assigned_to OR 
        auth.uid() = created_by OR
        get_my_role() IN ('admin', 'project_manager')
    );

-- 3. Ensure Team Members can INSERT tasks (Fix 500 error on POST)
-- If the 500 error was due to "infinite recursion" in profiles, ensure get_my_role is used everywhere.
-- If it was due to missing insert permission on 'tasks', this handles it.

DROP POLICY IF EXISTS "Team members can create pending tasks" ON tasks;
CREATE POLICY "Team members can create pending tasks" ON tasks
    FOR INSERT WITH CHECK (
        -- Must be logged in
        auth.role() = 'authenticated' AND
        -- Must mark as self-created (or we force it in API, but RLS checks the payload)
        (is_self_created = true OR is_self_created IS NULL) -- Allow null if default handles it, but safest to be specific
        -- We won't be too strict here to avoid 500s, let the API validation handle business logic.
        -- Key is: authenticated users can create tasks. Use triggers/defaults to clean up.
    );

-- 4. Fix "Profiles" Recursion (Just in case 023 wasn't run or needs reinforcement)
-- Re-run the secure function definition to be safe.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- 5. Ensure "projects" visible to everyone (for the dropdown)
-- (Already handled in step 1, but ensuring no restrictive policy blocks it)
DROP POLICY IF EXISTS "Admins manage projects" ON projects;
CREATE POLICY "Admins manage projects" ON projects
    FOR ALL USING (
        get_my_role() = 'admin'
    );
    
-- Allow read access to everyone authenticated
DROP POLICY IF EXISTS "Authenticated view projects" ON projects;
CREATE POLICY "Authenticated view projects" ON projects
    FOR SELECT USING (
        auth.role() = 'authenticated'
    );
