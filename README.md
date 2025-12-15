# QS Consultancy - Project Management System

A modern, web-based Project and User Management System tailored specifically for Quantity Surveying (QS) consultancy companies. Built with Next.js, TypeScript, and Supabase.

## Features

### Admin Dashboard
- Centralized overview of all projects, users, and finances
- Real-time performance metrics and KPIs
- Visual charts for planned vs actual cost/time
- Quick navigation to detailed views

### Project Management
- Create and manage multiple projects
- Define budgets, timelines, and status
- Assign team members and tasks
- Track time utilization and cost performance
- Add additional project-related costs
- Calculate profit for each project

### User Management
- Role-based access (Admin / User)
- User profile management
- Set individual hourly rates
- View user performance and time logs

### Financial Dashboard
- Consolidated financial overview
- Project-wise budget tracking
- Labor cost calculations
- Profit margin analysis
- Visual reports and charts

### User Features
- Personal dashboard with assigned projects
- Timesheet logging (daily/weekly)
- Task management
- Performance summary (read-only cost view)

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL) - FREE
- **Authentication**: Supabase Auth
- **Charts**: Recharts
- **Icons**: Lucide React

## Brand Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Primary | `#0a5082` | Buttons, links, accents |
| White | `#FFFFFF` | Backgrounds, text |
| Black | `#000000` | Text, secondary elements |

## Quick Start

```bash
# Clone repository
git clone <repository-url>
cd Project-Management

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Database Setup

This project uses **Supabase** (FREE tier) as the database. See [SETUP.md](./SETUP.md) for detailed instructions.

### Quick Database Setup
1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Run `supabase/schema.sql` in SQL Editor
4. Copy API keys to `.env.local`

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   │   ├── login/
│   │   └── register/
│   └── (dashboard)/       # Protected dashboard pages
│       ├── admin/         # Admin-only pages
│       └── user/          # User pages
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── layout/           # Layout components
│   └── charts/           # Chart components
├── lib/                  # Utility functions
├── types/               # TypeScript types
├── hooks/               # Custom React hooks
└── store/               # State management
```

## Key Pages

| Page | Path | Access |
|------|------|--------|
| Admin Dashboard | `/admin` | Admin |
| Projects List | `/admin/projects` | Admin |
| Project Detail | `/admin/projects/[id]` | Admin |
| Users Management | `/admin/users` | Admin |
| Finance Dashboard | `/admin/finance` | Admin |
| Settings | `/admin/settings` | Admin |
| User Dashboard | `/user` | User |
| My Projects | `/user/projects` | User |
| Timesheet | `/user/timesheet` | User |
| My Tasks | `/user/tasks` | User |

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Deployment

### Vercel (Recommended - FREE)
Deploy via GitHub integration at [vercel.com](https://vercel.com)

### Self-hosted
```bash
npm run build
npm start
```

## License

Proprietary software for QS Consultancy.

## Support

For setup assistance, refer to [SETUP.md](./SETUP.md).
