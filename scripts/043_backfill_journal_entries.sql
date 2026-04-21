-- ============================================================================
-- 043_backfill_journal_entries.sql
-- Backfill the General Ledger from historical payments and paid expenses.
--
-- Assumptions (confirmed 2026-04-20):
--   - All historical data is ZMW (exchange_rate = 1 everywhere)
--   - Cash basis: revenue recognized on payment, expense on payment
--   - Voided / deleted records are skipped entirely (not reversed)
--
-- Safe to re-run: each source record is only posted once (checked via
-- journal_entry_id on the source row).
--
-- RUN ONCE after migration 042. In Supabase SQL editor or psql.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Precondition check: 042 must have run successfully before this backfill.
-- Runs OUTSIDE the transaction so the error surfaces clearly.
-- ---------------------------------------------------------------------------
DO $pre$
DECLARE
    v_has_accounts  boolean;
    v_has_je        boolean;
    v_has_jl        boolean;
    v_account_count int;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'accounts'
    ) INTO v_has_accounts;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'journal_entries'
    ) INTO v_has_je;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'journal_lines'
    ) INTO v_has_jl;

    IF NOT v_has_accounts OR NOT v_has_je OR NOT v_has_jl THEN
        RAISE EXCEPTION E'Migration 042 has not run successfully.\n'
            '  accounts table exists:         %\n'
            '  journal_entries table exists:  %\n'
            '  journal_lines table exists:    %\n'
            'Run scripts/042_add_gl_accounting.sql first, then retry this script.',
            v_has_accounts, v_has_je, v_has_jl;
    END IF;

    SELECT COUNT(*) INTO v_account_count FROM public.accounts WHERE is_system = true;
    IF v_account_count < 30 THEN
        RAISE EXCEPTION 'Chart of Accounts is not seeded (found only % system accounts). '
            'Re-run 042 — the INSERT ... ON CONFLICT seed block must complete.', v_account_count;
    END IF;

    RAISE NOTICE 'Precondition OK: 042 schema present, % system accounts seeded.', v_account_count;
END
$pre$;

BEGIN;

DO $$
DECLARE
    v_cash          uuid;
    v_bank          uuid;
    v_mtn           uuid;
    v_airtel        uuid;
    v_zamtel        uuid;
    v_ar            uuid;
    v_revenue       uuid;
    v_exp_transport uuid;
    v_exp_data      uuid;
    v_exp_office    uuid;
    v_exp_meal      uuid;
    v_exp_other     uuid;

    v_payment       record;
    v_expense       record;
    v_entry_id      uuid;
    v_cash_acct     uuid;
    v_exp_acct      uuid;

    v_posted_payments int := 0;
    v_posted_expenses int := 0;
    v_skipped         int := 0;
