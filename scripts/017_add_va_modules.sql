-- Create Invoices Table
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete set null,
  
  invoice_number text, -- Optional manual number
  amount numeric(10, 2) not null,
  currency text default 'USD',
  status text check (status in ('draft', 'sent', 'paid', 'overdue', 'cancelled')) default 'draft',
  due_date date,
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by_user_id uuid references public.profiles(id)
);

-- Enable RLS for Invoices
alter table public.invoices enable row level security;

create policy "Admins and VAs can manage invoices" on public.invoices
  for all using (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'virtual_assistant')
  );

-- Create SOPs Table
create table if not exists public.sops (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text, -- Markdown content
  category text,
  tags text[],
  links jsonb, -- Array of { title: string, url: string }
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  last_updated_by_user_id uuid references public.profiles(id)
);

-- Enable RLS for SOPs
alter table public.sops enable row level security;

-- Everyone can view SOPs (knowledge base)
create policy "Team can view SOPs" on public.sops
  for select using (true);

-- Only Admin and VA can edit SOPs
create policy "Admins and VAs can manage SOPs" on public.sops
  for all using (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'virtual_assistant')
  );
