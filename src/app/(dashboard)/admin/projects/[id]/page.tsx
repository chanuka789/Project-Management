'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { StatCard } from '@/components/ui/stat-card';
import { PerformanceChart } from '@/components/charts/performance-chart';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { formatCurrency, formatDate, calculateDaysRemaining, getProgressPercentage } from '@/lib/utils';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Clock,
  Users,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  ClipboardList,
  Save,
} from 'lucide-react';
import type { User, Project, Task, TimeEntry, AdditionalCost } from '@/types/database';

interface ProjectDetails extends Project {
  assigned_users: User[];
  tasks: Task[];
  time_entries: (TimeEntry & { users: User })[];
  additional_costs: AdditionalCost[];
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'medium',
    due_date: '',
  });
  const [costForm, setCostForm] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });
  const supabase = createClient();

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
          setUser(profile);
        }

        // Fetch project details
        const { data: projectData } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (projectData) {
          // Fetch assigned users
          const { data: projectUsers } = await supabase
            .from('project_users')
            .select('user_id, users(*)')
            .eq('project_id', projectId);

          // Fetch tasks
          const { data: tasks } = await supabase
            .from('tasks')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

          // Fetch time entries
          const { data: timeEntries } = await supabase
            .from('time_entries')
            .select('*, users(*)')
            .eq('project_id', projectId)
            .order('date', { ascending: false });

          // Fetch additional costs
          const { data: additionalCosts } = await supabase
            .from('additional_costs')
            .select('*')
            .eq('project_id', projectId)
            .order('date', { ascending: false });

          setProject({
            ...projectData,
            assigned_users: projectUsers?.map((pu: { users: User }) => pu.users).filter(Boolean) || [],
            tasks: tasks || [],
            time_entries: timeEntries || [],
            additional_costs: additionalCosts || [],
          });
        }
      } catch (error) {
        console.error('Error fetching project:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [projectId, supabase]);

  // Calculate metrics
  const totalHours = project?.time_entries.reduce((sum, te) => sum + te.hours, 0) || 0;
  const laborCost = project?.time_entries.reduce((sum, te) => {
    return sum + (te.hours * (te.users?.hourly_rate || 0));
  }, 0) || 0;
  const additionalCostTotal = project?.additional_costs.reduce((sum, c) => sum + c.amount, 0) || 0;
  const totalCost = laborCost + additionalCostTotal;
  const profit = (project?.contract_value || 0) - totalCost;
  const profitMargin = project?.contract_value ? (profit / project.contract_value) * 100 : 0;

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { error } = await supabase.from('tasks').insert({
        project_id: projectId,
        title: taskForm.title,
        description: taskForm.description || null,
        assigned_to: taskForm.assigned_to || null,
        priority: taskForm.priority,
        due_date: taskForm.due_date || null,
        status: 'pending',
        created_by: authUser?.id,
      });

      if (error) throw error;

      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { error } = await supabase.from('additional_costs').insert({
        project_id: projectId,
        description: costForm.description,
        amount: parseFloat(costForm.amount),
        date: costForm.date,
        created_by: authUser?.id,
      });

      if (error) throw error;

      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error('Error adding cost:', error);
    }
  };

  const handleDeleteCost = async (costId: string) => {
    if (!confirm('Delete this cost entry?')) return;
    const { error } = await supabase.from('additional_costs').delete().eq('id', costId);
    if (!error) window.location.reload();
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId);
    if (!error) window.location.reload();
  };

  if (isLoading) {
    return (
      <DashboardLayout user={user} title="Project Details">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0a5082]" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout user={user} title="Project Not Found">
        <div className="text-center py-12">
          <p className="text-gray-500">Project not found</p>
          <Link href="/admin/projects">
            <Button className="mt-4">Back to Projects</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const daysRemaining = calculateDaysRemaining(project.end_date);

  return (
    <DashboardLayout user={user} title={project.name}>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/projects">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-black">{project.name}</h2>
                <Badge variant={project.status === 'in_progress' ? 'primary' : 'secondary'}>
                  {project.status.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-gray-500 mt-1">{project.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/admin/projects/${projectId}/edit`}>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit Project
              </Button>
            </Link>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Contract Value"
            value={formatCurrency(project.contract_value)}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <StatCard
            title="Total Cost"
            value={formatCurrency(totalCost)}
            icon={<TrendingUp className="h-5 w-5" />}
            description={`Labor: ${formatCurrency(laborCost)}`}
          />
          <StatCard
            title="Profit"
            value={formatCurrency(profit)}
            icon={<TrendingUp className="h-5 w-5" />}
            trend={{ value: parseFloat(profitMargin.toFixed(1)) }}
          />
          <StatCard
            title="Total Hours"
            value={`${totalHours.toFixed(1)} hrs`}
            icon={<Clock className="h-5 w-5" />}
            description={daysRemaining >= 0 ? `${daysRemaining} days left` : `${Math.abs(daysRemaining)} days overdue`}
          />
        </div>

        {/* Project Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#0a5082]" />
              Project Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm mb-2">
              <span>{formatDate(project.start_date)}</span>
              <span>{formatDate(project.end_date)}</span>
            </div>
            <Progress value={getProgressPercentage(
              new Date().getTime() - new Date(project.start_date).getTime(),
              new Date(project.end_date).getTime() - new Date(project.start_date).getTime()
            )} showLabel />
          </CardContent>
        </Card>

        {/* Team Members & Time Entries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assigned Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#0a5082]" />
                Team Members ({project.assigned_users.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {project.assigned_users.map((member) => {
                  const memberHours = project.time_entries
                    .filter(te => te.user_id === member.id)
                    .reduce((sum, te) => sum + te.hours, 0);
                  const memberCost = memberHours * member.hourly_rate;

                  return (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar name={member.full_name} src={member.avatar_url} />
                        <div>
                          <p className="font-medium text-black">{member.full_name}</p>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(member.hourly_rate)}/hr
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-[#0a5082]">{memberHours.toFixed(1)} hrs</p>
                        <p className="text-sm text-gray-500">{formatCurrency(memberCost)}</p>
                      </div>
                    </div>
                  );
                })}
                {project.assigned_users.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No team members assigned</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Time Entries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-[#0a5082]" />
                Time Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {project.time_entries.slice(0, 10).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar name={entry.users?.full_name || 'Unknown'} size="sm" />
                      <div>
                        <p className="text-sm font-medium">{entry.users?.full_name}</p>
                        <p className="text-xs text-gray-500">{formatDate(entry.date)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-[#0a5082]">{entry.hours} hrs</p>
                      {entry.description && (
                        <p className="text-xs text-gray-500 truncate max-w-32">{entry.description}</p>
                      )}
                    </div>
                  </div>
                ))}
                {project.time_entries.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No time entries yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-[#0a5082]" />
              Tasks ({project.tasks.length})
            </CardTitle>
            <Button onClick={() => setShowTaskModal(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Task
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.tasks.map((task) => {
                  const assignedUser = project.assigned_users.find(u => u.id === task.assigned_to);
                  return (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{task.title}</p>
                          {task.description && (
                            <p className="text-sm text-gray-500 truncate max-w-xs">{task.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {assignedUser ? (
                          <div className="flex items-center gap-2">
                            <Avatar name={assignedUser.full_name} size="sm" />
                            <span className="text-sm">{assignedUser.full_name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={task.priority === 'high' ? 'primary' : 'secondary'}>
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {task.due_date ? formatDate(task.due_date) : '-'}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={task.status}
                          onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value)}
                          options={[
                            { value: 'pending', label: 'Pending' },
                            { value: 'in_progress', label: 'In Progress' },
                            { value: 'completed', label: 'Completed' },
                          ]}
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {project.tasks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      No tasks yet. Click &quot;Add Task&quot; to create one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Additional Costs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[#0a5082]" />
              Additional Costs ({formatCurrency(additionalCostTotal)})
            </CardTitle>
            <Button onClick={() => setShowCostModal(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Cost
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.additional_costs.map((cost) => (
                  <TableRow key={cost.id}>
                    <TableCell>{cost.description}</TableCell>
                    <TableCell>{formatDate(cost.date)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(cost.amount)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500"
                        onClick={() => handleDeleteCost(cost.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {project.additional_costs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                      No additional costs recorded
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add Task Modal */}
        <Modal
          isOpen={showTaskModal}
          onClose={() => setShowTaskModal(false)}
          title="Add New Task"
          size="md"
        >
          <form onSubmit={handleAddTask} className="space-y-4">
            <Input
              label="Task Title"
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              required
            />
            <Textarea
              label="Description"
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Assign To"
                value={taskForm.assigned_to}
                onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
                options={[
                  { value: '', label: 'Unassigned' },
                  ...project.assigned_users.map(u => ({ value: u.id, label: u.full_name })),
                ]}
              />
              <Select
                label="Priority"
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                ]}
              />
            </div>
            <Input
              label="Due Date"
              type="date"
              value={taskForm.due_date}
              onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowTaskModal(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </div>
          </form>
        </Modal>

        {/* Add Cost Modal */}
        <Modal
          isOpen={showCostModal}
          onClose={() => setShowCostModal(false)}
          title="Add Additional Cost"
          size="sm"
        >
          <form onSubmit={handleAddCost} className="space-y-4">
            <Input
              label="Description"
              value={costForm.description}
              onChange={(e) => setCostForm({ ...costForm, description: e.target.value })}
              placeholder="e.g., Equipment rental, Travel expenses"
              required
            />
            <Input
              label="Amount (AED)"
              type="number"
              value={costForm.amount}
              onChange={(e) => setCostForm({ ...costForm, amount: e.target.value })}
              min="0"
              step="0.01"
              required
            />
            <Input
              label="Date"
              type="date"
              value={costForm.date}
              onChange={(e) => setCostForm({ ...costForm, date: e.target.value })}
              required
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowCostModal(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                Add Cost
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
