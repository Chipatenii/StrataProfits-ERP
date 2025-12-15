-- ==========================================
-- Strata ERP: Enhanced RLS Policies
-- ==========================================

-- Ensure book_keeper can view clients/projects/deals for context
DO $$
BEGIN
  -- Clients: book_keeper read access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'clients' AND policyname = 'Book keeper view clients'
  ) THEN
    CREATE POLICY "Book keeper view clients" ON public.clients
      FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'book_keeper')
      );
  END IF;

  -- Deals: book_keeper read access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'deals' AND policyname = 'Book keeper view deals'
  ) THEN
    CREATE POLICY "Book keeper view deals" ON public.deals
      FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'book_keeper')
      );
  END IF;

  -- VA: Full deals access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'deals' AND policyname = 'VA manage deals'
  ) THEN
    CREATE POLICY "VA manage deals" ON public.deals
      FOR ALL
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'virtual_assistant')
      );
  END IF;

  -- VA: Full clients access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'clients' AND policyname = 'VA manage clients'
  ) THEN
    CREATE POLICY "VA manage clients" ON public.clients
      FOR ALL
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'virtual_assistant')
      );
  END IF;

  -- VA: View invoices (for sending reminders)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'invoices' AND policyname = 'VA view invoices'
  ) THEN
    CREATE POLICY "VA view invoices" ON public.invoices
      FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'virtual_assistant')
      );
  END IF;

  -- Book keeper: Full finance access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'invoices' AND policyname = 'Book keeper manage invoices'
  ) THEN
    CREATE POLICY "Book keeper manage invoices" ON public.invoices
      FOR ALL
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'book_keeper')
      );
  END IF;

  -- Book keeper: Full expenses access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'expenses' AND policyname = 'Book keeper manage expenses'
  ) THEN
    CREATE POLICY "Book keeper manage expenses" ON public.expenses
      FOR ALL
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'book_keeper')
      );
  END IF;
END $$;

-- ==========================================
-- Invoice Status Sync Trigger
-- ==========================================

-- Function to derive invoice status from payments
CREATE OR REPLACE FUNCTION sync_invoice_status()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_total NUMERIC;
  v_paid_total NUMERIC;
  v_due_date DATE;
  v_new_status TEXT;
BEGIN
  -- Get invoice total (from items or fallback to amount)
  SELECT 
    COALESCE(
      (SELECT SUM(total) FROM invoice_items WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)),
      i.amount
    ),
    i.due_date::DATE
  INTO v_invoice_total, v_due_date
  FROM invoices i
  WHERE i.id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  -- Get total payments
  SELECT COALESCE(SUM(amount), 0)
  INTO v_paid_total
  FROM payments
  WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  -- Derive status
  IF v_paid_total >= v_invoice_total THEN
    v_new_status := 'paid';
  ELSIF v_due_date < CURRENT_DATE AND v_paid_total < v_invoice_total THEN
    v_new_status := 'overdue';
  ELSE
    v_new_status := 'sent'; -- Keep as sent if not paid/overdue
  END IF;

  -- Update invoice status
  UPDATE invoices
  SET status = v_new_status
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id)
    AND status != 'draft'; -- Don't auto-update drafts

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger (idempotent)
DROP TRIGGER IF EXISTS payment_sync_invoice_status ON payments;
CREATE TRIGGER payment_sync_invoice_status
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION sync_invoice_status();

-- ==========================================
-- Invoice Amount Sync from Items
-- ==========================================

CREATE OR REPLACE FUNCTION sync_invoice_amount()
RETURNS TRIGGER AS $$
DECLARE
  v_items_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(total), 0)
  INTO v_items_total
  FROM invoice_items
  WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  -- Sync to invoices.amount for backward compatibility
  UPDATE invoices
  SET amount = v_items_total
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id)
    AND v_items_total > 0;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS items_sync_invoice_amount ON invoice_items;
CREATE TRIGGER items_sync_invoice_amount
AFTER INSERT OR UPDATE OR DELETE ON invoice_items
FOR EACH ROW
EXECUTE FUNCTION sync_invoice_amount();
