-- 1. Clients Module
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_name text,
  phone text,
  email text,
  location text, -- City/Country
  type text default 'mixed', -- 'dev', 'design', 'marketing', 'mixed'
  value_tier text default 'Standard', -- 'Standard', 'Premium', 'HighValue'
  status text default 'Active', -- 'Lead', 'Active', 'Dormant', 'Past'
  notes text,
  social_facebook text,
  social_instagram text,
  social_tiktok text,
  social_website text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Add client_id to projects if not exists
do $$ 
begin 
    if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'client_id') then
        alter table public.projects add column client_id uuid references public.clients(id) on delete set null;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'type') then
        alter table public.projects add column type text default 'General';
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'start_date') then
        alter table public.projects add column start_date date;
    end if;
     if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'due_date') then
        alter table public.projects add column due_date date;
    end if;
     if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'estimated_value') then
        alter table public.projects add column estimated_value numeric(12, 2);
    end if;
      if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'actual_value') then
        alter table public.projects add column actual_value numeric(12, 2);
    end if;
end $$;


-- 2. Sales Pipeline / Deals
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  stage text default 'NewLead', -- 'NewLead', 'Qualified', 'ProposalSent', 'Negotiation', 'Won', 'Lost'
  estimated_value numeric(12, 2) default 0,
  currency text default 'ZMW',
  probability integer default 0, -- 0-100
  expected_close_date date,
  actual_close_date date,
  lost_reason text,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 3. Meetings & Logistics
create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  requested_by_user_id uuid references auth.users(id) on delete set null,
  assigned_to_user_id uuid references auth.users(id) on delete set null,
  title text not null,
  type text default 'General', -- 'Discovery', 'Review', 'Renewal', 'Strategy'
  mode text default 'Zoom', -- 'InPerson', 'Zoom', 'GoogleMeet', 'PhoneCall'
  location text,
  date_time_start timestamp with time zone not null,
  date_time_end timestamp with time zone,
  status text default 'Proposed', -- 'Proposed', 'Approved', 'Completed', 'Cancelled'
  agenda text,
  meeting_notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 4. Expenses
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  meeting_id uuid references public.meetings(id) on delete set null,
  submitted_by_user_id uuid references auth.users(id) on delete set null,
  category text default 'Other', -- 'Transport', 'Data', 'OfficeSpace', 'Meal', 'Other'
  amount numeric(12, 2) not null,
  currency text default 'ZMW',
  description text,
  receipt_url text,
  status text default 'Pending', -- 'Pending', 'Approved', 'Rejected', 'Paid'
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 5. Task Templates
create table if not exists public.task_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  service_type text default 'Dev', -- 'Dev', 'Design', 'Marketing'
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.task_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.task_templates(id) on delete cascade,
  name text not null,
  description text,
  default_assignee_role text, -- 'admin', 'team_member', etc
  default_estimated_hours numeric(5, 2),
  order_index integer default 0,
  created_at timestamp with time zone default now()
);

-- 6. Collaboration (Comments)
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null, -- 'task', 'project', 'deal', 'meeting'
  entity_id uuid not null,
  author_user_id uuid references auth.users(id) on delete set null,
  content text not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.clients enable row level security;
alter table public.deals enable row level security;
alter table public.meetings enable row level security;
alter table public.expenses enable row level security;
alter table public.task_templates enable row level security;
alter table public.task_template_items enable row level security;
alter table public.comments enable row level security;

-- Policies (Simplified for internal tool: Admin full access, Members view/some edit)

-- CLIENTS
create policy "Admins can manage clients" on public.clients for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Members can view clients" on public.clients for select
  using (true); -- Open visibility for team context

-- DEALS
create policy "Admins can manage deals" on public.deals for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Members can view deals" on public.deals for select
  using (true);

-- MEETINGS
create policy "Users can view relevant meetings" on public.meetings for select
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin' 
    OR requested_by_user_id = auth.uid() 
    OR assigned_to_user_id = auth.uid()
  );

create policy "Users can manage their own meetings" on public.meetings for all
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin' 
    OR requested_by_user_id = auth.uid()
  );

-- EXPENSES
create policy "Admins manage all expenses" on public.expenses for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Members manage own expenses" on public.expenses for all
  using (submitted_by_user_id = auth.uid());

-- TEMPLATES
create policy "Admins manage templates" on public.task_templates for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Members view templates" on public.task_templates for select
  using (true);

create policy "Admins manage template items" on public.task_template_items for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Members view template items" on public.task_template_items for select
  using (true);

-- COMMENTS
create policy "Users can view comments" on public.comments for select using (true);

create policy "Users can create comments" on public.comments for insert with check (auth.uid() = author_user_id);
