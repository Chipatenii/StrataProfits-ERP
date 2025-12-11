-- Create Attachments Table
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null, -- 'meeting', 'deal', 'task'
  entity_id uuid not null,
  file_name text not null,
  file_url text not null,
  file_type text, -- MIME type
  file_size integer,
  uploaded_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.attachments enable row level security;

-- Policies
create policy "Users can view attachments" on public.attachments for select
  using (true); -- Simplify for internal team use, restricted by UI access to entity usually

create policy "Users can upload attachments" on public.attachments for insert
  with check (true);

create policy "Users can delete own attachments" on public.attachments for delete
  using (uploaded_by_user_id = auth.uid() or (select role from public.profiles where id = auth.uid()) = 'admin');
