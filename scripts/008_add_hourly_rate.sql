-- Add hourly_rate column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10, 2) DEFAULT 0.00;

-- Comment on column
COMMENT ON COLUMN profiles.hourly_rate IS 'Hourly rate for the team member used for payroll calculations';
