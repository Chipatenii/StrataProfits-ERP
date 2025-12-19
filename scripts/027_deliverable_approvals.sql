-- Stage 4: Deliverable Approvals & Visibility

-- 1. Update approval_requests entity_type check constraint
-- Note: Postgres doesn't allow direct ALTER of CHECK constraints easily without naming.
-- We will drop and recreate it if we can find the name, or just use a safer approach.
DO $$ 
BEGIN
    ALTER TABLE IF EXISTS approval_requests 
    DROP CONSTRAINT IF EXISTS approval_requests_entity_type_check;

    ALTER TABLE approval_requests 
    ADD CONSTRAINT approval_requests_entity_type_check 
    CHECK (entity_type IN ('task', 'time_log', 'expense', 'invoice', 'quote', 'meeting', 'deliverable'));
END $$;

-- 2. Add is_shared column to deliverables for portal visibility
ALTER TABLE deliverables 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'under_review', 'approved', 'rejected'));

-- 3. Add index for performance on shared deliverables
CREATE INDEX IF NOT EXISTS idx_deliverables_is_shared ON deliverables(is_shared) WHERE is_shared = true;
