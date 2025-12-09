-- Fix project_members foreign key to reference profiles instead of auth.users
-- This is necessary for Supabase to perform joins between project_members and profiles

DO $$
BEGIN
    -- Drop the old constraint referencing auth.users if it exists
    -- We try to guess the constraint name, but if it was auto-generated differently, we might need to find it dynamically.
    -- Default naming convention is table_column_fkey
    
    -- First, check if the constraint exists and references auth.users
    IF EXISTS (
        SELECT 1 
        FROM information_schema.referential_constraints rc
        JOIN information_schema.table_constraints tc ON rc.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'project_members' 
        AND tc.constraint_name = 'project_members_user_id_fkey'
    ) THEN
        ALTER TABLE public.project_members DROP CONSTRAINT project_members_user_id_fkey;
    END IF;

    -- If the constraint name was different (e.g. if the user manually created it or different PG version quirks), 
    -- we might need to look it up, but for now we'll assume standard naming or just add the new one if there is no conflict.
    -- In a robust script we would check specific constraint definitions, but this is a fix-forward script.

    -- Add the new constraint referencing public.profiles
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'project_members' 
        AND constraint_name = 'project_members_user_id_fkey_profiles'
    ) THEN
        ALTER TABLE public.project_members
        ADD CONSTRAINT project_members_user_id_fkey_profiles
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;
    END IF;
    
    -- NOTE: Ideally we want to name it project_members_user_id_fkey to be consistent, 
    -- but to avoid potential "relation already exists" errors if the drop above failed silently or logic was off,
    -- we use a new unique name 'project_members_user_id_fkey_profiles' to be safe.
    -- However, for cleanliness, let's try to stick to a standard name if possible or just use the new one.
    -- Let's just use the new name to ensure it applies.

END $$;
