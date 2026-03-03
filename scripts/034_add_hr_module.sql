-- ============================================================================
-- 034_add_hr_module.sql
-- HR & Onboarding Module: PTO Tracking, Performance Reviews, Onboarding
-- ============================================================================

-- ─── 1. Time-Off Requests ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS time_off_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'vacation' CHECK (type IN ('vacation', 'sick', 'personal', 'unpaid', 'other')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count NUMERIC(4,1) NOT NULL DEFAULT 1,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    reviewer_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_time_off_user ON time_off_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_time_off_status ON time_off_requests(status);

-- RLS
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own time-off requests"
    ON time_off_requests FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'virtual_assistant')
        )
    );

-- Users can insert their own requests
CREATE POLICY "Users can create own time-off requests"
    ON time_off_requests FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Admins/VAs can update any request (approve/reject); users can cancel their own
CREATE POLICY "Users can update time-off requests"
    ON time_off_requests FOR UPDATE
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'virtual_assistant')
        )
    );

-- Only admins can delete
CREATE POLICY "Admins can delete time-off requests"
    ON time_off_requests FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ─── 2. Performance Reviews ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS performance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES profiles(id),
    review_period TEXT NOT NULL,  -- e.g. "Q1 2026", "Jan 2026"
    overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
    strengths TEXT,
    areas_for_improvement TEXT,
    goals TEXT,
    additional_notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_perf_review_user ON performance_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_perf_review_reviewer ON performance_reviews(reviewer_id);

-- RLS
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;

-- Admins/VAs can view all; users can view their own published reviews
CREATE POLICY "View performance reviews"
    ON performance_reviews FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'virtual_assistant')
        )
        OR (user_id = auth.uid() AND status = 'published')
    );

-- Only admins can insert reviews
CREATE POLICY "Admins can create performance reviews"
    ON performance_reviews FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can update reviews
CREATE POLICY "Admins can update performance reviews"
    ON performance_reviews FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can delete reviews
CREATE POLICY "Admins can delete performance reviews"
    ON performance_reviews FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ─── 3. Onboarding Tasks (Global Templates) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS onboarding_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'General' CHECK (category IN ('General', 'IT Setup', 'HR Paperwork', 'Team Intro', 'Training', 'Tools & Access', 'Other')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE onboarding_tasks ENABLE ROW LEVEL SECURITY;

-- All authenticated internal users can view active onboarding tasks
CREATE POLICY "View onboarding tasks"
    ON onboarding_tasks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'client'
        )
    );

-- Only admins can manage onboarding tasks
CREATE POLICY "Admins can manage onboarding tasks"
    ON onboarding_tasks FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update onboarding tasks"
    ON onboarding_tasks FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete onboarding tasks"
    ON onboarding_tasks FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ─── 4. User Onboarding Progress ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_onboarding_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES onboarding_tasks(id) ON DELETE CASCADE,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, task_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user ON user_onboarding_progress(user_id);

-- RLS
ALTER TABLE user_onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Users can view their own progress; admins/VAs can view all
CREATE POLICY "View onboarding progress"
    ON user_onboarding_progress FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'virtual_assistant')
        )
    );

-- Users can insert their own progress
CREATE POLICY "Users can track own onboarding progress"
    ON user_onboarding_progress FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can update their own progress
CREATE POLICY "Users can update own onboarding progress"
    ON user_onboarding_progress FOR UPDATE
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );
