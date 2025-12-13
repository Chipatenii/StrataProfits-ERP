-- Rename the old constraint (optional, or just drop it)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add the new constraint with all allowed roles
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'team_member', 'virtual_assistant', 'developer', 'social_media_manager', 'book_keeper'));
