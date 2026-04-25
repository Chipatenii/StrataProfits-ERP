-- Migration: 045_add_company_files_storage_policies
-- Description: Adds Supabase Storage RLS policies for the `company-files`
--              bucket so internal users can upload/read/delete files.
--
-- Background: Migration 033 created the public.company_files TABLE policies
-- but never created policies on storage.objects for the bucket itself, so
-- uploads were failing with "new row violates row-level security policy".

-- 1. Ensure the bucket exists. (Idempotent: insert only if missing.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-files', 'company-files', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop any prior policies on this bucket so re-runs are safe.
DROP POLICY IF EXISTS "Internal users can read company files" ON storage.objects;
DROP POLICY IF EXISTS "Internal users can upload company files" ON storage.objects;
DROP POLICY IF EXISTS "Internal users can update company files" ON storage.objects;
DROP POLICY IF EXISTS "Internal users can delete company files" ON storage.objects;

-- 3. SELECT: any authenticated non-client can read.
CREATE POLICY "Internal users can read company files"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'company-files'
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role <> 'client'
    )
);

-- 4. INSERT: any authenticated non-client can upload.
CREATE POLICY "Internal users can upload company files"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'company-files'
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role <> 'client'
    )
);

-- 5. UPDATE: uploader or admin can replace/move.
CREATE POLICY "Internal users can update company files"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'company-files'
    AND (
        owner = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role = 'admin'
        )
    )
)
WITH CHECK (
    bucket_id = 'company-files'
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role <> 'client'
    )
);

-- 6. DELETE: uploader or admin.
CREATE POLICY "Internal users can delete company files"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'company-files'
    AND (
        owner = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role = 'admin'
        )
    )
);
