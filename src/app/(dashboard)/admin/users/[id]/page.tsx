'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { StatCard } from '@/components/ui/stat-card';
import { TimeChart } from '@/components/charts/time-chart';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useCompanySettings } from '@/hooks/use-company-settings';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  FolderKanban,
  Edit,
} from 'lucide-react';
import type { User, Project, TimeEntry, Task } from '@/types/database';

interface UserDetails extends User {
  assigned_projects: Project[];
  time_entries: (TimeEntry & { projects: Project })[];
  tasks: Task[];
}

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.id as string;
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const { companyName, logoUrl } = useCompanySettings();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();
          setCurrentUser(profile);
        }

        // Fetch user details
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (userData) {
          // Fetch assigned projects
          const { data: projectUsers } = await supabase
            .from('project_users')
            .select('project_id, projects(*)')
            .eq('user_id', userId);

          // Fetch time entries
          const { data: timeEntries } = await supabase
            .from('time_entries')
            .select('*, projects(*)')
            .eq('user_id', userId)
            .order('date', { ascending: false });

          // Fetch tasks
          const { data: tasks } = await supabase
            .from('tasks')
            .select('*, projects(name)')
            .eq('assigned_to', userId)
            .order('created_at', { ascending: false });

          setUserDetails({
            ...userData,
            assigned_projects: projectUsers?.map((pu) => pu.projects as unknown as Project).filter(Boolean) || [],
            time_entries: timeEntries || [],
            tasks: tasks || [],
          });
        }
      } catch (error) {
        console.error('Error fetching user details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId, supabase]);

  if (isLoading) {
    return (
      <DashboardLayout user={currentUser} title="User Details" logoUrl={logoUrl} companyName={companyName}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0a5082]" />
        </div>
      </DashboardLayout>
    );
  }

  if (!userDetails) {
    return (
      <DashboardLayout user={currentUser} title="User Not Found" logoUrl={logoUrl} companyName={companyName}>
        <div className="text-center py-12">
          <p className="text-gray-500">User not found</p>
          <Link href="/admin/users">
            <Button className="mt-4">Back to Users</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // Calculate metrics
  const totalHours = userDetails.time_entries.reduce((sum, te) => sum + te.hours, 0);
  const totalCost = totalHours * userDetails.hourly_rate;
  const completedTasks = userDetails.tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = userDetails.tasks.filter(t => t.status !== 'completed').length;

  // Group time entries by date for chart
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();

  const chartData = last7Days.map(date => {
    const dayHours = userDetails.time_entries
      .filter(te => te.date === date)
      .reduce((sum, te) => sum + te.hours, 0);
    return {
      date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      hours: dayHours,
      target: 8,
    };
  });

  // Group time entries by project
  const hoursByProject = userDetails.time_entries.reduce((acc, te) => {
    const projectName = te.projects?.name || 'Unknown';
    acc[projectName] = (acc[projectName] || 0) + te.hours;
    return acc;
  }, {} as Record<string, number>);

  return (
    <DashboardLayout user={currentUser} title={userDetails.full_name} logoUrl={logoUrl} companyName={companyName}>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <Link href="/admin/users">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-4">
              <Avatar name={userDetails.full_name} src={userDetails.avatar_url} size="xl" />
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-black">{userDetails.full_name}</h2>
                  <Badge variant={userDetails.role === 'admin' ? 'primary' : 'secondary'}>
                    {userDetails.role}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {userDetails.email}
                  </div>
                  {userDetails.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {userDetails.phone}
                    </div>
                  )}
                  {userDetails.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {userDetails.location}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit User
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Hourly Rate"
            value={`${formatCurrency(userDetails.hourly_rate)}/hr`}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <StatCard
            title="Total Hours"
            value={`${totalHours.toFixed(1)} hrs`}
            icon={<Clock className="h-5 w-5" />}
          />
          <StatCard
            title="Total Cost"
            value={formatCurrency(totalCost)}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <StatCard
            title="Assigned Projects"
            value={userDetails.assigned_projects.length}
            icon={<FolderKanban className="h-5 w-5" />}
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
          {/* Assigned Projects */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-[#0a5082]" />
                Assigned Projects ({userDetails.assigned_projects.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userDetails.assigned_projects.map((project) => (
                  <Link key={project.id} href={`/admin/projects/${project.id}`}>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div>
                        <p className="font-medium text-black">{project.name}</p>
                        <p className="text-sm text-gray-500">
                          {hoursByProject[project.name]?.toFixed(1) || 0} hours logged
                        </p>
                      </div>
                      <Badge variant={project.status === 'in_progress' ? 'primary' : 'secondary'}>
                        {project.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </Link>
                ))}
                {userDetails.assigned_projects.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No projects assigned</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tasks Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Tasks Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-[#0a5082]/10 rounded-lg text-center">
                  <p className="text-3xl font-bold text-[#0a5082]">{completedTasks}</p>
                  <p className="text-sm text-gray-500">Completed</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg text-center">
                  <p className="text-3xl font-bold text-black">{pendingTasks}</p>
                  <p className="text-sm text-gray-500">Pending</p>
                </div>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {userDetails.tasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${
                        task.status === 'completed' ? 'bg-[#0a5082]' : 'bg-gray-300'
                      }`} />
                      <span className={`text-sm ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
                        {task.title}
                      </span>
                    </div>
                    <Badge variant={task.priority === 'high' ? 'primary' : 'secondary'}>
                      {task.priority}
                    </Badge>
                  </div>
                ))}
                {userDetails.tasks.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No tasks assigned</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Time Entries Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#0a5082]" />
              Time Sheet History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userDetails.time_entries.slice(0, 20).map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.date)}</TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/projects/${entry.project_id}`}
                        className="text-[#0a5082] hover:underline"
                      >
                        {entry.projects?.name || 'Unknown'}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {entry.description || <span className="text-gray-400">-</span>}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {entry.hours} hrs
                    </TableCell>
                    <TableCell className="text-right font-medium text-[#0a5082]">
                      {formatCurrency(entry.hours * userDetails.hourly_rate)}
                    </TableCell>
                  </TableRow>
                ))}
                {userDetails.time_entries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                      No time entries recorded
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