BEGIN
    -- Resolve account IDs by code (seeded in 042)
    SELECT id INTO v_cash          FROM accounts WHERE code = '1000';
    SELECT id INTO v_bank          FROM accounts WHERE code = '1010';
    SELECT id INTO v_mtn           FROM accounts WHERE code = '1020';
    SELECT id INTO v_airtel        FROM accounts WHERE code = '1030';
    SELECT id INTO v_zamtel        FROM accounts WHERE code = '1040';
    SELECT id INTO v_ar            FROM accounts WHERE code = '1100';
    SELECT id INTO v_revenue       FROM accounts WHERE code = '4000';
    SELECT id INTO v_exp_transport FROM accounts WHERE code = '6400';
    SELECT id INTO v_exp_data      FROM accounts WHERE code = '6300';
    SELECT id INTO v_exp_office    FROM accounts WHERE code = '6100';
    SELECT id INTO v_exp_meal      FROM accounts WHERE code = '6500';
    SELECT id INTO v_exp_other     FROM accounts WHERE code = '6900';

    IF v_revenue IS NULL OR v_cash IS NULL THEN
        RAISE EXCEPTION 'Seed accounts not found. Run migration 042 first.';
    END IF;

    -- -----------------------------------------------------------------------
    -- PAYMENTS -> Dr Cash/Bank / Cr Service Revenue (cash basis)
    -- -----------------------------------------------------------------------
    FOR v_payment IN
        SELECT p.id, p.amount, p.currency, p.method, p.reference, p.receipt_number,
               p.paid_at, p.received_by_user_id, p.invoice_id,
               i.invoice_number, i.client_id, i.project_id
        FROM payments p
        LEFT JOIN invoices i ON i.id = p.invoice_id
        WHERE p.journal_entry_id IS NULL
        ORDER BY p.paid_at ASC
    LOOP
        v_cash_acct := CASE v_payment.method
            WHEN 'cash'          THEN v_cash
            WHEN 'bank_transfer' THEN v_bank
            WHEN 'card'          THEN v_bank
            WHEN 'mobile_money'  THEN v_mtn  -- default MTN; we have no provider column yet
            ELSE v_cash
        END;

        -- Create draft header
        INSERT INTO journal_entries (
            entry_date, memo, source_type, source_id, created_by, status
        ) VALUES (
            v_payment.paid_at::date,
            'Payment received'
                || COALESCE(' — inv ' || v_payment.invoice_number, '')
                || COALESCE(' — rcpt ' || v_payment.receipt_number, '')
                || COALESCE(' — ref ' || v_payment.reference, '')
                || ' [backfill]',
            'payment',
            v_payment.id,
            v_payment.received_by_user_id,
            'draft'
        ) RETURNING id INTO v_entry_id;

        -- Lines (all ZMW, fx=1)
        INSERT INTO journal_lines (entry_id, line_number, account_id, debit, credit, currency, fx_rate, memo, client_id, project_id)
        VALUES
            (v_entry_id, 1, v_cash_acct, v_payment.amount, 0, 'ZMW', 1, 'Cash / bank in (backfill)',
             v_payment.client_id, v_payment.project_id),
            (v_entry_id, 2, v_revenue, 0, v_payment.amount, 'ZMW', 1, 'Revenue recognized (backfill, cash basis)',
             v_payment.client_id, v_payment.project_id);

        -- Post (triggers balance check)
        UPDATE journal_entries SET status = 'posted', posted_by = v_payment.received_by_user_id
        WHERE id = v_entry_id;

        -- Link source row
        UPDATE payments SET journal_entry_id = v_entry_id WHERE id = v_payment.id;

        v_posted_payments := v_posted_payments + 1;
    END LOOP;

    -- -----------------------------------------------------------------------
    -- EXPENSES -> Dr Expense / Cr Cash (cash basis)
    --   - Only status = 'Paid' posts. Pending/Approved/Rejected are skipped.
    --   - paid_at is synthesized from updated_at when null (historical rows)
    -- -----------------------------------------------------------------------
    FOR v_expense IN
        SELECT id, category, amount, currency, description, status,
               COALESCE(paid_at, updated_at, created_at) AS paid_at_effective,
               submitted_by_user_id, client_id, project_id
        FROM expenses
        WHERE journal_entry_id IS NULL
          AND status = 'Paid'
        ORDER BY COALESCE(paid_at, updated_at, created_at) ASC
    LOOP
        v_exp_acct := CASE v_expense.category
            WHEN 'Transport'   THEN v_exp_transport
            WHEN 'Data'        THEN v_exp_data
            WHEN 'OfficeSpace' THEN v_exp_office
            WHEN 'Meal'        THEN v_exp_meal
            ELSE v_exp_other
        END;

        INSERT INTO journal_entries (entry_date, memo, source_type, source_id, created_by, status)
        VALUES (
            v_expense.paid_at_effective::date,
            'Expense — ' || COALESCE(v_expense.category, 'Other')
                || COALESCE(' — ' || v_expense.description, '')
                || ' [backfill]',
            'expense',
            v_expense.id,
            v_expense.submitted_by_user_id,
            'draft'
        ) RETURNING id INTO v_entry_id;

        INSERT INTO journal_lines (entry_id, line_number, account_id, debit, credit, currency, fx_rate, memo, client_id, project_id)
        VALUES
            (v_entry_id, 1, v_exp_acct, v_expense.amount, 0, 'ZMW', 1, 'Expense recognized (backfill)',
             v_expense.client_id, v_expense.project_id),
            (v_entry_id, 2, v_cash, 0, v_expense.amount, 'ZMW', 1, 'Paid from cash (backfill)',
             v_expense.client_id, v_expense.project_id);

        UPDATE journal_entries SET status = 'posted', posted_by = v_expense.submitted_by_user_id
        WHERE id = v_entry_id;

        UPDATE expenses
        SET journal_entry_id = v_entry_id,
            paid_at = v_expense.paid_at_effective
        WHERE id = v_expense.id;

        v_posted_expenses := v_posted_expenses + 1;
    END LOOP;

    -- Count skipped records for visibility
    SELECT COUNT(*) INTO v_skipped
    FROM expenses
    WHERE journal_entry_id IS NULL AND status <> 'Paid';

    RAISE NOTICE 'Backfill complete: % payments posted, % paid expenses posted, % non-Paid expenses skipped.',
        v_posted_payments, v_posted_expenses, v_skipped;
END;
$$;

-- Sanity check: every posted entry must balance
DO $$
DECLARE
    v_bad_count int;
BEGIN
    SELECT COUNT(*) INTO v_bad_count FROM (
        SELECT je.id
        FROM journal_entries je
        JOIN journal_lines jl ON jl.entry_id = je.id
        WHERE je.status = 'posted'
        GROUP BY je.id
        HAVING SUM(jl.base_debit) <> SUM(jl.base_credit)
    ) bad;

    IF v_bad_count > 0 THEN
        RAISE EXCEPTION 'Backfill produced % unbalanced entries. Rolling back.', v_bad_count;
    END IF;
END;
$$;

COMMIT;
