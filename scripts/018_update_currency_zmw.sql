-- Update default values for currency columns
ALTER TABLE invoices ALTER COLUMN currency SET DEFAULT 'ZMW';
ALTER TABLE quotes ALTER COLUMN currency SET DEFAULT 'ZMW';
ALTER TABLE projects ALTER COLUMN currency SET DEFAULT 'ZMW';

-- Update existing records that are set to USD
UPDATE invoices SET currency = 'ZMW' WHERE currency = 'USD';
UPDATE quotes SET currency = 'ZMW' WHERE currency = 'USD';
UPDATE projects SET currency = 'ZMW' WHERE currency = 'USD';
