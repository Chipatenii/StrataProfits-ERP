-- Migration: 033_add_company_files_table
-- Description: Creates a virtual file system structure pointing to Supabase Storage objects.

-- 1. Create the company_files table
CREATE TABLE IF NOT EXISTS public.company_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('file', 'folder')),
    parent_id UUID REFERENCES public.company_files(id) ON DELETE CASCADE,
    file_path TEXT, -- Nullable for folders, contains explicit Supabase bucket path for files
    size_bytes BIGINT,
    mime_type TEXT,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_company_files_parent ON public.company_files(parent_id);
CREATE INDEX IF NOT EXISTS idx_company_files_type ON public.company_files(type);

-- 3. Enable Row Level Security
ALTER TABLE public.company_files ENABLE ROW LEVEL SECURITY;

-- 4. Set up Policies
--    Rule: Authenticated internal users can view the file hierarchy
CREATE POLICY "Internal users can view company files"
    ON public.company_files
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role != 'client' -- Exclude clients from internal knowledge base for now
      )
    );

--    Rule: Internal users can create folders and upload files
CREATE POLICY "Internal users can create files and folders"
    ON public.company_files
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role != 'client'
      )
    );

--    Rule: Internal users can rename/move their own files, Admins can do anything
CREATE POLICY "Users can update files"
    ON public.company_files
    FOR UPDATE
    USING (
      uploaded_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
      )
    );

--    Rule: Users can delete their own files, Admins can do anything
CREATE POLICY "Users can delete files"
    ON public.company_files
    FOR DELETE
    USING (
      uploaded_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
      )
    );
