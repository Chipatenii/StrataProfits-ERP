# Production Deployment Guide

## Overview

This folder contains the migration scripts for the StrataProfits ERP.

## Option 1: Fresh Deployment (Recommended)

If you are deploying to a new Supabase project, execute the consolidated bundle which contains the entire schema definition, including all modules (CRM, Finance, Projects) and reporting views.

**File:** `production_bundle.sql`

## Option 2: Incremental Migration

If you are updating an existing database that was already on Version 1 (Core Tasks/Time), run the scripts in the following order:

1. `010_add_projects.sql` (Schema Update)
2. `012_add_new_modules.sql` (Schema Update)
3. `013_erp_upgrade.sql` (Schema Update - Finance)
4. `019_add_financial_fields.sql` (Schema Update)
5. `020_strata_erp_rls_enhancement.sql` (Security Updates)
6. `021_strata_finance_views.sql` (Reporting Views)
7. `022_add_client_details_utf8.sql` (Schema Update)

## Verification

After deployment, run the following SQL to verify the `invoices` table exists and has the correct fields:

\`\`\`sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'invoices';
\`\`\`
