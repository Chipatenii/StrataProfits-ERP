-- Add new columns to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS tpin TEXT,
ADD COLUMN IF NOT EXISTS contact_person TEXT;

-- Update the view if it exists (views often need to be dropped and recreated if they select *)
-- But since we are using explicit selects in most places, just the table alter is fine for now.
-- We might need to refresh types.
