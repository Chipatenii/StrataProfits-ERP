-- Add detailed fields to clients table
alter table public.clients
add column if not exists address text,
add column if not exists phone text,
add column if not exists tpin text,
add column if not exists email text;

-- Ensure RLS allows access (policies usually on table, columns inherit, but good to verify existing policies cover updates)
-- Existing policies likely cover insert/update for admins. 
-- We might need to ensure VAs can read these for creating invoices.
-- (Already handled by previous VA role updates, but this script ensures the columns exist)
