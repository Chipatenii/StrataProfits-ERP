-- Self-Created Tasks and Approval System Migration

-- 1. Add approval fields to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS is_self_created BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approval_status TEXT CHECK (approval_status IN ('auto_approved', 'pending', 'approved', 'rejected')) DEFAULT 'auto_approved',
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- 2. Add approval fields to time_logs table
ALTER TABLE public.time_logs
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true, -- Default true for existing logs compatibility
ADD COLUMN IF NOT EXISTS billable BOOLEAN DEFAULT true; -- Default true for existing logs compatibility

-- 3. Update RLS policies for TASKS

-- Allow team members to create their own tasks (is_self_created = true)
CREATE POLICY "Users can create their own self-created tasks"
ON public.tasks
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  is_self_created = true AND
  approval_status = 'pending'
);

-- Allow users to view tasks they created (in addition to tasks assigned to them)
-- Existing policy "Users can view tasks assigned to them" usually handles assigned_to.
-- We need to ensure they can see tasks they created even if not assigned (though typically they verify self-assign).
-- Let's update or ensure a policy exists.
-- The existing policy checks: auth.uid() = assigned_to OR role = 'admin'
-- We want: auth.uid() = assigned_to OR auth.uid() = created_by OR role = 'admin'

DROP POLICY IF EXISTS "Users can view tasks assigned to them" ON public.tasks;

CREATE POLICY "Users can view tasks assigned to them or created by them"
ON public.tasks
FOR SELECT
USING (
  auth.uid() = assigned_to OR 
  auth.uid() = created_by OR 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- 4. Create function to handle auto-approval logic if needed (optional, keeping simple for now)
-- The UI/Client will send 'pending' for self-created tasks.

-- 5. Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_approval_status ON public.tasks(approval_status);
CREATE INDEX IF NOT EXISTS idx_time_logs_is_approved ON public.time_logs(is_approved);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);

-- 6. Trigger to automatically update time_logs approval status when task is approved
CREATE OR REPLACE FUNCTION public.handle_task_approval_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If submission is being approved
  IF NEW.approval_status = 'approved' AND OLD.approval_status = 'pending' THEN
    UPDATE public.time_logs
    SET is_approved = true, billable = true
    WHERE task_id = NEW.id;
  END IF;

  -- If submission is being rejected (optional: what to do with logs? keep them unapproved)
  -- We don't need to do anything specifically, they stay is_approved=false.
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_approval_change ON public.tasks;
CREATE TRIGGER on_task_approval_change
AFTER UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_task_approval_update();
