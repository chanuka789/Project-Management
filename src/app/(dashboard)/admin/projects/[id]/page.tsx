'use client';

import { useEffect, useState, useMemo } from 'react';
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
import { ReceiptUpload } from '@/components/receipts/receipt-upload';
import { ReceiptList } from '@/components/receipts/receipt-list';
import { formatCurrency, formatDate, calculateDaysRemaining, getProgressPercentage } from '@/lib/utils';
import { useCompanySettings } from '@/hooks/use-company-settings';
import { PasswordConfirmModal } from '@/components/ui/password-confirm-modal';
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
  Building2,
  UserPlus,
  X,
  FileText,
} from 'lucide-react';
import type { User, Project, Task, TimeEntry, AdditionalCost, SupportedCurrency, ProjectUserWithUser } from '@/types/database';
import { convertFromAED, convertToAED, DEFAULT_EXCHANGE_RATES, formatCurrencyWithCode } from '@/lib/currency';
import { notifyTaskAssigned } from '@/lib/notifications';

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
  const [showUserModal, setShowUserModal] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [deleteCostModalOpen, setDeleteCostModalOpen] = useState(false);
  const [costToDelete, setCostToDelete] = useState<AdditionalCost | null>(null);
  const [removeUserModalOpen, setRemoveUserModalOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<User | null>(null);
  const [receiptRefreshTrigger, setReceiptRefreshTrigger] = useState(0);
  const [deleteTaskModalOpen, setDeleteTaskModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const supabase = useMemo(() => createClient(), []);
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

          // Fetch all users for assignment
          const { data: allUsersData } = await supabase
            .from('users')
            .select('*')
            .order('full_name');

          setAllUsers(allUsersData || []);

          setProject({
            ...projectData,
            assigned_users: ((projectUsers as ProjectUserWithUser[]) || []).map((pu) => Array.isArray(pu.users) ? pu.users[0] : pu.users).filter(Boolean),
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
  const projectCurrency = (project?.currency as SupportedCurrency) || 'AED';
  const contractValueAed = project?.contract_value_aed
    ?? (project?.currency === 'AED'
      ? project.contract_value
      : convertToAED(
        project?.contract_value || 0,
        projectCurrency,
        DEFAULT_EXCHANGE_RATES[projectCurrency],
      ));
  // Calculate labor cost in AED (converting hourly rates from their respective currencies)
  const laborCost = project?.time_entries.reduce((sum, te) => {
    const hourlyRate = te.users?.hourly_rate || 0;
    const rateCurrency = (te.users?.hourly_rate_currency as SupportedCurrency) || 'AED';
    const hourlyRateAed = rateCurrency === 'AED'
      ? hourlyRate
      : convertToAED(hourlyRate, rateCurrency, DEFAULT_EXCHANGE_RATES[rateCurrency]);
    return sum + (te.hours * hourlyRateAed);
  }, 0) || 0;
  const additionalCostTotal = project?.additional_costs.reduce((sum, c) => sum + c.amount, 0) || 0;
  const additionalCostAed = project?.currency === 'AED'
    ? additionalCostTotal
    : convertToAED(additionalCostTotal, projectCurrency, DEFAULT_EXCHANGE_RATES[projectCurrency]);
  const totalCostAed = laborCost + additionalCostAed;
  const totalCostDisplay = projectCurrency === 'AED'
    ? totalCostAed
    : convertFromAED(totalCostAed, projectCurrency, DEFAULT_EXCHANGE_RATES[projectCurrency]);
  const laborCostDisplay = projectCurrency === 'AED'
    ? laborCost
    : convertFromAED(laborCost, projectCurrency, DEFAULT_EXCHANGE_RATES[projectCurrency]);
  const profitAed = contractValueAed - totalCostAed;
  const profitDisplay = projectCurrency === 'AED'
    ? profitAed
    : convertFromAED(profitAed, projectCurrency, DEFAULT_EXCHANGE_RATES[projectCurrency]);
  const profitMargin = contractValueAed ? (profitAed / contractValueAed) * 100 : 0;

  const additionalCostDisplay = projectCurrency === 'AED'
    ? additionalCostTotal
    : convertFromAED(additionalCostAed, projectCurrency, DEFAULT_EXCHANGE_RATES[projectCurrency]);

  const userCostBreakdown = project?.assigned_users.map((member) => {
    const memberHours = project.time_entries
      .filter((entry) => entry.user_id === member.id)
      .reduce((sum, entry) => sum + entry.hours, 0);
    const rateCurrency = (member.hourly_rate_currency as SupportedCurrency) || 'AED';
    const hourlyRateAed = rateCurrency === 'AED'
      ? member.hourly_rate || 0
      : convertToAED(member.hourly_rate || 0, rateCurrency, DEFAULT_EXCHANGE_RATES[rateCurrency]);
    const costAed = memberHours * hourlyRateAed;
    const costDisplay = projectCurrency === 'AED'
      ? costAed
      : convertFromAED(costAed, projectCurrency, DEFAULT_EXCHANGE_RATES[projectCurrency]);
    return {
      id: member.id,
      name: member.full_name,
      hours: memberHours,
      costAed,
      costDisplay,
    };
  }) || [];

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { data: newTask, error } = await supabase.from('tasks').insert({
        project_id: projectId,
        title: taskForm.title,
        description: taskForm.description || null,
        assigned_to: taskForm.assigned_to || null,
        priority: taskForm.priority,
        due_date: taskForm.due_date || null,
        status: 'pending',
        created_by: authUser?.id,
      }).select().single();

      if (error) throw error;

      // Update state without reloading
      if (newTask && project) {
        setProject({ ...project, tasks: [newTask, ...project.tasks] });

        // Send email notification if task is assigned to someone
        if (taskForm.assigned_to) {
          const assignedUser = project.assigned_users.find(u => u.id === taskForm.assigned_to);
          if (assignedUser?.email) {
            notifyTaskAssigned({
              assignedUserEmail: assignedUser.email,
              assignedUserName: assignedUser.full_name,
              taskTitle: taskForm.title,
              taskDescription: taskForm.description || undefined,
              taskPriority: taskForm.priority,
              taskDueDate: taskForm.due_date || undefined,
              projectName: project.name,
            });
          }
        }
      }
      setShowTaskModal(false);
      setTaskForm({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '' });
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { data: newCost, error } = await supabase.from('additional_costs').insert({
        project_id: projectId,
        description: costForm.description,
        amount: parseFloat(costForm.amount),
        date: costForm.date,
        created_by: authUser?.id,
      }).select().single();

      if (error) throw error;

      // Update state without reloading
      if (newCost && project) {
        setProject({ ...project, additional_costs: [newCost, ...project.additional_costs] });
      }
      setShowCostModal(false);
      setCostForm({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });
    } catch (error) {
      console.error('Error adding cost:', error);
    }
  };

  const handleDeleteCostClick = (cost: AdditionalCost) => {
    setCostToDelete(cost);
    setDeleteCostModalOpen(true);
  };

  const handleDeleteCostConfirm = async () => {
    if (!costToDelete || !project) return;
    const { error } = await supabase.from('additional_costs').delete().eq('id', costToDelete.id);
    if (!error) {
      setProject({ ...project, additional_costs: project.additional_costs.filter(c => c.id !== costToDelete.id) });
    }
    setCostToDelete(null);
  };

  const handleUpdateTaskStatus = async (taskId: string, status: Task['status']) => {
    const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId);
    if (!error && project) {
      setProject({
        ...project,
        tasks: project.tasks.map(t => t.id === taskId ? { ...t, status } : t)
      });
    }
  };

  const handleDeleteTaskClick = (task: Task) => {
    setTaskToDelete(task);
    setDeleteTaskModalOpen(true);
  };

  const handleDeleteTaskConfirm = async () => {
    if (!taskToDelete || !project) return;
    const { error } = await supabase.from('tasks').delete().eq('id', taskToDelete.id);
    if (!error) {
      setProject({
        ...project,
        tasks: project.tasks.filter(t => t.id !== taskToDelete.id)
      });
    }
    setTaskToDelete(null);
  };

  const handleOpenUserModal = () => {
    setSelectedUserIds(project?.assigned_users.map(u => u.id) || []);
    setShowUserModal(true);
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSaveUserAssignments = async () => {
    try {
      // Remove all current assignments
      await supabase
        .from('project_users')
        .delete()
        .eq('project_id', projectId);

      // Add new assignments
      if (selectedUserIds.length > 0) {
        const newAssignments = selectedUserIds.map(userId => ({
          project_id: projectId,
          user_id: userId,
        }));

        const { error } = await supabase
          .from('project_users')
          .insert(newAssignments);

        if (error) throw error;
      }

      // Update state without reloading
      if (project) {
        const newAssignedUsers = allUsers.filter(u => selectedUserIds.includes(u.id));
        setProject({ ...project, assigned_users: newAssignedUsers });
      }
      setShowUserModal(false);
    } catch (error) {
      console.error('Error updating user assignments:', error);
      alert('Failed to update user assignments');
    }
  };

  const handleRemoveUserClick = (user: User) => {
    setUserToRemove(user);
    setRemoveUserModalOpen(true);
  };

  const handleRemoveUserConfirm = async () => {
    if (!userToRemove || !project) return;
    try {
      const { error } = await supabase
        .from('project_users')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userToRemove.id);

      if (error) throw error;

      // Update state without reloading
      setProject({
        ...project,
        assigned_users: project.assigned_users.filter(u => u.id !== userToRemove.id)
      });
    } catch (error) {
      console.error('Error removing user:', error);
    }
    setUserToRemove(null);
  };

  if (isLoading) {
    return (
      <DashboardLayout user={user} title="Project Details" logoUrl={logoUrl} companyName={companyName}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0a5082]" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout user={user} title="Project Not Found" logoUrl={logoUrl} companyName={companyName}>
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
  const isCompleted = project.status === 'completed';
  const isOverdue = daysRemaining < 0 && !isCompleted && project.status !== 'cancelled';

  return (
    <DashboardLayout user={user} title={project.name} logoUrl={logoUrl} companyName={companyName}>
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
              {project.client_name && (
                <div className="flex items-center gap-2 mt-1">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600 font-medium">{project.client_name}</span>
                </div>
              )}
              {project.description && (
                <p className="text-gray-500 mt-1">{project.description}</p>
              )}
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
            value={formatCurrencyWithCode(project.contract_value, projectCurrency)}
            icon={<DollarSign className="h-5 w-5" />}
            description={projectCurrency !== 'AED' ? `≈ ${formatCurrencyWithCode(contractValueAed, 'AED')}` : undefined}
          />
          <StatCard
            title="Total Cost"
            value={formatCurrencyWithCode(totalCostDisplay, projectCurrency)}
            icon={<TrendingUp className="h-5 w-5" />}
            description={projectCurrency !== 'AED'
              ? `Salaries: ${formatCurrencyWithCode(laborCostDisplay, projectCurrency)} (≈ ${formatCurrencyWithCode(laborCost, 'AED')})`
              : `Salaries: ${formatCurrencyWithCode(laborCost, 'AED')}`}
          />
          <StatCard
            title="Profit"
            value={formatCurrencyWithCode(profitDisplay, projectCurrency)}
            icon={<TrendingUp className="h-5 w-5" />}
            trend={{ value: parseFloat(profitMargin.toFixed(1)) }}
            description={projectCurrency !== 'AED' ? `≈ ${formatCurrencyWithCode(profitAed, 'AED')}` : undefined}
          />
          <StatCard
            title="Total Hours"
            value={`${totalHours.toFixed(1)} hrs`}
            icon={<Clock className="h-5 w-5" />}
            description={isCompleted ? 'Completed' : isOverdue ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days left`}
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
              <Button onClick={handleOpenUserModal} size="sm">
                <UserPlus className="h-4 w-4 mr-1" />
                Manage Team
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {project.assigned_users.map((member) => {
                  const memberHours = project.time_entries
                    .filter(te => te.user_id === member.id)
                    .reduce((sum, te) => sum + te.hours, 0);
                  const memberCost = memberHours * member.hourly_rate;

                  return (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
                      <div className="flex items-center gap-3">
                        <Avatar name={member.full_name} src={member.avatar_url} />
                        <div>
                          <p className="font-medium text-black">{member.full_name}</p>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(member.hourly_rate)}/hr
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-medium text-[#0a5082]">{memberHours.toFixed(1)} hrs</p>
                          <p className="text-sm text-gray-500">{formatCurrency(memberCost)}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveUserClick(member)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
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

          {/* Cost Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-[#0a5082]" />
                Cost Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userCostBreakdown.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell className="text-right">{member.hours.toFixed(1)} hrs</TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium text-[#0a5082]">
                          {formatCurrencyWithCode(member.costDisplay, projectCurrency)}
                        </div>
                        {projectCurrency !== 'AED' && (
                          <div className="text-xs text-gray-500">
                            ≈ {formatCurrencyWithCode(member.costAed, 'AED')}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {userCostBreakdown.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-gray-500 py-4">
                        No team costs recorded
                      </TableCell>
                    </TableRow>
                  )}
                  {userCostBreakdown.length > 0 && (
                    <>
                      <TableRow>
                        <TableCell className="font-semibold">Team Total</TableCell>
                        <TableCell className="text-right font-semibold">
                          {totalHours.toFixed(1)} hrs
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-semibold text-[#0a5082]">
                            {formatCurrencyWithCode(laborCostDisplay, projectCurrency)}
                          </div>
                          {projectCurrency !== 'AED' && (
                            <div className="text-xs text-gray-500">
                            ≈ {formatCurrencyWithCode(laborCost, 'AED')}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-semibold">Additional Costs</TableCell>
                        <TableCell className="text-right">—</TableCell>
                        <TableCell className="text-right">
                          <div className="font-semibold text-[#0a5082]">
                            {formatCurrencyWithCode(additionalCostDisplay, projectCurrency)}
                          </div>
                          {projectCurrency !== 'AED' && (
                            <div className="text-xs text-gray-500">
                              ≈ {formatCurrencyWithCode(additionalCostAed, 'AED')}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-semibold">Total Cost</TableCell>
                        <TableCell className="text-right">—</TableCell>
                        <TableCell className="text-right">
                          <div className="font-semibold text-[#0a5082]">
                            {formatCurrencyWithCode(totalCostDisplay, projectCurrency)}
                          </div>
                          {projectCurrency !== 'AED' && (
                            <div className="text-xs text-gray-500">
                              ≈ {formatCurrencyWithCode(totalCostAed, 'AED')}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
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
                          onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value as Task['status'])}
                          options={[
                            { value: 'pending', label: 'Pending' },
                            { value: 'in_progress', label: 'In Progress' },
                            { value: 'completed', label: 'Completed' },
                          ]}
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500"
                          onClick={() => handleDeleteTaskClick(task)}
                        >
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
                        onClick={() => handleDeleteCostClick(cost)}
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

        {/* Payment Receipts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#0a5082]" />
              Payment Receipts
            </CardTitle>
            <ReceiptUpload
              projectId={projectId}
              onUploadComplete={() => setReceiptRefreshTrigger(prev => prev + 1)}
            />
          </CardHeader>
          <CardContent>
            <ReceiptList
              projectId={projectId}
              refreshTrigger={receiptRefreshTrigger}
            />
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

        {/* Manage Team Modal */}
        <Modal
          isOpen={showUserModal}
          onClose={() => setShowUserModal(false)}
          title="Manage Team Members"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Select users to assign to this project. They will be able to log time and view project details.
            </p>
            <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
              {allUsers.map((u) => {
                const isSelected = selectedUserIds.includes(u.id);
                return (
                  <label
                    key={u.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleUser(u.id)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Avatar name={u.full_name} src={u.avatar_url} size="sm" />
                    <div className="flex-1">
                      <p className="font-medium text-black">{u.full_name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                    <Badge variant={u.role === 'admin' ? 'primary' : 'secondary'} className="text-xs">
                      {u.role}
                    </Badge>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                {selectedUserIds.length} user{selectedUserIds.length !== 1 ? 's' : ''} selected
              </p>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setShowUserModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveUserAssignments}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </Modal>

        {/* Password Confirmation Modal for Cost Deletion */}
        <PasswordConfirmModal
          isOpen={deleteCostModalOpen}
          onClose={() => {
            setDeleteCostModalOpen(false);
            setCostToDelete(null);
          }}
          onConfirm={handleDeleteCostConfirm}
          title="Delete Additional Cost"
          description="This will permanently delete this cost entry."
          itemName={costToDelete?.description}
        />

        {/* Password Confirmation Modal for User Removal */}
        <PasswordConfirmModal
          isOpen={removeUserModalOpen}
          onClose={() => {
            setRemoveUserModalOpen(false);
            setUserToRemove(null);
          }}
          onConfirm={handleRemoveUserConfirm}
          title="Remove Team Member"
          description="This will remove this user from the project. Their time entries will remain."
          itemName={userToRemove?.full_name}
        />

        {/* Password Confirmation Modal for Task Deletion */}
        <PasswordConfirmModal
          isOpen={deleteTaskModalOpen}
          onClose={() => {
            setDeleteTaskModalOpen(false);
            setTaskToDelete(null);
          }}
          onConfirm={handleDeleteTaskConfirm}
          title="Delete Task"
          description="This will permanently delete this task."
          itemName={taskToDelete?.title}
        />
      </div>
    </DashboardLayout>
  );
}
