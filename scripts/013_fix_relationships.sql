-- Fix Foreign Key Relationships to enable PostgREST joins with profiles
-- The original script referenced auth.users, but the API tries to join with public.profiles.
-- Changing the FKs to point to public.profiles enables the direct expansion.

-- 1. Meetings
DO $$
BEGIN
    -- Drop old constraints if they exist (handling standard naming)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'meetings_requested_by_user_id_fkey') THEN
        ALTER TABLE public.meetings DROP CONSTRAINT meetings_requested_by_user_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'meetings_assigned_to_user_id_fkey') THEN
        ALTER TABLE public.meetings DROP CONSTRAINT meetings_assigned_to_user_id_fkey;
    END IF;
END $$;

-- Add new constraints referencing public.profiles
ALTER TABLE public.meetings 
    ADD CONSTRAINT meetings_requested_by_profile_fkey 
    FOREIGN KEY (requested_by_user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;

ALTER TABLE public.meetings 
    ADD CONSTRAINT meetings_assigned_to_profile_fkey 
    FOREIGN KEY (assigned_to_user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;


-- 2. Expenses
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'expenses_submitted_by_user_id_fkey') THEN
        ALTER TABLE public.expenses DROP CONSTRAINT expenses_submitted_by_user_id_fkey;
    END IF;
END $$;

ALTER TABLE public.expenses 
    ADD CONSTRAINT expenses_submitted_by_profile_fkey 
    FOREIGN KEY (submitted_by_user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;


-- 3. Comments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'comments_author_user_id_fkey') THEN
        ALTER TABLE public.comments DROP CONSTRAINT comments_author_user_id_fkey;
    END IF;
END $$;

ALTER TABLE public.comments 
    ADD CONSTRAINT comments_author_profile_fkey 
    FOREIGN KEY (author_user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;
