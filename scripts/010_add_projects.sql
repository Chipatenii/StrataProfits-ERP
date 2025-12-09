-- Create projects table
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text default 'active', -- 'active', 'archived', 'completed'
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create project_members table
create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text default 'member', -- 'manager', 'member', 'viewer'
  joined_at timestamp with time zone default now(),
  unique(project_id, user_id)
);

-- Add project_id to tasks
do $$ 
begin 
    if not exists (select 1 from information_schema.columns where table_name = 'tasks' and column_name = 'project_id') then
        alter table public.tasks add column project_id uuid references public.projects(id) on delete set null;
    end if;
end $$;

-- Enable RLS
alter table public.projects enable row level security;
alter table public.project_members enable row level security;

-- Policies for Projects

-- Admins can view all projects
create policy "Admins can view all projects"
  on public.projects for select
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Project members can view projects they belong to
create policy "Members can view their projects"
  on public.projects for select
  using (
    id in (select project_id from public.project_members where user_id = auth.uid())
  );

-- Admins can insert/update/delete projects
create policy "Admins can manage projects"
  on public.projects for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Policies for Project Members

-- Admins can view all project members
create policy "Admins can view all project members"
  on public.project_members for select
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Members can see other members in their projects
create policy "Members can view team mates"
  on public.project_members for select
  using (
    project_id in (select project_id from public.project_members where user_id = auth.uid())
  );

-- Admins can manage project members
create policy "Admins can manage project members"
  on public.project_members for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Indexes for performance
create index if not exists idx_project_members_user on public.project_members(user_id);
create index if not exists idx_project_members_project on public.project_members(project_id);
create index if not exists idx_tasks_project on public.tasks(project_id);
