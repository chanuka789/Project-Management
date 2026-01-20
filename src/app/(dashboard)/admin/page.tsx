'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PerformanceChart } from '@/components/charts/performance-chart';
import { FinanceChart } from '@/components/charts/finance-chart';
import { ExportModal } from '@/components/ui/export-modal';
import { useCompanySettings } from '@/hooks/use-company-settings';
import { useNotifications } from '@/hooks/use-notifications';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  FolderKanban,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  ArrowRight,
  Plus,
  Calendar,
  Download,
  AlertTriangle,
  AlertCircle,
  Bell,
} from 'lucide-react';
import type { User, Project, TimeEntry, BudgetAlert } from '@/types/database';
import { convertToAED, DEFAULT_EXCHANGE_RATES } from '@/lib/currency';

interface ProjectCost {
  projectId: string;
  laborCost: number;
  additionalCost: number;
}

interface ProjectStats {
  project_id: string;
  labor_cost: number | null;
  total_hours: number | null;
}

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
  projectCosts: ProjectCost[];
  projectHours: Map<string, number>;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const { companyName, logoUrl } = useCompanySettings();
  const { notifications, budgetAlerts } = useNotifications();
  const supabase = useMemo(() => createClient(), []);

  const getProjectContractValueAed = (project: Project) => {
    if (project.contract_value_aed && project.contract_value_aed > 0) {
      return project.contract_value_aed;
    }
    if (project.currency && project.currency !== 'AED') {
      return convertToAED(
        project.contract_value || 0,
        project.currency,
        DEFAULT_EXCHANGE_RATES[project.currency],
      );
    }
    return project.contract_value || 0;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fire all requests in parallel
        const [
          userRes,
          projectsRes,
          usersRes,
          timeEntriesRes,
          additionalCostsRes,
          statsRes,
        ] = await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false }),
          supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false }),
          supabase
            .from('time_entries')
            .select('*, users(full_name), projects(name)')
            .order('created_at', { ascending: false })
            .limit(10),
          supabase
            .from('additional_costs')
            .select('amount, project_id'),
          supabase.rpc('get_project_stats'),
        ]);

        // Get current user profile
        const authUser = userRes.data.user;
        if (authUser) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();
          setUser(profile);
        }

        const projects = projectsRes.data || [];
        const users = usersRes.data || [];
        const timeEntries = timeEntriesRes.data || [];
        const additionalCosts = additionalCostsRes.data || [];
        const projectStats = (statsRes.data as ProjectStats[]) || [];

        // Calculate metrics
        const totalProjects = projects.length;
        const activeProjects = projects.filter(p => p.status === 'in_progress').length;
        const totalUsers = users.length;
        const totalContractValue = projects.reduce((sum, p) => sum + getProjectContractValueAed(p), 0);

        // Calculate labor costs from RPC
        const laborCosts = projectStats.reduce((sum, stat) => sum + (stat.labor_cost || 0), 0);
        const additionalCostTotal = additionalCosts.reduce((sum, c) => sum + (c.amount || 0), 0);
        const totalCosts = laborCosts + additionalCostTotal;
        const totalProfit = totalContractValue - totalCosts;

        // Calculate per-project costs
        const statsByProject = new Map(
          projectStats.map(stat => [stat.project_id, stat]),
        );
        const additionalCostsByProject = new Map<string, number>();
        additionalCosts.forEach((cost) => {
          const current = additionalCostsByProject.get(cost.project_id) || 0;
          additionalCostsByProject.set(cost.project_id, current + (cost.amount || 0));
        });

        // Calculate per-project hours for performance chart
        const projectHours = new Map<string, number>();
        projectStats.forEach((stat) => {
          projectHours.set(stat.project_id, stat.total_hours || 0);
        });

        const projectCosts: ProjectCost[] = projects.map((project) => {
          const stat = statsByProject.get(project.id);
          const additionalCost = additionalCostsByProject.get(project.id) || 0;
          return {
            projectId: project.id,
            laborCost: stat?.labor_cost || 0,
            additionalCost,
          };
        });

        setData({
          totalProjects,
          activeProjects,
          totalUsers,
          totalContractValue,
          totalCosts,
          totalProfit,
          projects,
          users,
          recentTimeEntries: timeEntries,
          projectCosts,
          projectHours,
        });
      } catch {
        // Data fetch failed - user will see empty state
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  if (isLoading) {
    return (
      <DashboardLayout
        user={user}
        title="Dashboard"
        logoUrl={logoUrl}
        companyName={companyName}
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0a5082]" />
        </div>
      </DashboardLayout>
    );
  }

  // Performance chart - actual hours logged per project
  const performanceData = useMemo(() => {
    return data?.projects.slice(0, 5).map(p => {
      const actualHours = data.projectHours.get(p.id) || 0;
      // Estimate planned hours based on project duration and contract value
      const startDate = new Date(p.start_date);
      const endDate = new Date(p.end_date);
      const durationDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const plannedHours = Math.round(durationDays * 8 * 0.3); // Estimate 30% of work days
      return {
        name: p.name.length > 15 ? p.name.slice(0, 15) + '...' : p.name,
        planned: plannedHours,
        actual: Math.round(actualHours),
      };
    }) || [];
  }, [data]);

  // Finance chart - actual costs calculated from time entries and additional costs
  const financeData = useMemo(() => {
    return data?.projects.slice(0, 6).map(p => {
      const projectCost = data.projectCosts.find(pc => pc.projectId === p.id);
      const totalCost = (projectCost?.laborCost || 0) + (projectCost?.additionalCost || 0);
      const revenueAed = getProjectContractValueAed(p);
      return {
        name: p.name.length > 10 ? p.name.slice(0, 10) + '...' : p.name,
        revenue: Math.round(revenueAed),
        cost: Math.round(totalCost),
      };
    }) || [];
  }, [data, getProjectContractValueAed]);

  const profitMargin = data?.totalContractValue
    ? ((data.totalProfit / data.totalContractValue) * 100).toFixed(1)
    : '0';

  return (
    <DashboardLayout
      user={user}
      title="Admin Dashboard"
      logoUrl={logoUrl}
      companyName={companyName}
    >
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Welcome back, {user?.full_name?.split(' ')[0] || 'Admin'}
            </h2>
            <p className="text-muted-foreground mt-1">
              Here&apos;s what&apos;s happening with your projects today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setShowExportModal(true)}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Link href="/admin/projects/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </Link>
          </div>
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

        {/* Budget Alerts & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Budget Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Budget Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {budgetAlerts.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-3">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <p className="text-sm text-muted-foreground">All projects within budget</p>
                  </div>
                ) : (
                  budgetAlerts.slice(0, 4).map((alert: BudgetAlert) => (
                    <Link
                      key={alert.id}
                      href={`/admin/projects/${alert.project_id}`}
                      className="block"
                    >
                      <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className={`flex-shrink-0 mt-0.5 p-2 rounded-lg ${
                          alert.alert_level === 'exceeded'
                            ? 'bg-red-100 dark:bg-red-900/20'
                            : alert.alert_level === 'critical'
                            ? 'bg-orange-100 dark:bg-orange-900/20'
                            : 'bg-yellow-100 dark:bg-yellow-900/20'
                        }`}>
                          {alert.alert_level === 'exceeded' ? (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <AlertTriangle className={`h-4 w-4 ${
                              alert.alert_level === 'critical' ? 'text-orange-500' : 'text-yellow-600'
                            }`} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {alert.project_name}
                          </p>
                          <p className="text-xs text-muted-foreground">{alert.message}</p>
                          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                alert.alert_level === 'exceeded'
                                  ? 'bg-red-500'
                                  : alert.alert_level === 'critical'
                                  ? 'bg-orange-500'
                                  : 'bg-yellow-500'
                              }`}
                              style={{ width: `${Math.min(alert.percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

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
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {entry.users?.full_name || 'Unknown User'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.projects?.name || 'Unknown Project'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary">
                        {entry.hours} hours
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(entry.date)}</p>
                    </div>
                  </div>
                ))}
                {(!data?.recentTimeEntries || data.recentTimeEntries.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">No recent time entries</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Notifications Widget */}
        {notifications.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-[#0a5082]" />
                Recent Timesheet Submissions
              </CardTitle>
              <Link href="/admin/timesheet">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {notifications.slice(0, 6).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      !notification.is_read
                        ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                        : 'bg-muted/30 border-border'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {notification.metadata?.user_name || 'Team Member'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {notification.metadata?.hours} hrs on {notification.metadata?.project_name}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </DashboardLayout>
  );
}
