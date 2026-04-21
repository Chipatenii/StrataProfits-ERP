-- ============================================================================
-- 042_add_gl_accounting.sql
-- Phase 1: Double-entry General Ledger + Chart of Accounts
--
-- Scope:
--   - accounts (Chart of Accounts)
--   - exchange_rates (multi-currency support, base = ZMW)
--   - journal_entries + journal_lines (the ledger)
--   - FX columns on invoices, payments, expenses, quotes
--   - Helper mapping columns on payments/expenses to target GL accounts
--   - Seed Zambian SMB chart of accounts
--   - RLS: admin + book_keeper manage; others read-only where relevant
--
-- Mode: CASH BASIS accounting. Revenue and expense are recognized on
--       payment, not on invoice/bill. See lib/ledger/post.ts for posting rules.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0) Ensure get_my_role() exists (RLS depends on it). Safe to re-run.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- 1) Chart of Accounts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    type text NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    subtype text,
    parent_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
    currency text NOT NULL DEFAULT 'ZMW',
    description text,
    is_active boolean NOT NULL DEFAULT true,
    is_system boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accounts_type ON public.accounts (type);
CREATE INDEX IF NOT EXISTS idx_accounts_parent ON public.accounts (parent_id);
CREATE INDEX IF NOT EXISTS idx_accounts_active ON public.accounts (is_active) WHERE is_active = true;

