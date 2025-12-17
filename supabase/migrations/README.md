# Database Migrations

This directory contains SQL migration files that need to be run in your Supabase dashboard.

## How to Apply Migrations

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (in the left sidebar)
3. Click **New query**
4. Copy the entire contents of the migration file
5. Paste it into the SQL editor
6. Click **Run** to execute the migration

## Available Migrations

### fix_projects_rls.sql
**Purpose:** Fixes the Row Level Security (RLS) policy for the projects table to allow admins to update project details after creation.

**Issue:** Without an explicit `WITH CHECK` clause, PostgreSQL RLS prevents UPDATE operations from completing properly.

**Required:** Yes, if you're experiencing issues with editing project details after creating them.

**Run this migration if:**
- You cannot edit/update project information after creating a project
- You see "Failed to update project" errors
- Updates appear to fail silently

### fix_time_entries_rls.sql
**Purpose:** Fixes the Row Level Security policy for the time_entries table to allow admins to add time entries for other users.

**Issue:** Similar RLS policy issue preventing admin time entry operations.

**Required:** If admins need to book hours for other users.

## Migration Order

If running multiple migrations, execute them in this order:
1. fix_time_entries_rls.sql
2. fix_projects_rls.sql

## Verification

After running a migration, you can verify the policies were created correctly by checking the output of the verification query included at the end of each migration file.
