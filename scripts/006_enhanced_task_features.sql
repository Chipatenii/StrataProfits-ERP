-- Enhanced Task Features Migration
-- Adds time allocation tracking, task completion tracking, and admin notifications

-- Add new columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(5,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS completion_notes TEXT DEFAULT NULL;

-- Create notifications table for admin alerts
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('task_completed', 'time_exceeded', 'due_date_reminder')),
  message TEXT NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Admins can view their own notifications"
  ON public.notifications FOR SELECT
  USING (
    auth.uid() = admin_id OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = admin_id);

CREATE POLICY "Admins can delete their own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = admin_id);

-- Function to create notification for all admins
CREATE OR REPLACE FUNCTION public.notify_admins(
  notification_type TEXT,
  notification_message TEXT,
  related_task_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.notifications (admin_id, type, message, task_id)
  SELECT id, notification_type, notification_message, related_task_id
  FROM public.profiles
  WHERE role = 'admin';
END;
$$;

-- Function to check and notify on task completion
CREATE OR REPLACE FUNCTION public.handle_task_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_title TEXT;
  assignee_name TEXT;
BEGIN
  -- Only proceed if status changed to completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Set completed_at timestamp
    NEW.completed_at = NOW();
    
    -- Get task title
    task_title := NEW.title;
    
    -- Get assignee name
    SELECT full_name INTO assignee_name
    FROM public.profiles
    WHERE id = NEW.assigned_to;
    
    -- Create notification for admins
    PERFORM public.notify_admins(
      'task_completed',
      format('Task "%s" completed by %s', task_title, COALESCE(assignee_name, 'Unknown')),
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for task completion
DROP TRIGGER IF EXISTS on_task_completion ON public.tasks;
CREATE TRIGGER on_task_completion
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_completion();

-- Function to check time exceeded and notify admins
CREATE OR REPLACE FUNCTION public.check_time_exceeded()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_record RECORD;
  time_spent_minutes INTEGER;
  estimated_minutes INTEGER;
  assignee_name TEXT;
BEGIN
  -- Loop through tasks with estimated hours
  FOR task_record IN 
    SELECT t.id, t.title, t.estimated_hours, t.assigned_to
    FROM public.tasks t
    WHERE t.estimated_hours IS NOT NULL 
      AND t.status != 'completed'
      AND t.assigned_to IS NOT NULL
  LOOP
    -- Calculate time spent on this task
    SELECT COALESCE(SUM(duration_minutes), 0) INTO time_spent_minutes
    FROM public.time_logs
    WHERE task_id = task_record.id;
    
    -- Convert estimated hours to minutes
    estimated_minutes := task_record.estimated_hours * 60;
    
    -- Check if time exceeded and no recent notification sent
    IF time_spent_minutes > estimated_minutes THEN
      -- Check if notification already sent in last 24 hours
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE task_id = task_record.id
          AND type = 'time_exceeded'
          AND created_at > NOW() - INTERVAL '24 hours'
      ) THEN
        -- Get assignee name
        SELECT full_name INTO assignee_name
        FROM public.profiles
        WHERE id = task_record.assigned_to;
        
        -- Create notification
        PERFORM public.notify_admins(
          'time_exceeded',
          format('Task "%s" has exceeded estimated time by %s hours (assigned to %s)', 
            task_record.title,
            ROUND((time_spent_minutes - estimated_minutes)::NUMERIC / 60, 1),
            COALESCE(assignee_name, 'Unknown')
          ),
          task_record.id
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_admin_unread 
  ON public.notifications(admin_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status 
  ON public.tasks(assigned_to, status);

CREATE INDEX IF NOT EXISTS idx_time_logs_task 
  ON public.time_logs(task_id, duration_minutes);

-- Add comment to explain the check_time_exceeded function usage
COMMENT ON FUNCTION public.check_time_exceeded() IS 
  'Call this function periodically (e.g., via cron job or API endpoint) to check for tasks exceeding estimated time and notify admins';
