-- Migration: 046_multi_assignment
-- Description: Adds junction tables so a single task or meeting can have
--              multiple assignees/attendees, while keeping the existing
--              `assigned_to` / `assigned_to_user_id` columns as the
--              primary owner for backwards compatibility with dashboards
--              and queries that aggregate by single user.

-- ─── Tasks ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.task_assignees (
    task_id     uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON public.task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON public.task_assignees(task_id);

-- Backfill from the legacy single-assignee column. Safe to re-run.
INSERT INTO public.task_assignees (task_id, user_id)
SELECT id, assigned_to
FROM public.tasks
WHERE assigned_to IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Internal users can read task assignees" ON public.task_assignees;
DROP POLICY IF EXISTS "Internal users can write task assignees" ON public.task_assignees;
DROP POLICY IF EXISTS "Internal users can delete task assignees" ON public.task_assignees;

CREATE POLICY "Internal users can read task assignees"
ON public.task_assignees FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role <> 'client'
    )
);

CREATE POLICY "Internal users can write task assignees"
ON public.task_assignees FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role <> 'client'
    )
);

CREATE POLICY "Internal users can delete task assignees"
ON public.task_assignees FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role <> 'client'
    )
);

-- ─── Meetings ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meeting_attendees (
    meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    added_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (meeting_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_attendees_user ON public.meeting_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting ON public.meeting_attendees(meeting_id);

INSERT INTO public.meeting_attendees (meeting_id, user_id)
SELECT id, assigned_to_user_id
FROM public.meetings
WHERE assigned_to_user_id IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Internal users can read meeting attendees" ON public.meeting_attendees;
DROP POLICY IF EXISTS "Internal users can write meeting attendees" ON public.meeting_attendees;
DROP POLICY IF EXISTS "Internal users can delete meeting attendees" ON public.meeting_attendees;

CREATE POLICY "Internal users can read meeting attendees"
ON public.meeting_attendees FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role <> 'client'
    )
);

CREATE POLICY "Internal users can write meeting attendees"
ON public.meeting_attendees FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role <> 'client'
    )
);

CREATE POLICY "Internal users can delete meeting attendees"
ON public.meeting_attendees FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role <> 'client'
    )
);
