'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { TimeChart } from '@/components/charts/time-chart';
import { formatCurrency, formatDate, getProgressPercentage } from '@/lib/utils';
import {
  Clock,
  FolderKanban,
  ClipboardList,
  TrendingUp,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Circle,
  Plus,
} from 'lucide-react';
import type { User, Project, Task, TimeEntry } from '@/types/database';

interface UserDashboardData {
  assignedProjects: Project[];
  tasks: Task[];
  timeEntries: TimeEntry[];
  totalHours: number;
  weeklyHours: number;
  monthlyHours: number;
  completedTasks: number;
  pendingTasks: number;
}

export default function UserDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<UserDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        setUser(profile);

        // Fetch assigned projects
        const { data: projectUsers } = await supabase
          .from('project_users')
          .select('project_id, projects(*)')
          .eq('user_id', authUser.id);

        // Fetch tasks
        const { data: tasks } = await supabase
          .from('tasks')
          .select('*, projects(name)')
          .eq('assigned_to', authUser.id)
          .order('created_at', { ascending: false });

        // Fetch time entries
        const { data: timeEntries } = await supabase
          .from('time_entries')
          .select('*, projects(name)')
          .eq('user_id', authUser.id)
          .order('date', { ascending: false });

        // Calculate metrics
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const totalHours = (timeEntries || []).reduce((sum, te) => sum + te.hours, 0);
        const weeklyHours = (timeEntries || [])
          .filter(te => new Date(te.date) >= weekStart)
          .reduce((sum, te) => sum + te.hours, 0);
        const monthlyHours = (timeEntries || [])
          .filter(te => new Date(te.date) >= monthStart)
          .reduce((sum, te) => sum + te.hours, 0);

        const completedTasks = (tasks || []).filter(t => t.status === 'completed').length;
        const pendingTasks = (tasks || []).filter(t => t.status !== 'completed').length;

        setData({
          assignedProjects: (projectUsers || []).map((pu: any) => pu.projects as Project).filter(Boolean),
          tasks: tasks || [],
          timeEntries: timeEntries || [],
          totalHours,
          weeklyHours,
          monthlyHours,
          completedTasks,
          pendingTasks,
        });
      } catch (error) {
        console.error('Error fetching data:', error);
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

  // Chart data - last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();

  const chartData = last7Days.map(date => {
    const dayHours = (data?.timeEntries || [])
      .filter(te => te.date === date)
      .reduce((sum, te) => sum + te.hours, 0);
    return {
      date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      hours: dayHours,
      target: 8,
    };
  });

  // Calculate cost contribution (read-only)
  const totalCost = (data?.totalHours || 0) * (user?.hourly_rate || 0);

  return (
    <DashboardLayout user={user} title="My Dashboard">
      <div className="space-y-6 animate-fade-in">
        {/* Welcome */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-black">
              Welcome back, {user?.full_name?.split(' ')[0] || 'User'}
            </h2>
            <p className="text-gray-500 mt-1">
              Here&apos;s your activity summary
            </p>
          </div>
          <Link href="/user/timesheet">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Log Time
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="This Week"
            value={`${data?.weeklyHours.toFixed(1) || 0} hrs`}
            icon={<Clock className="h-5 w-5" />}
            description={`Target: 40 hrs`}
          />
          <StatCard
            title="This Month"
            value={`${data?.monthlyHours.toFixed(1) || 0} hrs`}
            icon={<Calendar className="h-5 w-5" />}
          />
          <StatCard
            title="Active Projects"
            value={data?.assignedProjects.filter(p => p.status === 'in_progress').length || 0}
            icon={<FolderKanban className="h-5 w-5" />}
          />
          <StatCard
            title="Pending Tasks"
            value={data?.pendingTasks || 0}
            icon={<ClipboardList className="h-5 w-5" />}
          />
        </div>

        {/* Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#0a5082]" />
              Hours Worked (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TimeChart data={chartData} />
          </CardContent>
        </Card>

        {/* Projects & Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Projects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-[#0a5082]" />
                My Projects
              </CardTitle>
              <Link href="/user/projects">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.assignedProjects.slice(0, 4).map((project) => {
                  const projectHours = (data?.timeEntries || [])
                    .filter(te => te.project_id === project.id)
                    .reduce((sum, te) => sum + te.hours, 0);

                  return (
                    <div
                      key={project.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-gray-50"
                    >
                      <div className="h-10 w-10 rounded-lg bg-[#0a5082]/10 flex items-center justify-center">
                        <FolderKanban className="h-5 w-5 text-[#0a5082]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-black truncate">{project.name}</p>
                        <p className="text-sm text-gray-500">{projectHours.toFixed(1)} hours logged</p>
                      </div>
                      <Badge variant={project.status === 'in_progress' ? 'primary' : 'secondary'}>
                        {project.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  );
                })}
                {(!data?.assignedProjects || data.assignedProjects.length === 0) && (
                  <p className="text-center text-gray-500 py-4">No projects assigned</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* My Tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-[#0a5082]" />
                My Tasks
              </CardTitle>
              <Link href="/user/tasks">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data?.tasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {task.status === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5 text-[#0a5082]" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-black'}`}>
                        {task.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(task as Task & { projects?: { name: string } }).projects?.name}
                      </p>
                    </div>
                    <Badge variant={task.priority === 'high' ? 'primary' : 'secondary'}>
                      {task.priority}
                    </Badge>
                  </div>
                ))}
                {(!data?.tasks || data.tasks.length === 0) && (
                  <p className="text-center text-gray-500 py-4">No tasks assigned</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Summary (Read-only) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#0a5082]" />
              Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-2">Task Completion</p>
                <div className="flex items-center gap-4">
                  <Progress
                    value={getProgressPercentage(
                      data?.completedTasks || 0,
                      (data?.completedTasks || 0) + (data?.pendingTasks || 0)
                    )}
                    className="flex-1"
                    showLabel
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {data?.completedTasks || 0} of {(data?.completedTasks || 0) + (data?.pendingTasks || 0)} tasks completed
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Weekly Utilization</p>
                <div className="flex items-center gap-4">
                  <Progress
                    value={getProgressPercentage(data?.weeklyHours || 0, 40)}
                    className="flex-1"
                    showLabel
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {data?.weeklyHours.toFixed(1) || 0} of 40 target hours
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Total Hours Logged</p>
                <p className="text-3xl font-bold text-[#0a5082]">{data?.totalHours.toFixed(1) || 0}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Cost contribution: {formatCurrency(totalCost)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
