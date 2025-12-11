-- Fix invalid roles first (set to 'team_member' default if not recognized)
update public.profiles 
set role = 'team_member' 
where role not in ('admin', 'team_member', 'virtual_assistant');

-- Drop old constraint
alter table public.profiles drop constraint if exists profiles_role_check;

-- Add new constraint
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'team_member', 'virtual_assistant'));
