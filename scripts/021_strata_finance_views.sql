-- ==========================================
-- Strata ERP: Finance Reporting Views
-- ==========================================

-- Invoice Totals and Balances (with items + payments)
CREATE OR REPLACE VIEW invoice_totals_and_balances AS
SELECT 
  i.id,
  i.invoice_number,
  i.client_id,
  c.name AS client_name,
  i.project_id,
  p.name AS project_name,
  i.currency,
  i.status,
  i.due_date,
  i.created_at,
  -- Total from items or header
  COALESCE(
    (SELECT SUM(ii.total) FROM invoice_items ii WHERE ii.invoice_id = i.id),
    i.amount
  ) AS invoice_total,
  -- Paid amount
  COALESCE(
    (SELECT SUM(py.amount) FROM payments py WHERE py.invoice_id = i.id),
    0
  ) AS paid_amount,
  -- Balance
  COALESCE(
    (SELECT SUM(ii.total) FROM invoice_items ii WHERE ii.invoice_id = i.id),
    i.amount
  ) - COALESCE(
    (SELECT SUM(py.amount) FROM payments py WHERE py.invoice_id = i.id),
    0
  ) AS balance
FROM invoices i
LEFT JOIN clients c ON i.client_id = c.id
LEFT JOIN projects p ON i.project_id = p.id;

-- AR Aging Buckets
CREATE OR REPLACE VIEW ar_aging_buckets AS
SELECT 
  'current' AS bucket,
  COUNT(*) AS count,
  COALESCE(SUM(balance), 0) AS total
FROM invoice_totals_and_balances
WHERE status != 'draft' AND balance > 0
  AND (due_date IS NULL OR due_date >= CURRENT_DATE)
UNION ALL
SELECT 
  '1-30 days' AS bucket,
  COUNT(*) AS count,
  COALESCE(SUM(balance), 0) AS total
FROM invoice_totals_and_balances
WHERE status != 'draft' AND balance > 0
  AND due_date < CURRENT_DATE
  AND due_date >= CURRENT_DATE - INTERVAL '30 days'
UNION ALL
SELECT 
  '31-60 days' AS bucket,
  COUNT(*) AS count,
  COALESCE(SUM(balance), 0) AS total
FROM invoice_totals_and_balances
WHERE status != 'draft' AND balance > 0
  AND due_date < CURRENT_DATE - INTERVAL '30 days'
  AND due_date >= CURRENT_DATE - INTERVAL '60 days'
UNION ALL
SELECT 
  '61-90 days' AS bucket,
  COUNT(*) AS count,
  COALESCE(SUM(balance), 0) AS total
FROM invoice_totals_and_balances
WHERE status != 'draft' AND balance > 0
  AND due_date < CURRENT_DATE - INTERVAL '60 days'
  AND due_date >= CURRENT_DATE - INTERVAL '90 days'
UNION ALL
SELECT 
  '90+ days' AS bucket,
  COUNT(*) AS count,
  COALESCE(SUM(balance), 0) AS total
FROM invoice_totals_and_balances
WHERE status != 'draft' AND balance > 0
  AND due_date < CURRENT_DATE - INTERVAL '90 days';

-- Client Profitability
CREATE OR REPLACE VIEW client_profit_summary AS
SELECT 
  c.id AS client_id,
  c.name AS client_name,
  COUNT(DISTINCT p.id) AS project_count,
  -- Revenue
  COALESCE(SUM(DISTINCT itb.invoice_total) FILTER (WHERE itb.status != 'draft'), 0) AS revenue_invoiced,
  COALESCE(SUM(DISTINCT itb.paid_amount), 0) AS revenue_collected,
  -- Expenses
  COALESCE(SUM(e.amount) FILTER (WHERE e.status IN ('Approved', 'Paid')), 0) AS total_expenses,
  -- Profit
  COALESCE(SUM(DISTINCT itb.paid_amount), 0) - COALESCE(SUM(e.amount) FILTER (WHERE e.status IN ('Approved', 'Paid')), 0) AS net_profit
FROM clients c
LEFT JOIN projects p ON p.client_id = c.id
LEFT JOIN invoice_totals_and_balances itb ON itb.client_id = c.id
LEFT JOIN expenses e ON e.client_id = c.id
GROUP BY c.id, c.name;

-- Monthly Revenue Summary
CREATE OR REPLACE VIEW monthly_revenue_summary AS
SELECT 
  DATE_TRUNC('month', py.paid_at)::DATE AS month,
  COUNT(DISTINCT py.invoice_id) AS invoices_paid,
  SUM(py.amount) AS revenue_collected
FROM payments py
GROUP BY 1
ORDER BY 1 DESC;