-- ---------------------------------------------------------------------------
-- 2) Exchange Rates (base currency: ZMW)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exchange_rates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency text NOT NULL,
    to_currency text NOT NULL DEFAULT 'ZMW',
    rate numeric(18, 8) NOT NULL CHECK (rate > 0),
    effective_date date NOT NULL,
    source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'xe', 'boz', 'api')),
    created_by uuid REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT exchange_rates_unique UNIQUE (from_currency, to_currency, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup
    ON public.exchange_rates (from_currency, to_currency, effective_date DESC);

-- ---------------------------------------------------------------------------
-- 3) Journal Entries (header) + Lines
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.journal_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_number text UNIQUE,
    entry_date date NOT NULL,
    memo text,
    source_type text NOT NULL CHECK (source_type IN (
        'invoice', 'payment', 'expense', 'payroll', 'manual', 'fx_revaluation', 'opening_balance'
    )),
    source_id uuid,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'reversed')),
    posted_at timestamptz,
    posted_by uuid REFERENCES public.profiles(id),
    reversed_by_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
    created_by uuid REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_je_date ON public.journal_entries (entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_je_source ON public.journal_entries (source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_je_status ON public.journal_entries (status);

CREATE TABLE IF NOT EXISTS public.journal_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    line_number int NOT NULL,
    account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    debit numeric(18, 2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
    credit numeric(18, 2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
    currency text NOT NULL DEFAULT 'ZMW',
    fx_rate numeric(18, 8) NOT NULL DEFAULT 1 CHECK (fx_rate > 0),
    base_debit numeric(18, 2) GENERATED ALWAYS AS (ROUND(debit * fx_rate, 2)) STORED,
    base_credit numeric(18, 2) GENERATED ALWAYS AS (ROUND(credit * fx_rate, 2)) STORED,
    memo text,
    client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT journal_lines_exclusive CHECK (
        (debit > 0 AND credit = 0) OR (debit = 0 AND credit > 0)
    )
);

CREATE INDEX IF NOT EXISTS idx_jl_entry ON public.journal_lines (entry_id);
CREATE INDEX IF NOT EXISTS idx_jl_account ON public.journal_lines (account_id);
CREATE INDEX IF NOT EXISTS idx_jl_account_entry ON public.journal_lines (account_id, entry_id);

-- ---------------------------------------------------------------------------
-- 4) Balance-check trigger on posting
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_journal_entry_balance()
RETURNS trigger AS $$
DECLARE
    total_debit numeric;
    total_credit numeric;
    line_count int;
BEGIN
    IF NEW.status = 'posted' AND (OLD.status IS DISTINCT FROM 'posted') THEN
        SELECT
            COALESCE(SUM(base_debit), 0),
            COALESCE(SUM(base_credit), 0),
            COUNT(*)
        INTO total_debit, total_credit, line_count
        FROM public.journal_lines
        WHERE entry_id = NEW.id;

        IF line_count < 2 THEN
            RAISE EXCEPTION 'Journal entry % must have at least 2 lines (has %)', NEW.id, line_count;
        END IF;

        IF total_debit <> total_credit THEN
            RAISE EXCEPTION 'Journal entry % is unbalanced: debits=% credits=%',
                NEW.id, total_debit, total_credit;
        END IF;

        NEW.posted_at := COALESCE(NEW.posted_at, now());
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_je_balance ON public.journal_entries;
CREATE TRIGGER trg_check_je_balance
    BEFORE UPDATE ON public.journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.check_journal_entry_balance();

-- Prevent modifying lines on a posted entry
CREATE OR REPLACE FUNCTION public.prevent_posted_line_changes()
RETURNS trigger AS $$
DECLARE
    entry_status text;
BEGIN
    SELECT status INTO entry_status
    FROM public.journal_entries
    WHERE id = COALESCE(NEW.entry_id, OLD.entry_id);

    IF entry_status IN ('posted', 'reversed') THEN
        RAISE EXCEPTION 'Cannot modify lines of a % journal entry', entry_status;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lock_posted_lines_iud ON public.journal_lines;
CREATE TRIGGER trg_lock_posted_lines_iud
    BEFORE INSERT OR UPDATE OR DELETE ON public.journal_lines
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_posted_line_changes();

-- ---------------------------------------------------------------------------
-- 5) Sequential entry_number (JE-YYYY-NNNNN)
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.journal_entry_number_seq;

CREATE OR REPLACE FUNCTION public.assign_entry_number()
RETURNS trigger AS $$
BEGIN
    IF NEW.entry_number IS NULL THEN
        NEW.entry_number := 'JE-' || to_char(NEW.entry_date, 'YYYY') || '-' ||
            LPAD(nextval('public.journal_entry_number_seq')::text, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_je_number ON public.journal_entries;
CREATE TRIGGER trg_assign_je_number
    BEFORE INSERT ON public.journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_entry_number();

-- ---------------------------------------------------------------------------
-- 6) Multi-currency columns on existing finance tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS exchange_rate numeric(18, 8) NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS base_currency text NOT NULL DEFAULT 'ZMW';

ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS exchange_rate numeric(18, 8) NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS base_currency text NOT NULL DEFAULT 'ZMW',
    ADD COLUMN IF NOT EXISTS cash_account_id uuid REFERENCES public.accounts(id),
    ADD COLUMN IF NOT EXISTS journal_entry_id uuid REFERENCES public.journal_entries(id);

ALTER TABLE public.expenses
    ADD COLUMN IF NOT EXISTS exchange_rate numeric(18, 8) NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS base_currency text NOT NULL DEFAULT 'ZMW',
    ADD COLUMN IF NOT EXISTS expense_account_id uuid REFERENCES public.accounts(id),
    ADD COLUMN IF NOT EXISTS paid_from_account_id uuid REFERENCES public.accounts(id),
    ADD COLUMN IF NOT EXISTS paid_at timestamptz,
    ADD COLUMN IF NOT EXISTS journal_entry_id uuid REFERENCES public.journal_entries(id);

ALTER TABLE public.quotes
    ADD COLUMN IF NOT EXISTS exchange_rate numeric(18, 8) NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS base_currency text NOT NULL DEFAULT 'ZMW';

CREATE INDEX IF NOT EXISTS idx_payments_je ON public.payments (journal_entry_id) WHERE journal_entry_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_je ON public.expenses (journal_entry_id) WHERE journal_entry_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 7) Seed Zambian SMB Chart of Accounts (system accounts)
-- ---------------------------------------------------------------------------
INSERT INTO public.accounts (code, name, type, subtype, is_system, description) VALUES
    -- 1000s Assets
    ('1000', 'Cash on Hand', 'asset', 'current_asset', true, 'Petty cash and physical currency'),
    ('1010', 'Bank - Main Account', 'asset', 'current_asset', true, 'Primary business bank account'),
    ('1020', 'Mobile Money - MTN', 'asset', 'current_asset', true, 'MTN MoMo business wallet'),
    ('1030', 'Mobile Money - Airtel', 'asset', 'current_asset', true, 'Airtel Money business wallet'),
    ('1040', 'Mobile Money - Zamtel', 'asset', 'current_asset', true, 'Zamtel Kwacha business wallet'),
    ('1100', 'Accounts Receivable', 'asset', 'current_asset', true, 'Customer balances (tracking only on cash basis)'),
    ('1200', 'Prepaid Expenses', 'asset', 'current_asset', true, 'Expenses paid in advance'),
    ('1500', 'Fixed Assets', 'asset', 'fixed_asset', true, 'Equipment, furniture, vehicles'),
    ('1510', 'Accumulated Depreciation', 'asset', 'fixed_asset', true, 'Contra-asset for fixed asset depreciation'),
    -- 2000s Liabilities
    ('2000', 'Accounts Payable', 'liability', 'current_liability', true, 'Unpaid supplier bills'),
    ('2100', 'VAT Payable', 'liability', 'tax_liability', true, 'Output VAT owed to ZRA (16%)'),
    ('2110', 'VAT Receivable', 'liability', 'tax_liability', true, 'Input VAT to claim back'),
    ('2200', 'PAYE Payable', 'liability', 'tax_liability', true, 'Employee income tax withheld'),
    ('2210', 'NAPSA Payable', 'liability', 'tax_liability', true, 'National pension contributions (5%)'),
    ('2220', 'NHIMA Payable', 'liability', 'tax_liability', true, 'National health insurance (1%)'),
    ('2300', 'Accrued Expenses', 'liability', 'current_liability', true, 'Unpaid expenses recognized'),
    ('2400', 'Salaries Payable', 'liability', 'current_liability', true, 'Net salaries owed to employees'),
    -- 3000s Equity
    ('3000', 'Owner''s Capital', 'equity', 'owner_equity', true, 'Initial and additional owner contributions'),
    ('3100', 'Retained Earnings', 'equity', 'retained_earnings', true, 'Accumulated prior-year earnings'),
    ('3200', 'Current Year Earnings', 'equity', 'current_earnings', true, 'Current period net income (system-computed)'),
    ('3300', 'Owner''s Drawings', 'equity', 'owner_equity', true, 'Owner withdrawals'),
    -- 4000s Revenue
    ('4000', 'Service Revenue', 'revenue', 'operating_revenue', true, 'Income from services rendered'),
    ('4010', 'Product Revenue', 'revenue', 'operating_revenue', true, 'Income from product sales'),
    ('4100', 'Other Income', 'revenue', 'non_operating_revenue', true, 'Interest, FX gains, miscellaneous'),
    -- 5000s COGS
    ('5000', 'Direct Costs', 'expense', 'cogs', true, 'Costs directly attributable to revenue'),
    ('5010', 'Contractor Payments', 'expense', 'cogs', true, 'Subcontracted work'),
    -- 6000s Operating Expenses (aligned with existing expense categories)
    ('6000', 'Salaries & Wages', 'expense', 'operating_expense', true, 'Employee gross salaries'),
    ('6100', 'Rent / Office Space', 'expense', 'operating_expense', true, 'Office rent and co-working'),
    ('6200', 'Utilities', 'expense', 'operating_expense', true, 'Electricity, water, gas'),
    ('6300', 'Internet & Data', 'expense', 'operating_expense', true, 'Internet, mobile data bundles'),
    ('6400', 'Transport', 'expense', 'operating_expense', true, 'Fuel, taxi, logistics'),
    ('6500', 'Meals & Entertainment', 'expense', 'operating_expense', true, 'Client meals, team lunches'),
    ('6600', 'Software & Subscriptions', 'expense', 'operating_expense', true, 'SaaS tools, licenses'),
    ('6700', 'Marketing & Advertising', 'expense', 'operating_expense', true, 'Ads, content, events'),
    ('6800', 'Bank Charges', 'expense', 'operating_expense', true, 'Transaction fees, account fees'),
    ('6810', 'FX Losses', 'expense', 'non_operating_expense', true, 'Realized foreign exchange losses'),
    ('6900', 'Other Operating Expenses', 'expense', 'operating_expense', true, 'Uncategorized expenses'),
    -- 7000s Payroll statutory (counterparts to liabilities)
    ('7000', 'NAPSA Employer Contribution', 'expense', 'operating_expense', true, 'Employer pension contribution'),
    ('7010', 'NHIMA Employer Contribution', 'expense', 'operating_expense', true, 'Employer health insurance contribution')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 8) Seed base-currency exchange rate (ZMW -> ZMW = 1) for convenience
