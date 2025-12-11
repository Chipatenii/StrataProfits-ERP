-- Allow Virtual Assistants to manage deals
drop policy if exists "Admins can manage deals" on public.deals;

create policy "Admins and VAs can manage deals" on public.deals for all
  using (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'virtual_assistant')
  );
