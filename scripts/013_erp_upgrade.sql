-- ==========================================
-- 1. Modify Existing Tables
-- ==========================================

-- PROJECTS: Link to Clients + Audit
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);
-- Enable audit/RLS helper index
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);

-- INVOICES: Link to Projects
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);


-- ==========================================
-- 2. New Tables (Finance & Sales)
-- ==========================================

-- INVOICE ITEMS
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    unit_price NUMERIC NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    total NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'ZMW',
    method TEXT CHECK (method IN ('cash', 'bank_transfer', 'mobile_money', 'card', 'other')),
    reference TEXT,
    paid_at TIMESTAMPTZ DEFAULT now(),
    received_by_user_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- QUOTES
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id),
    deal_id UUID REFERENCES deals(id),
    project_id UUID REFERENCES projects(id),
    quote_number TEXT UNIQUE,
    currency TEXT DEFAULT 'ZMW',
    status TEXT CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')) DEFAULT 'draft',
    valid_until DATE,
    notes TEXT,
    terms TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- QUOTE ITEMS
CREATE TABLE IF NOT EXISTS quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    unit_price NUMERIC NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    total NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. New Tables (Approvals & Audit)
-- ==========================================

-- APPROVAL REQUESTS
CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'time_log', 'expense', 'invoice', 'quote', 'meeting')),
    entity_id UUID NOT NULL,
    requested_by_user_id UUID NOT NULL REFERENCES profiles(id),
    assigned_to_user_id UUID REFERENCES profiles(id),
    assigned_role TEXT, -- e.g., 'admin', 'manager'
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    decision_note TEXT,
    decided_by_user_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    decided_at TIMESTAMPTZ
);
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

-- ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- 4. RLS Policies
-- ==========================================

-- Helper: Check role
-- (Assumes public.profiles map auth.uid() -> id)

-- INVOICE ITEMS related policies (inherit from invoices usually, but explicit here)
CREATE POLICY "Admin/Bookkeeper manage invoice items" ON invoice_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'book_keeper')
        )
    );
    
CREATE POLICY "VA view invoice items" ON invoice_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'virtual_assistant'
        )
    );

-- PAYMENTS
CREATE POLICY "Admin/Bookkeeper manage payments" ON payments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'book_keeper')
        )
    );

-- QUOTES & QUOTE ITEMS
CREATE POLICY "Admin/VA manage quotes" ON quotes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'virtual_assistant', 'book_keeper')
        )
    );
    
CREATE POLICY "Admin/VA manage quote items" ON quote_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'virtual_assistant', 'book_keeper')
        )
    );

-- APPROVAL REQUESTS
-- Admins can see all. Users can see their own requests.
CREATE POLICY "Admins manage all approvals" ON approval_requests
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'book_keeper') -- Book keeper needs to approve expenses
        )
    );

CREATE POLICY "Users view create own approvals" ON approval_requests
    FOR ALL
    USING (requested_by_user_id = auth.uid());
    
-- ACTIVITY LOGS
-- Admins view all. System writes.
CREATE POLICY "Admins view logs" ON activity_logs
    FOR SELECT
    USING (
         EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
    
CREATE POLICY "Users insert logs" ON activity_logs
    FOR INSERT
    WITH CHECK (actor_user_id = auth.uid());


-- ==========================================
-- 5. Reporting Views
-- ==========================================

-- Project Profitability View
CREATE OR REPLACE VIEW project_profit_summary AS
SELECT 
    p.id AS project_id,
    p.name AS project_name,
    p.client_id,
    c.name AS client_name,
    -- Revenue
    COALESCE(SUM(i.amount) FILTER (WHERE i.status != 'draft'), 0) AS revenue_invoiced,
    COALESCE(SUM(pay.amount), 0) AS revenue_collected,
    -- Costs (Expenses)
    COALESCE(SUM(e.amount) FILTER (WHERE e.status = 'Approved'), 0) AS expense_cost,
    -- Profit (Collected - Expenses)
    (COALESCE(SUM(pay.amount), 0) - COALESCE(SUM(e.amount) FILTER (WHERE e.status = 'Approved'), 0)) AS net_profit
FROM projects p
LEFT JOIN clients c ON p.client_id = c.id
LEFT JOIN invoices i ON i.project_id = p.id
LEFT JOIN payments pay ON pay.invoice_id = i.id
LEFT JOIN expenses e ON e.project_id = p.id
GROUP BY p.id, p.name, p.client_id, c.name;

-- Cashflow Summary View (Monthly)
CREATE OR REPLACE VIEW cashflow_summary AS
SELECT
    DATE_TRUNC('month', transaction_date)::DATE as month,
    SUM(CASE WHEN type = 'IN' THEN amount ELSE 0 END) as cash_in,
    SUM(CASE WHEN type = 'OUT' THEN amount ELSE 0 END) as cash_out,
    SUM(CASE WHEN type = 'IN' THEN amount ELSE -amount END) as net_cash
FROM (
    SELECT paid_at as transaction_date, amount, 'IN' as type FROM payments
    UNION ALL
    SELECT created_at as transaction_date, amount, 'OUT' as type FROM expenses WHERE status = 'Paid'
) as transactions
GROUP BY 1
ORDER BY 1 DESC;
