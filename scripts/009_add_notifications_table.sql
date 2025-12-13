-- Create notifications table for admin alerts
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('task_completed', 'time_exceeded', 'due_date_reminder')),
  message TEXT NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can only see their own notifications
DROP POLICY IF EXISTS "Admins can view their own notifications" ON notifications;
CREATE POLICY "Admins can view their own notifications"
  ON notifications
  FOR SELECT
  USING (admin_id = auth.uid());

DROP POLICY IF EXISTS "Admins can update their own notifications" ON notifications;
CREATE POLICY "Admins can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

DROP POLICY IF EXISTS "Admins can delete their own notifications" ON notifications;
CREATE POLICY "Admins can delete their own notifications"
  ON notifications
  FOR DELETE
  USING (admin_id = auth.uid());

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_admin_id ON notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
