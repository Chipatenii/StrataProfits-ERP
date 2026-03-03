-- Supabase Migration Script
-- Purpose: Add "team_payments" table to record payroll history for team members

CREATE TABLE IF NOT EXISTS public.team_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'ZMW',
    payment_method TEXT NOT NULL,
    reference TEXT,
    notes TEXT,
    paid_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    period_start DATE,
    period_end DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS)
ALTER TABLE public.team_payments ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated admins and bookkeepers
CREATE POLICY "Allow read access for admin and bookkeepers" ON public.team_payments
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'book_keeper')
        )
    );

-- Allow insert/update/delete access for authenticated admins and bookkeepers
CREATE POLICY "Allow all access for admin and bookkeepers" ON public.team_payments
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'book_keeper')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'book_keeper')
        )
    );
