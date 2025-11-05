-- Create profiles table with user data
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text unique,
  role text default 'team_member', -- 'admin' or 'team_member'
  created_at timestamp with time zone default now()
);

-- Create time logs table for clock in/out tracking
create table if not exists public.time_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid,
  clock_in timestamp with time zone not null,
  clock_out timestamp with time zone,
  duration_minutes integer default 0,
  created_at timestamp with time zone default now()
);

-- Create tasks table for admin to create tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text default 'pending', -- 'pending', 'in-progress', 'completed'
  priority text default 'medium', -- 'low', 'medium', 'high'
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  due_date timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.time_logs enable row level security;
alter table public.tasks enable row level security;

-- Profiles policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Time logs policies
create policy "Users can view their own time logs"
  on public.time_logs for select
  using (auth.uid() = user_id);

create policy "Users can create time logs for themselves"
  on public.time_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own time logs"
  on public.time_logs for update
  using (auth.uid() = user_id);

create policy "Admins can view all time logs"
  on public.time_logs for select
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Tasks policies
create policy "Users can view tasks assigned to them"
  on public.tasks for select
  using (auth.uid() = assigned_to or (select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Admins can create tasks"
  on public.tasks for insert
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Admins can update all tasks"
  on public.tasks for update
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Admins can delete all tasks"
  on public.tasks for delete
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    'team_member'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
