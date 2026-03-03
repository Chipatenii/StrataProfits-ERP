-- ============================================================================
-- 036_extend_notifications.sql
-- Extend notifications to support all user roles (not just admins)
-- ============================================================================

-- Add user_id column so any user can receive notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id);

-- Add new notification type values 
-- (The existing type column is TEXT so no enum alter needed)

-- Update RLS: users can see notifications where they are the target
-- Drop the existing admin-only policy if it exists, then create a broader one
DO $$
BEGIN
    -- Try to drop old policy
    DROP POLICY IF EXISTS "Admins can view notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- New universal read policy
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (
        admin_id = auth.uid()
        OR user_id = auth.uid()
    );

-- Allow system to insert notifications for any user
DO $$
BEGIN
    DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "System can insert notifications"
    ON notifications FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to mark their own notifications as read
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (
        admin_id = auth.uid()
        OR user_id = auth.uid()
    );
