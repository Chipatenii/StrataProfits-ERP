-- Add 'virtual_assistant' to valid roles
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'team_member', 'virtual_assistant'));
