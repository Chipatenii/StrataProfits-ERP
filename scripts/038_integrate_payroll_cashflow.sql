-- ==========================================
-- Strata ERP: Integrate Payroll into Cashflow
-- ==========================================

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
    UNION ALL
    SELECT payment_date as transaction_date, amount, 'OUT' as type FROM team_payments
) as transactions
GROUP BY 1
ORDER BY 1 DESC;
