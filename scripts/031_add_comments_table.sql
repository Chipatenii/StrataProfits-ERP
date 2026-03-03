-- Migration: 031_add_comments_table
-- Description: Adds a comments table for structured entity discussions

-- 1. Create the comments table
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'project', 'deal', 'meeting')),
    entity_id UUID NOT NULL,
    author_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create useful indexes for quick querying
CREATE INDEX IF NOT EXISTS idx_comments_entity ON public.comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON public.comments(author_user_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 4. Set up Policies
--    Rule: Anyone can view comments (or you can strictly limit it to members of specific tasks/projects)
CREATE POLICY "Users can view all comments"
    ON public.comments
    FOR SELECT
    USING (true);

--    Rule: Logged-in users can create comments
CREATE POLICY "Logged in users can create comments"
    ON public.comments
    FOR INSERT
    WITH CHECK (auth.uid() = author_user_id);

--    Rule: Authors can update their own comments
CREATE POLICY "Users can update their own comments"
    ON public.comments
    FOR UPDATE
    USING (auth.uid() = author_user_id);

--    Rule: Authors can delete their own comments
CREATE POLICY "Users can delete their own comments"
    ON public.comments
    FOR DELETE
    USING (auth.uid() = author_user_id);

-- Note: In Supabase, admins automatically bypass RLS or use the service_role key 
-- to forcefully delete inappropriate comments if required via the backend APIs.
