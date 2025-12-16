'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Avatar } from '@/components/ui/avatar';
import { useCompanySettings } from '@/hooks/use-company-settings';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  Plus,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Save,
  Trash2,
  Users,
  Filter,
} from 'lucide-react';
import type { User, Project, TimeEntry } from '@/types/database';

interface TimeEntryWithDetails extends TimeEntry {
  users?: User;
  projects?: Project;
}

export default function AdminTimesheetPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntryWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterUserId, setFilterUserId] = useState('all');
  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff)).toISOString().split('T')[0];
  });
  const [formData, setFormData] = useState({
    user_id: '',
    project_id: '',
    hours: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
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
        setCurrentUser(profile);

        // Fetch all users
        const { data: usersData } = await supabase
          .from('users')
          .select('*')
          .order('full_name');
        setUsers(usersData || []);

        // Fetch all projects
        const { data: projectsData } = await supabase
          .from('projects')
          .select('*')
          .order('name');
        setProjects(projectsData || []);

        // Fetch time entries for current week
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const { data: entries } = await supabase
          .from('time_entries')
          .select('*, users(*), projects(*)')
          .gte('date', weekStart)
          .lte('date', weekEnd.toISOString().split('T')[0])
          .order('date', { ascending: false });

        setTimeEntries(entries || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supabase, weekStart]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate required fields
      if (!formData.user_id || !formData.project_id || !formData.hours || !formData.date) {
        alert('Please fill in all required fields');
        return;
      }

      const hours = parseFloat(formData.hours);
      if (isNaN(hours) || hours <= 0 || hours > 24) {
        alert('Hours must be between 0.5 and 24');
        return;
      }

      const { data, error } = await supabase.from('time_entries').insert({
        user_id: formData.user_id,
        project_id: formData.project_id,
        hours: hours,
        description: formData.description || null,
        date: formData.date,
      }).select();

      if (error) {
        console.error('Supabase error:', error);
        // Check for RLS policy error
        if (error.code === '42501' || error.message?.includes('policy')) {
          alert('Permission denied. Please ensure the admin RLS policy is set up correctly.\n\nRun this SQL in Supabase:\nDROP POLICY IF EXISTS "Admins can manage all time entries" ON time_entries;\nCREATE POLICY "Admins can manage all time entries" ON time_entries FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = \'admin\')) WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = \'admin\'));');
        } else {
          alert(`Failed to add time entry: ${error.message}`);
        }
        return;
      }

      // Close modal and refresh data
      setShowModal(false);
      window.location.reload();
    } catch (error: any) {
      console.error('Error adding time entry:', error);
      alert(`Failed to add time entry: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm('Delete this time entry?')) return;

    const { error } = await supabase.from('time_entries').delete().eq('id', entryId);
    if (!error) {
      setTimeEntries(timeEntries.filter(te => te.id !== entryId));
    }
  };

  const changeWeek = (direction: 'prev' | 'next') => {
    const current = new Date(weekStart);
    current.setDate(current.getDate() + (direction === 'next' ? 7 : -7));
    setWeekStart(current.toISOString().split('T')[0]);
  };

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    return date.toISOString().split('T')[0];
  });

  // Filter entries by user
  const filteredEntries = filterUserId === 'all'
    ? timeEntries
    : timeEntries.filter(te => te.user_id === filterUserId);

  // Calculate daily hours per user
  const userDailyHours = users.reduce((acc, user) => {
    acc[user.id] = weekDays.reduce((dayAcc, date) => {
      dayAcc[date] = timeEntries
        .filter(te => te.user_id === user.id && te.date === date)
        .reduce((sum, te) => sum + te.hours, 0);
      return dayAcc;
    }, {} as Record<string, number>);
    return acc;
  }, {} as Record<string, Record<string, number>>);

  // Calculate total hours per user for the week
  const userTotalHours = users.reduce((acc, user) => {
    acc[user.id] = Object.values(userDailyHours[user.id] || {}).reduce((sum, h) => sum + h, 0);
    return acc;
  }, {} as Record<string, number>);

  const totalWeekHours = Object.values(userTotalHours).reduce((sum, h) => sum + h, 0);

  // Get projects assigned to a specific user
  const getProjectsForUser = async (userId: string) => {
    const { data } = await supabase
      .from('project_users')
      .select('project_id')
      .eq('user_id', userId);

    const projectIds = data?.map(pu => pu.project_id) || [];
    return projects.filter(p => projectIds.includes(p.id));
  };

  const openAddModal = () => {
    setFormData({
      user_id: '',
      project_id: '',
      hours: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
    setShowModal(true);
  };

  if (isLoading) {
    return (
      <DashboardLayout user={currentUser} title="Team Timesheet" logoUrl={logoUrl} companyName={companyName}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={currentUser} title="Team Timesheet" logoUrl={logoUrl} companyName={companyName}>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-black">Team Timesheet</h2>
            <p className="text-gray-500 mt-1">
              Manage and book hours for all team members
            </p>
          </div>
          <Button onClick={openAddModal}>
            <Plus className="h-4 w-4 mr-2" />
            Book Hours
          </Button>
        </div>

        {/* Week Navigation */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => changeWeek('prev')}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="text-center">
                <p className="font-semibold text-black">
                  {formatDate(weekStart)} - {formatDate(weekDays[6])}
                </p>
                <p className="text-sm text-gray-500">
                  Total Team Hours: <span className="font-medium text-primary">{totalWeekHours.toFixed(1)} hours</span>
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => changeWeek('next')}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Team Hours Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Team Hours Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Team Member</th>
                    {weekDays.map(date => (
                      <th key={date} className="text-center py-2 px-2 font-medium text-gray-500 min-w-16">
                        <div className="text-xs">{new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                        <div className="text-sm">{new Date(date).getDate()}</div>
                      </th>
                    ))}
                    <th className="text-center py-2 px-3 font-medium text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => {
                    const hours = userDailyHours[user.id] || {};
                    const total = userTotalHours[user.id] || 0;
                    return (
                      <tr key={user.id} className="border-t border-border">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={user.full_name} size="sm" />
                            <div>
                              <p className="font-medium text-black text-sm">{user.full_name}</p>
                              <p className="text-xs text-gray-500">{formatCurrency(user.hourly_rate)}/hr</p>
                            </div>
                          </div>
                        </td>
                        {weekDays.map(date => {
                          const dayHours = hours[date] || 0;
                          const isToday = date === new Date().toISOString().split('T')[0];
                          return (
                            <td key={date} className="text-center py-3 px-2">
                              <div className={`text-sm font-medium rounded py-1 ${
                                dayHours > 0
                                  ? 'text-primary bg-primary/10'
                                  : isToday
                                    ? 'text-muted-foreground bg-muted'
                                    : 'text-muted-foreground/50'
                              }`}>
                                {dayHours > 0 ? `${dayHours}h` : '-'}
                              </div>
                            </td>
                          );
                        })}
                        <td className="text-center py-3 px-3">
                          <span className="font-semibold text-primary">{total.toFixed(1)}h</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Time Entries Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Time Entries This Week
            </CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Select
                value={filterUserId}
                onChange={(e) => setFilterUserId(e.target.value)}
                options={[
                  { value: 'all', label: 'All Users' },
                  ...users.map(u => ({ value: u.id, label: u.full_name })),
                ]}
                className="w-48"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => {
                  const entryUser = users.find(u => u.id === entry.user_id);
                  const cost = entry.hours * (entryUser?.hourly_rate || 0);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar name={entry.users?.full_name || 'Unknown'} size="sm" />
                          <span className="text-sm font-medium">{entry.users?.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {formatDate(entry.date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{entry.projects?.name}</Badge>
                      </TableCell>
                      <TableCell>
                        {entry.description || <span className="text-gray-400">No description</span>}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {entry.hours} hrs
                      </TableCell>
                      <TableCell className="text-right text-gray-600">
                        {formatCurrency(cost)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500"
                          onClick={() => handleDelete(entry.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredEntries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      No time entries this week. Click &quot;Book Hours&quot; to add one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add Time Entry Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Book Hours"
          description="Add time entry for a team member"
          size="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label="Team Member"
              value={formData.user_id}
              onChange={(e) => setFormData({ ...formData, user_id: e.target.value, project_id: '' })}
              options={[
                { value: '', label: 'Select a team member' },
                ...users.map(u => ({ value: u.id, label: u.full_name })),
              ]}
              required
            />
            <Input
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
            <Select
              label="Project"
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
              options={[
                { value: '', label: 'Select a project' },
                ...projects.map(p => ({ value: p.id, label: p.name })),
              ]}
              required
            />
            <Input
              label="Hours"
              type="number"
              value={formData.hours}
              onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
              placeholder="e.g., 8"
              min="0.5"
              max="24"
              step="0.5"
              required
            />
            <Textarea
              label="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What did they work on?"
              rows={3}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                Save Entry
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
