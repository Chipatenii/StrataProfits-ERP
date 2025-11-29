-- Fix handle_new_user function to respect the role passed in metadata
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
    coalesce(new.raw_user_meta_data ->> 'role', 'team_member') -- Use role from metadata or default to team_member
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    role = excluded.role;
  return new;
end;
$$;
