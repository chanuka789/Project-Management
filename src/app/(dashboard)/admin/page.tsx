'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PerformanceChart } from '@/components/charts/performance-chart';
import { FinanceChart } from '@/components/charts/finance-chart';
import { formatCurrency, formatDate, getProgressPercentage } from '@/lib/utils';
import {
  FolderKanban,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  ArrowRight,
  Plus,
  Calendar,
} from 'lucide-react';
import type { User, Project, TimeEntry } from '@/types/database';

interface DashboardData {
  totalProjects: number;
  activeProjects: number;
  totalUsers: number;
  totalContractValue: number;
  totalCosts: number;
  totalProfit: number;
  projects: Project[];
  users: User[];
  recentTimeEntries: TimeEntry[];
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();
          setUser(profile);
        }

        // Get projects
        const { data: projects } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });

        // Get users
        const { data: users } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        // Get time entries
        const { data: timeEntries } = await supabase
          .from('time_entries')
          .select('*, users(full_name), projects(name)')
          .order('created_at', { ascending: false })
          .limit(10);

        // Get additional costs
        const { data: additionalCosts } = await supabase
          .from('additional_costs')
          .select('amount');

        // Calculate metrics
        const totalProjects = projects?.length || 0;
        const activeProjects = projects?.filter(p => p.status === 'in_progress').length || 0;
        const totalUsers = users?.length || 0;
        const totalContractValue = projects?.reduce((sum, p) => sum + (p.contract_value || 0), 0) || 0;

        // Calculate labor costs
        const laborCosts = await calculateLaborCosts(supabase);
        const additionalCostTotal = additionalCosts?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
        const totalCosts = laborCosts + additionalCostTotal;
        const totalProfit = totalContractValue - totalCosts;

        setData({
          totalProjects,
          activeProjects,
          totalUsers,
          totalContractValue,
          totalCosts,
          totalProfit,
          projects: projects || [],
          users: users || [],
          recentTimeEntries: timeEntries || [],
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  if (isLoading) {
    return (
      <DashboardLayout user={user} title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0a5082]" />
        </div>
      </DashboardLayout>
    );
  }

  // Sample chart data (in production, calculate from real data)
  const performanceData = data?.projects.slice(0, 5).map(p => ({
    name: p.name.length > 15 ? p.name.slice(0, 15) + '...' : p.name,
    planned: Math.floor(Math.random() * 500) + 200,
    actual: Math.floor(Math.random() * 500) + 200,
  })) || [];

  const financeData = data?.projects.slice(0, 6).map(p => ({
    name: p.name.length > 10 ? p.name.slice(0, 10) + '...' : p.name,
    revenue: p.contract_value || 0,
    cost: (p.contract_value || 0) * 0.7,
  })) || [];

  const profitMargin = data?.totalContractValue
    ? ((data.totalProfit / data.totalContractValue) * 100).toFixed(1)
    : '0';

  return (
    <DashboardLayout user={user} title="Admin Dashboard">
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-black">
              Welcome back, {user?.full_name?.split(' ')[0] || 'Admin'}
            </h2>
            <p className="text-gray-500 mt-1">
              Here&apos;s what&apos;s happening with your projects today.
            </p>
          </div>
          <Link href="/admin/projects/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Projects"
            value={data?.totalProjects || 0}
            icon={<FolderKanban className="h-5 w-5" />}
            description={`${data?.activeProjects || 0} active`}
          />
          <StatCard
            title="Team Members"
            value={data?.totalUsers || 0}
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            title="Contract Value"
            value={formatCurrency(data?.totalContractValue || 0)}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <StatCard
            title="Total Profit"
            value={formatCurrency(data?.totalProfit || 0)}
            icon={<TrendingUp className="h-5 w-5" />}
            trend={{ value: parseFloat(profitMargin), label: 'margin' }}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Time Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceChart data={performanceData} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Financial Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <FinanceChart data={financeData} />
            </CardContent>
          </Card>
        </div>

        {/* Projects & Team */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Projects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Projects</CardTitle>
              <Link href="/admin/projects">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.projects.slice(0, 4).map((project) => (
                  <Link
                    key={project.id}
                    href={`/admin/projects/${project.id}`}
                    className="block"
                  >
                    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="h-10 w-10 rounded-lg bg-[#0a5082]/10 flex items-center justify-center">
                        <FolderKanban className="h-5 w-5 text-[#0a5082]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-black truncate">{project.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {formatDate(project.end_date)}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant={project.status === 'in_progress' ? 'primary' : 'secondary'}
                      >
                        {project.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </Link>
                ))}
                {(!data?.projects || data.projects.length === 0) && (
                  <p className="text-center text-gray-500 py-4">No projects yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Team Overview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Team Members</CardTitle>
              <Link href="/admin/users">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.users.slice(0, 4).map((member) => (
                  <Link
                    key={member.id}
                    href={`/admin/users/${member.id}`}
                    className="block"
                  >
                    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <Avatar name={member.full_name} src={member.avatar_url} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-black truncate">{member.full_name}</p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                      <Badge variant={member.role === 'admin' ? 'primary' : 'secondary'}>
                        {member.role}
                      </Badge>
                    </div>
                  </Link>
                ))}
                {(!data?.users || data.users.length === 0) && (
                  <p className="text-center text-gray-500 py-4">No team members yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#0a5082]" />
              Recent Time Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.recentTimeEntries.slice(0, 5).map((entry: TimeEntry & { users?: { full_name: string }; projects?: { name: string } }) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-[#0a5082]/10 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-[#0a5082]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black">
                        {entry.users?.full_name || 'Unknown User'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {entry.projects?.name || 'Unknown Project'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#0a5082]">
                      {entry.hours} hours
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(entry.date)}</p>
                  </div>
                </div>
              ))}
              {(!data?.recentTimeEntries || data.recentTimeEntries.length === 0) && (
                <p className="text-center text-gray-500 py-4">No recent time entries</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

// Helper function to calculate labor costs
async function calculateLaborCosts(supabase: ReturnType<typeof createClient>): Promise<number> {
  const { data: timeEntries } = await supabase
    .from('time_entries')
    .select('hours, user_id');

  const { data: users } = await supabase
    .from('users')
    .select('id, hourly_rate');

  if (!timeEntries || !users) return 0;

  const userRates = new Map(users.map(u => [u.id, u.hourly_rate || 0]));

  return timeEntries.reduce((total, entry) => {
    const rate = userRates.get(entry.user_id) || 0;
    return total + (entry.hours * rate);
  }, 0);
}
