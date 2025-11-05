-- Update the role constraint to include new role options
alter table public.profiles drop constraint if exists profiles_role_check;

alter table public.profiles 
add constraint profiles_role_check 
check (role in ('admin', 'team_member', 'graphic_designer', 'virtual_assistant', 'social_media_manager', 'developer'));
