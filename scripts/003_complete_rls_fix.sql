-- Drop all existing problematic policies
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Users can view their own time logs" on public.time_logs;
drop policy if exists "Users can create time logs for themselves" on public.time_logs;
drop policy if exists "Users can update their own time logs" on public.time_logs;
drop policy if exists "Admins can view all time logs" on public.time_logs;
drop policy if exists "Users can view tasks assigned to them" on public.tasks;
drop policy if exists "Admins can view all tasks" on public.tasks;
drop policy if exists "Admins can create tasks" on public.tasks;
drop policy if exists "Admins can update all tasks" on public.tasks;
drop policy if exists "Admins can delete all tasks" on public.tasks;

-- Profiles policies - each user can only see themselves
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Time logs policies - each user can only see their own
create policy "Users can view their own time logs"
  on public.time_logs for select
  using (auth.uid() = user_id);

create policy "Users can create time logs for themselves"
  on public.time_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own time logs"
  on public.time_logs for update
  using (auth.uid() = user_id);

-- Tasks policies - users can view tasks assigned to them
create policy "Users can view tasks assigned to them"
  on public.tasks for select
  using (auth.uid() = assigned_to);

create policy "Users can update their own tasks"
  on public.tasks for update
  using (auth.uid() = assigned_to);

-- Bypass RLS for server-side admin operations is handled via service role key in server components
