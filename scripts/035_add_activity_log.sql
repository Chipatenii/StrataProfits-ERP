-- ============================================================================
-- 035_add_activity_log.sql
-- Global Activity Feed for tracking platform-wide actions
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,           -- e.g. "created_task", "uploaded_file", "submitted_pto"
    entity_type TEXT NOT NULL,      -- e.g. "task", "invoice", "file", "time_off", "review"
    entity_id UUID,                 -- optional reference to the specific entity
    metadata JSONB DEFAULT '{}',    -- extra context (e.g. file name, task title)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);

-- RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Admins and VAs see all activity
CREATE POLICY "Admins and VAs can view all activity"
    ON activity_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'virtual_assistant')
        )
    );

-- Users can view their own activity
CREATE POLICY "Users can view own activity"
    ON activity_log FOR SELECT
    USING (user_id = auth.uid());

-- Authenticated users can insert activity (for server-side logging)
CREATE POLICY "Authenticated users can insert activity"
    ON activity_log FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);
