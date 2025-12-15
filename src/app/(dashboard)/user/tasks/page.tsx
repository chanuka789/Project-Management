'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { useCompanySettings } from '@/hooks/use-company-settings';
import { formatDate } from '@/lib/utils';
import {
  ClipboardList,
  CheckCircle2,
  Circle,
  Clock,
  Filter,
  Calendar,
} from 'lucide-react';
import type { User, Task, Project } from '@/types/database';

export default function UserTasksPage() {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<(Task & { projects: Project })[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<(Task & { projects: Project })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const supabase = createClient();
  const { companyName, logoUrl } = useCompanySettings();

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

        // Fetch tasks assigned to user
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('*, projects(*)')
          .eq('assigned_to', authUser.id)
          .order('created_at', { ascending: false });

        setTasks(tasksData || []);
        setFilteredTasks(tasksData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  useEffect(() => {
    let filtered = tasks;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(t => t.priority === priorityFilter);
    }

    setFilteredTasks(filtered);
  }, [statusFilter, priorityFilter, tasks]);

  const handleStatusChange = async (taskId: string, status: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status })
      .eq('id', taskId);

    if (!error) {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: status as Task['status'] } : t));
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
  ];

  const priorityOptions = [
    { value: 'all', label: 'All Priority' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ];

  // Group tasks by status
  const pendingTasks = filteredTasks.filter(t => t.status === 'pending');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress');
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');

  if (isLoading) {
    return (
      <DashboardLayout user={user} title="My Tasks" logoUrl={logoUrl} companyName={companyName}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0a5082]" />
        </div>
      </DashboardLayout>
    );
  }

  const TaskCard = ({ task }: { task: Task & { projects: Project } }) => (
    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {task.status === 'completed' ? (
            <CheckCircle2 className="h-5 w-5 text-[#0a5082]" />
          ) : task.status === 'in_progress' ? (
            <Clock className="h-5 w-5 text-[#0a5082]/60" />
          ) : (
            <Circle className="h-5 w-5 text-gray-300" />
          )}
          <h4 className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-black'}`}>
            {task.title}
          </h4>
        </div>
        <Badge variant={task.priority === 'high' ? 'primary' : 'secondary'}>
          {task.priority}
        </Badge>
      </div>

      {task.description && (
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="px-2 py-1 bg-gray-100 rounded">{task.projects?.name}</span>
          {task.due_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(task.due_date)}
            </div>
          )}
        </div>
        <Select
          value={task.status}
          onChange={(e) => handleStatusChange(task.id, e.target.value)}
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
          ]}
          className="w-32 text-xs"
        />
      </div>
    </div>
  );

  return (
    <DashboardLayout user={user} title="My Tasks" logoUrl={logoUrl} companyName={companyName}>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-black">My Tasks</h2>
            <p className="text-gray-500 mt-1">
              View and manage your assigned tasks
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">Filters:</span>
              </div>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={statusOptions}
                className="w-full sm:w-40"
              />
              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                options={priorityOptions}
                className="w-full sm:w-40"
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-lg border border-gray-200 text-center">
            <p className="text-2xl font-bold text-gray-400">{pendingTasks.length}</p>
            <p className="text-sm text-gray-500">Pending</p>
          </div>
          <div className="p-4 bg-[#0a5082]/10 rounded-lg border border-[#0a5082]/20 text-center">
            <p className="text-2xl font-bold text-[#0a5082]">{inProgressTasks.length}</p>
            <p className="text-sm text-gray-500">In Progress</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-gray-200 text-center">
            <p className="text-2xl font-bold text-[#0a5082]">{completedTasks.length}</p>
            <p className="text-sm text-gray-500">Completed</p>
          </div>
        </div>

        {/* Tasks */}
        {filteredTasks.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-8 w-8" />}
            title="No tasks found"
            description={statusFilter !== 'all' || priorityFilter !== 'all'
              ? "Try adjusting your filters"
              : "You don't have any tasks assigned yet"
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Pending Column */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-500 flex items-center gap-2">
                <Circle className="h-4 w-4" />
                Pending ({pendingTasks.length})
              </h3>
              <div className="space-y-3">
                {pendingTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
                {pendingTasks.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No pending tasks</p>
                )}
              </div>
            </div>

            {/* In Progress Column */}
            <div className="space-y-4">
              <h3 className="font-semibold text-[#0a5082] flex items-center gap-2">
                <Clock className="h-4 w-4" />
                In Progress ({inProgressTasks.length})
              </h3>
              <div className="space-y-3">
                {inProgressTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
                {inProgressTasks.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No tasks in progress</p>
                )}
              </div>
            </div>

            {/* Completed Column */}
            <div className="space-y-4">
              <h3 className="font-semibold text-[#0a5082] flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Completed ({completedTasks.length})
              </h3>
              <div className="space-y-3">
                {completedTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
                {completedTasks.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No completed tasks</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
