-- Migration: Add fields for task approval workflows and time tracking

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS time_allocated DECIMAL(5,2) DEFAULT NULL;

COMMENT ON COLUMN public.tasks.assigned_by IS 'The user who assigned the task to the current assignee';
COMMENT ON COLUMN public.tasks.time_allocated IS 'Hours/minutes allocated for the task completion';
