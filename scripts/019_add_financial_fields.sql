-- Add financial fields to invoices
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS order_number text,
ADD COLUMN IF NOT EXISTS terms text,
ADD COLUMN IF NOT EXISTS customer_notes text,
ADD COLUMN IF NOT EXISTS discount_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS adjustment numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_tax_inclusive boolean DEFAULT false;

-- Add tax fields to invoice items
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS tax_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0;

-- Add financial fields to quotes
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS reference_number text,
ADD COLUMN IF NOT EXISTS terms text,
ADD COLUMN IF NOT EXISTS customer_notes text,
ADD COLUMN IF NOT EXISTS discount_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS adjustment numeric DEFAULT 0;

-- Add tax fields to quote items
ALTER TABLE quote_items
ADD COLUMN IF NOT EXISTS tax_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0;

-- Add receipt number to payments
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS receipt_number text;
