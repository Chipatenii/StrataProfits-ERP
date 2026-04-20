-- ============================================================================
-- 041_add_daily_checkins.sql
-- Daily Check-ins: users log what they did, what they're doing, and blockers.
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    what_i_did TEXT NOT NULL,
    what_im_doing TEXT NOT NULL,
    blockers TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT daily_checkins_user_date_unique UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date
    ON daily_checkins (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_date
    ON daily_checkins (date DESC);

ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

-- Users can view their own checkins; admins and virtual assistants can view all
CREATE POLICY "Users can view own daily checkins"
    ON daily_checkins FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'virtual_assistant')
        )
    );

-- Users can insert their own checkins only
CREATE POLICY "Users can create own daily checkins"
    ON daily_checkins FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can update their own checkins (e.g. edit today's entry)
CREATE POLICY "Users can update own daily checkins"
    ON daily_checkins FOR UPDATE
    USING (user_id = auth.uid());

-- Only admins can delete
CREATE POLICY "Admins can delete daily checkins"
    ON daily_checkins FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );
