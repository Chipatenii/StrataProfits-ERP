-- ==========================================
-- Strata ERP: Fix Team Member Permissions
-- ==========================================

-- 1. PROJECTS: Allow all authenticated users (Team Members) to view active projects
-- This fixes the "Projects not visible in dropdown" issue.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' AND policyname = 'Authenticated users view active projects'
  ) THEN
    CREATE POLICY "Authenticated users view active projects" ON public.projects
      FOR SELECT
      USING (status = 'active');
  END IF;
END $$;

-- 2. TASKS: Allow users to create tasks (Self-Created)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tasks' AND policyname = 'Authenticated users create tasks'
  ) THEN
    CREATE POLICY "Authenticated users create tasks" ON public.tasks
      FOR INSERT
      WITH CHECK (auth.uid() = created_by);
  END IF;
END $$;

-- 3. TASKS: Allow users to view their own tasks (Created by them OR Assigned to them)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tasks' AND policyname = 'Users view own tasks'
  ) THEN
    CREATE POLICY "Users view own tasks" ON public.tasks
      FOR SELECT
      USING (
        auth.uid() = created_by 
        OR 
        auth.uid() = assigned_to
        OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'virtual_assistant'))
      );
  END IF;
END $$;

-- 4. TASKS: Allow users to update their own tasks (e.g. mark complete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tasks' AND policyname = 'Users update own tasks'
  ) THEN
    CREATE POLICY "Users update own tasks" ON public.tasks
      FOR UPDATE
      USING (auth.uid() = assigned_to OR auth.uid() = created_by);
  END IF;
END $$;
