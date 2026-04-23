-- ============================================================================
-- 044_add_google_integration.sql
-- Stores OAuth tokens for external integrations (Google Drive, etc).
-- Only accessed via service-role (server-side). RLS blocks all direct client reads.
-- ============================================================================

CREATE TABLE IF NOT EXISTS integration_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL UNIQUE,
    account_email TEXT,
    refresh_token TEXT NOT NULL,
    access_token TEXT,
    expires_at TIMESTAMPTZ,
    connected_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;

-- No policies defined: Supabase RLS denies-by-default, so only the service role
-- (which bypasses RLS) can read or write. Client-side Supabase calls will see zero rows.
