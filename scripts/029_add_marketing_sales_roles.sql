-- Migration: Add 'marketing' and 'sales' roles to profiles table
-- Description: Extends the role check constraint to include new team member roles
-- Safe migration: Does not alter existing data or permissions

-- Update the role check constraint on profiles table
-- First drop the existing constraint, then add the updated one

-- Note: The exact constraint name may vary. If the below fails, 
-- query pg_constraint to find the actual name:
-- SELECT conname FROM pg_constraint WHERE conrelid = 'profiles'::regclass AND contype = 'c';

DO $$ 
BEGIN
    -- Try to drop the existing role check constraint
    -- Common constraint names used in this project
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check' AND conrelid = 'profiles'::regclass) THEN
        ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_role' AND conrelid = 'profiles'::regclass) THEN
        ALTER TABLE profiles DROP CONSTRAINT valid_role;
    END IF;
END $$;

-- Add the updated constraint with new roles
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN (
    'admin', 
    'team_member', 
    'virtual_assistant', 
    'developer', 
    'social_media_manager', 
    'book_keeper',
    'marketing',
    'sales'
));

-- Verify the constraint was added (query will show constraint details)
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'profiles'::regclass AND contype = 'c';
