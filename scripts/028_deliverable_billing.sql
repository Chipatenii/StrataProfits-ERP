-- Stage 5: Deliverable Billing & Financial Integration

-- 1. Add billing columns to deliverables
ALTER TABLE deliverables 
ADD COLUMN IF NOT EXISTS total_price NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS billing_type TEXT DEFAULT 'fixed' CHECK (billing_type IN ('fixed', 'hourly')),
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- 2. Add index for invoice lookup
CREATE INDEX IF NOT EXISTS idx_deliverables_invoice_id ON deliverables(invoice_id);

-- 3. (Optional) Constraint: If billing_type is 'fixed', total_price should ideally be > 0.
-- We'll keep it flexible for now.