-- ---------------------------------------------------------------------------
INSERT INTO public.exchange_rates (from_currency, to_currency, rate, effective_date, source)
VALUES ('ZMW', 'ZMW', 1, CURRENT_DATE, 'manual')
ON CONFLICT (from_currency, to_currency, effective_date) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 9) updated_at triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_accounts_updated_at ON public.accounts;
CREATE TRIGGER trg_accounts_updated_at
    BEFORE UPDATE ON public.accounts
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_je_updated_at ON public.journal_entries;
CREATE TRIGGER trg_je_updated_at
    BEFORE UPDATE ON public.journal_entries
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 10) Row-Level Security (wrapped so failures can't roll back the schema)
-- ---------------------------------------------------------------------------
DO $rls$
BEGIN
    ALTER TABLE public.accounts         ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.exchange_rates   ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.journal_entries  ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.journal_lines    ENABLE ROW LEVEL SECURITY;

    -- accounts: admin + book_keeper manage; VA reads
    DROP POLICY IF EXISTS "accounts_read" ON public.accounts;
    CREATE POLICY "accounts_read" ON public.accounts FOR SELECT
        USING (public.get_my_role() IN ('admin', 'book_keeper', 'virtual_assistant'));

    DROP POLICY IF EXISTS "accounts_write" ON public.accounts;
    CREATE POLICY "accounts_write" ON public.accounts FOR ALL
        USING (public.get_my_role() IN ('admin', 'book_keeper'))
        WITH CHECK (public.get_my_role() IN ('admin', 'book_keeper'));

    -- exchange_rates
    DROP POLICY IF EXISTS "fx_read" ON public.exchange_rates;
    CREATE POLICY "fx_read" ON public.exchange_rates FOR SELECT
        USING (public.get_my_role() IN ('admin', 'book_keeper', 'virtual_assistant'));

    DROP POLICY IF EXISTS "fx_write" ON public.exchange_rates;
    CREATE POLICY "fx_write" ON public.exchange_rates FOR ALL
        USING (public.get_my_role() IN ('admin', 'book_keeper'))
        WITH CHECK (public.get_my_role() IN ('admin', 'book_keeper'));

    -- journal_entries
    DROP POLICY IF EXISTS "je_read" ON public.journal_entries;
    CREATE POLICY "je_read" ON public.journal_entries FOR SELECT
        USING (public.get_my_role() IN ('admin', 'book_keeper'));

    DROP POLICY IF EXISTS "je_write" ON public.journal_entries;
    CREATE POLICY "je_write" ON public.journal_entries FOR ALL
        USING (public.get_my_role() IN ('admin', 'book_keeper'))
        WITH CHECK (public.get_my_role() IN ('admin', 'book_keeper'));

    -- journal_lines
    DROP POLICY IF EXISTS "jl_read" ON public.journal_lines;
    CREATE POLICY "jl_read" ON public.journal_lines FOR SELECT
        USING (public.get_my_role() IN ('admin', 'book_keeper'));

    DROP POLICY IF EXISTS "jl_write" ON public.journal_lines;
    CREATE POLICY "jl_write" ON public.journal_lines FOR ALL
        USING (public.get_my_role() IN ('admin', 'book_keeper'))
        WITH CHECK (public.get_my_role() IN ('admin', 'book_keeper'));
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'RLS setup hit an error: % — schema is preserved; fix RLS separately.', SQLERRM;
END
$rls$;

-- ---------------------------------------------------------------------------
-- 11) Convenience views for reporting
-- ---------------------------------------------------------------------------

