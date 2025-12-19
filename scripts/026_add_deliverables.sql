-- Stage 1: Add Deliverables Table and Structural Alignment

-- 1. Create deliverables table
CREATE TABLE IF NOT EXISTS public.deliverables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'archived')),
    phase TEXT,
    sort_order INTEGER DEFAULT 0,
    due_date TIMESTAMPTZ,
    is_default BOOLEAN DEFAULT false,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add deliverable_id to tasks
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'deliverable_id') THEN
        ALTER TABLE public.tasks ADD COLUMN deliverable_id UUID REFERENCES public.deliverables(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Enable RLS for deliverables
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;

-- 4. Policies for Deliverables (Mirroring Project Policies)
DROP POLICY IF EXISTS "Admins can manage deliverables" ON public.deliverables;
CREATE POLICY "Admins can manage deliverables"
    ON public.deliverables FOR ALL
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Members can view deliverables" ON public.deliverables;
CREATE POLICY "Members can view deliverables"
    ON public.deliverables FOR SELECT
    USING (
        project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    );

-- 5. Data Migration (Idempotent)
-- For each project, create a default deliverable if one doesn't exist
-- and attach all project tasks that don't have a deliverable_id yet.

DO $$
DECLARE
    p_record RECORD;
    d_id UUID;
BEGIN
    FOR p_record IN SELECT id, name FROM public.projects LOOP
        -- Check if a default deliverable already exists for this project
        SELECT id INTO d_id FROM public.deliverables WHERE project_id = p_record.id AND is_default = true LIMIT 1;
        
        -- If not, create it
        IF d_id IS NULL THEN
            INSERT INTO public.deliverables (project_id, name, description, status, is_default)
            VALUES (p_record.id, 'General Implementation', 'Default deliverable for existing tasks.', 'in_progress', true)
            RETURNING id INTO d_id;
        END IF;

        -- Attach all tasks of this project that don't have a deliverable_id
        UPDATE public.tasks
        SET deliverable_id = d_id
        WHERE project_id = p_record.id AND deliverable_id IS NULL;
    END LOOP;
END $$;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_deliverables_project_id ON public.deliverables(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deliverable_id ON public.tasks(deliverable_id);

-- 6.1 Composite Index for performance
CREATE INDEX IF NOT EXISTS idx_tasks_project_deliverable ON public.tasks(project_id, deliverable_id);

-- 6.2 Partial Unique Index: Ensure only ONE default deliverable per project
-- Postgres syntax for partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_default_per_project 
ON public.deliverables (project_id) 
WHERE (is_default = true);

-- Rollback Notes:
-- DROP INDEX IF EXISTS idx_one_default_per_project;
-- ALTER TABLE public.tasks DROP COLUMN IF EXISTS deliverable_id;
-- DROP TABLE IF EXISTS public.deliverables;
-- Note: Dropping the table will cascade and delete all deliverable metadata, 
-- but tasks will remain (deliverable_id will be set to NULL due to SET NULL).

-- Production Considerations:
-- Adding a nullable column and an index on a large table ('tasks') might take some time.
-- The backfill script runs a loop over 'projects'; for 10k+ projects, consider batching.
