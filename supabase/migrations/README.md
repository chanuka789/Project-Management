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

### add_client_name_column.sql ⚠️ **RUN THIS FIRST**
**Purpose:** Adds the `client_name` column to the projects table.

**Issue:** Missing column causes "Could not find the 'client_name' column of 'projects' in the schema cache" error.

**Required:** Yes, if you see the client_name column error.

**Run this migration if:**
- You see "Could not find the 'client_name' column" error
- Project creation or editing fails due to missing column
- Your database was created before this column was added to the schema

### fix_projects_rls.sql ⚠️ **REQUIRED**
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

⚠️ **IMPORTANT:** Execute migrations in this exact order:
1. **add_client_name_column.sql** (Add missing column first)
2. **fix_projects_rls.sql** (Fix RLS policy for project updates)
3. **fix_time_entries_rls.sql** (Optional: Only if needed for time entries)

## Verification

After running a migration, you can verify the policies were created correctly by checking the output of the verification query included at the end of each migration file.