-- Running balance per account (posted entries only, in base currency ZMW)
CREATE OR REPLACE VIEW public.account_balances AS
SELECT
    a.id AS account_id,
    a.code,
    a.name,
    a.type,
    a.subtype,
    COALESCE(SUM(jl.base_debit), 0)  AS total_debits,
    COALESCE(SUM(jl.base_credit), 0) AS total_credits,
    CASE
        WHEN a.type IN ('asset', 'expense')
            THEN COALESCE(SUM(jl.base_debit), 0) - COALESCE(SUM(jl.base_credit), 0)
        ELSE COALESCE(SUM(jl.base_credit), 0) - COALESCE(SUM(jl.base_debit), 0)
    END AS balance
FROM public.accounts a
LEFT JOIN public.journal_lines jl ON jl.account_id = a.id
LEFT JOIN public.journal_entries je ON je.id = jl.entry_id AND je.status = 'posted'
GROUP BY a.id, a.code, a.name, a.type, a.subtype;

-- Trial balance (one row per account with non-zero activity)
CREATE OR REPLACE VIEW public.trial_balance AS
SELECT
    code,
    name,
    type,
    total_debits,
    total_credits,
    balance
FROM public.account_balances
WHERE total_debits <> 0 OR total_credits <> 0
ORDER BY code;

COMMENT ON TABLE public.accounts IS 'Chart of Accounts. Zambian SMB defaults seeded; is_system=true accounts cannot be deleted.';
COMMENT ON TABLE public.journal_entries IS 'Double-entry journal header. Posted entries are immutable; reverse via reversed_by_entry_id.';
COMMENT ON TABLE public.journal_lines IS 'Journal line. Exactly one of debit/credit > 0. base_debit/base_credit auto-computed in base currency (ZMW).';
COMMENT ON TABLE public.exchange_rates IS 'FX rates. to_currency is always base (ZMW). Seed manually from xe.com or similar.';
