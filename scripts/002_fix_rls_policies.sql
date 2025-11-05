-- Drop existing problematic policies
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Users can view their own time logs" on public.time_logs;
drop policy if exists "Users can create time logs for themselves" on public.time_logs;
drop policy if exists "Users can update their own time logs" on public.time_logs;
drop policy if exists "Admins can view all time logs" on public.time_logs;
drop policy if exists "Users can view tasks assigned to them" on public.tasks;
drop policy if exists "Admins can create tasks" on public.tasks;
drop policy if exists "Admins can update all tasks" on public.tasks;
drop policy if exists "Admins can delete all tasks" on public.tasks;

-- Add admin column with custom claim or use app-level logic
-- For now, we'll make profiles policy simpler and use app-level role checking

-- New Profiles policies - simplified
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Admins viewing other profiles happens at app level for now
-- or we can allow all reads and filter at app level

-- Time logs policies - simplified
create policy "Users can view their own time logs"
  on public.time_logs for select
  using (auth.uid() = user_id);

create policy "Users can create time logs for themselves"
  on public.time_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own time logs"
  on public.time_logs for update
  using (auth.uid() = user_id);

-- Tasks policies - simplified
create policy "Users can view tasks assigned to them"
  on public.tasks for select
  using (auth.uid() = assigned_to);

create policy "Admins can view all tasks"
  on public.tasks for select
  using (true);

create policy "Admins can create tasks"
  on public.tasks for insert
  with check (true);

create policy "Admins can update all tasks"
  on public.tasks for update
  using (true);

create policy "Admins can delete all tasks"
  on public.tasks for delete
  using (true);
