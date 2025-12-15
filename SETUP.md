# QS Consultancy - Project Management System
## Complete Setup Guide

This guide will walk you through setting up the **cheapest online database** (Supabase - FREE) and deploying your Project Management System.

---

## Table of Contents
1. [Database Setup (Supabase - FREE)](#1-database-setup-supabase---free)
2. [Environment Configuration](#2-environment-configuration)
3. [Running the Application](#3-running-the-application)
4. [Creating Admin User](#4-creating-admin-user)
5. [Deployment Options](#5-deployment-options)

---

## 1. Database Setup (Supabase - FREE)

### Why Supabase?
- **FREE tier**: 500MB database, 50,000 monthly active users
- **PostgreSQL**: Professional-grade relational database
- **Built-in Auth**: Secure authentication system
- **Real-time**: Live data updates
- **Row Level Security**: Role-based access control
- **Cost**: $0/month for most small-medium projects

### Step-by-Step Setup

#### Step 1: Create Supabase Account
1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Sign up with GitHub (recommended) or email
4. Verify your email if required

#### Step 2: Create New Project
1. Click **"New Project"**
2. Fill in project details:
   - **Name**: `qs-project-management` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose nearest to your users (e.g., Singapore, US East)
3. Click **"Create new project"**
4. Wait 2-3 minutes for project initialization

#### Step 3: Get API Keys
1. Go to **Project Settings** (gear icon in sidebar)
2. Click **"API"** in the left menu
3. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

#### Step 4: Create Database Tables
1. Go to **SQL Editor** in the left sidebar
2. Click **"New query"**
3. Copy the entire contents of `supabase/schema.sql` from this project
4. Paste into the SQL editor
5. Click **"Run"** (or press Ctrl/Cmd + Enter)
6. You should see "Success" message

#### Step 5: Create Storage Bucket (for logo uploads)
1. Go to **Storage** in the left sidebar
2. Click **"New bucket"**
3. Enter:
   - **Name**: `company-assets`
   - **Public bucket**: Toggle ON
4. Click **"Create bucket"**

#### Step 6: Configure Authentication
1. Go to **Authentication** > **Providers**
2. Ensure **Email** is enabled
3. Optional: Configure email templates under **Email Templates**

---

## 2. Environment Configuration

### Create .env.local File

1. Copy the example environment file:
```bash
cp .env.example .env.local
```

2. Edit `.env.local` with your Supabase credentials:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Where to Find Values
| Variable | Location in Supabase |
|----------|---------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings > API > anon public key |

---

## 3. Running the Application

### Development Mode
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Production Build
```bash
# Build for production
npm run build

# Start production server
npm start
```

---

## 4. Creating Admin User

### Method 1: First User Registration (Recommended)

1. Go to [http://localhost:3000/register](http://localhost:3000/register)
2. Register with your admin credentials
3. Go to Supabase Dashboard > **Table Editor** > **users**
4. Find your user and change `role` from `user` to `admin`
5. Log out and log back in

### Method 2: SQL Command

Run in Supabase SQL Editor:
```sql
-- After registering, update your user to admin
UPDATE users
SET role = 'admin'
WHERE email = 'your-admin@email.com';
```

### Method 3: Create Admin via SQL
```sql
-- Note: You must first register via the app to create auth.users entry
-- Then run this to set them as admin
UPDATE users
SET
    role = 'admin',
    hourly_rate = 150.00
WHERE email = 'admin@yourcompany.com';
```

---

## 5. Deployment Options

### Option A: Vercel (Recommended - FREE)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy!

**Free tier includes**:
- Unlimited deployments
- Custom domain
- SSL certificate
- Edge network

### Option B: Netlify (FREE)

1. Push to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Import repository
4. Add environment variables
5. Deploy

### Option C: Railway (FREE tier)

1. Go to [railway.app](https://railway.app)
2. Create new project from GitHub
3. Add environment variables
4. Deploy

---

## Database Schema Overview

### Tables Created

| Table | Description |
|-------|-------------|
| `users` | Team members with roles (admin/user) |
| `projects` | Project details, budgets, timelines |
| `project_users` | Project-user assignments |
| `tasks` | Project tasks with priorities |
| `time_entries` | Timesheet data |
| `additional_costs` | Extra project costs |
| `company_settings` | Company branding |

### Key Features
- **Row Level Security**: Users only see what they're authorized to
- **Automatic timestamps**: created_at, updated_at handled automatically
- **Referential integrity**: Foreign keys ensure data consistency

---

## Cost Breakdown

### Supabase Free Tier Limits
- **Database**: 500 MB
- **Storage**: 1 GB
- **Bandwidth**: 2 GB
- **Users**: 50,000 MAU

### When You'll Need to Upgrade
For most QS consultancy companies (< 50 users), the **free tier is sufficient**.

Upgrade to Pro ($25/month) when:
- Database exceeds 500 MB
- Need daily backups
- Need email support

---

## Troubleshooting

### "Invalid API Key" Error
- Verify your `.env.local` has correct keys
- Ensure no extra spaces in environment variables
- Restart dev server after changing .env

### "Row Level Security Policy" Error
- Make sure you ran the complete schema.sql
- Check if the user exists in the users table
- Verify user role in database

### Login Not Working
- Check Supabase Authentication is enabled
- Verify email confirmation settings
- Check browser console for errors

### Charts Not Loading
- Ensure time_entries and projects tables have data
- Check for JavaScript console errors
- Verify data is being fetched correctly

---

## Support

For questions or issues:
1. Check [Supabase Documentation](https://supabase.com/docs)
2. Visit [Next.js Documentation](https://nextjs.org/docs)
3. Review the codebase documentation in `/src/types/database.ts`

---

## Security Notes

- Never commit `.env.local` to git
- Regularly update dependencies: `npm update`
- Review Row Level Security policies for your needs
- Enable 2FA on your Supabase account

---

**Built with:**
- Next.js 15
- TypeScript
- Tailwind CSS
- Supabase (PostgreSQL)
- Recharts
