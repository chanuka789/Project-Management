'use client';

import { useEffect, useState, useMemo } from 'react';
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
import { PasswordConfirmModal } from '@/components/ui/password-confirm-modal';
import { formatDate } from '@/lib/utils';
import { convertFromAED, convertToAED, DEFAULT_EXCHANGE_RATES, formatCurrencyWithCode } from '@/lib/currency';
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
  User,
  BarChart3,
} from 'lucide-react';
import type { User as UserType, Project, TimeEntry } from '@/types/database';

interface TimeEntryWithDetails extends TimeEntry {
  users?: UserType;
  projects?: Project;
}

type TimePeriod = 'weekly' | 'monthly';
type ViewType = 'user-wise' | 'team-wise';

export default function AdminTimesheetPage() {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [users, setUsers] = useState<UserType[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntryWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterUserId, setFilterUserId] = useState('all');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('weekly');
  const [viewType, setViewType] = useState<ViewType>('team-wise');
  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff)).toISOString().split('T')[0];
  });
  const [monthStart, setMonthStart] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [formData, setFormData] = useState({
    user_id: '',
    project_id: '',
    hours: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<TimeEntryWithDetails | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const { companyName, logoUrl } = useCompanySettings();

  // Calculate period start and end based on selected period
  const periodStart = timePeriod === 'weekly' ? weekStart : monthStart;
  const periodEnd = timePeriod === 'weekly'
    ? (() => {
        const [year, monthNum, day] = weekStart.split('-').map(Number);
        const end = new Date(year, monthNum - 1, day + 6);
        // Format without timezone conversion
        return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
      })()
    : (() => {
        // Parse the monthStart string to avoid timezone issues
        const [year, month] = monthStart.split('-').map(Number);
        // Get last day of month
        const lastDay = new Date(year, month, 0).getDate();
        return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      })();

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

        // Fetch time entries for current period
        const { data: entries } = await supabase
          .from('time_entries')
          .select('*, users(*), projects(*)')
          .gte('date', periodStart)
          .lte('date', periodEnd)
          .order('date', { ascending: false });

        setTimeEntries(entries || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supabase, periodStart, periodEnd]);

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

      const { data: newEntry, error } = await supabase.from('time_entries').insert({
        user_id: formData.user_id,
        project_id: formData.project_id,
        hours: hours,
        description: formData.description || null,
        date: formData.date,
      }).select('*, users(*), projects(*)').single();

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

      // Update state without reloading
      if (newEntry) {
        setTimeEntries([newEntry, ...timeEntries]);
      }
      setShowModal(false);
      setFormData({ user_id: '', project_id: '', hours: '', description: '', date: new Date().toISOString().split('T')[0] });
    } catch (error: any) {
      console.error('Error adding time entry:', error);
      alert(`Failed to add time entry: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleDeleteClick = (entry: TimeEntryWithDetails) => {
    setEntryToDelete(entry);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!entryToDelete) return;

    const { error } = await supabase.from('time_entries').delete().eq('id', entryToDelete.id);
    if (!error) {
      setTimeEntries(timeEntries.filter(te => te.id !== entryToDelete.id));
    }
    setEntryToDelete(null);
  };

  const changePeriod = (direction: 'prev' | 'next') => {
    if (timePeriod === 'weekly') {
      const [year, monthNum, day] = weekStart.split('-').map(Number);
      const current = new Date(year, monthNum - 1, day);
      current.setDate(current.getDate() + (direction === 'next' ? 7 : -7));
      // Format without timezone conversion
      const newYear = current.getFullYear();
      const newMonth = String(current.getMonth() + 1).padStart(2, '0');
      const newDay = String(current.getDate()).padStart(2, '0');
      setWeekStart(`${newYear}-${newMonth}-${newDay}`);
    } else {
      // Parse the monthStart string to avoid timezone issues
      const [year, month] = monthStart.split('-').map(Number);
      // Calculate new month and year
      let newMonth = month + (direction === 'next' ? 1 : -1);
      let newYear = year;
      if (newMonth > 12) {
        newMonth = 1;
        newYear++;
      } else if (newMonth < 1) {
        newMonth = 12;
        newYear--;
      }
      // Format without timezone conversion
      setMonthStart(`${newYear}-${String(newMonth).padStart(2, '0')}-01`);
    }
  };

  // Generate period days - using local date formatting to avoid timezone issues
  const formatLocalDate = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const periodDays = timePeriod === 'weekly'
    ? Array.from({ length: 7 }, (_, i) => {
        const [year, monthNum, day] = weekStart.split('-').map(Number);
        const date = new Date(year, monthNum - 1, day + i);
        return formatLocalDate(date);
      })
    : (() => {
        // Parse the monthStart string to avoid timezone issues
        const [year, month] = monthStart.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();
        return Array.from({ length: daysInMonth }, (_, i) => {
          return `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
        });
      })();

  // Filter entries by user
  const filteredEntries = filterUserId === 'all'
    ? timeEntries
    : timeEntries.filter(te => te.user_id === filterUserId);

  // Calculate daily hours per user
  const userDailyHours = users.reduce((acc, user) => {
    acc[user.id] = periodDays.reduce((dayAcc, date) => {
      dayAcc[date] = timeEntries
        .filter(te => te.user_id === user.id && te.date === date)
        .reduce((sum, te) => sum + te.hours, 0);
      return dayAcc;
    }, {} as Record<string, number>);
    return acc;
  }, {} as Record<string, Record<string, number>>);

  // Calculate total hours per user for the period
  const userTotalHours = users.reduce((acc, user) => {
    acc[user.id] = Object.values(userDailyHours[user.id] || {}).reduce((sum, h) => sum + h, 0);
    return acc;
  }, {} as Record<string, number>);

  // Calculate total cost per user (stored in user's hourly rate currency)
  const userTotalCost = users.reduce((acc, user) => {
    acc[user.id] = (userTotalHours[user.id] || 0) * (user.hourly_rate || 0);
    return acc;
  }, {} as Record<string, number>);

  // Calculate total cost per user in AED for consistent totals
  const userTotalCostAed = users.reduce((acc, user) => {
    const rateCurrency = user.hourly_rate_currency || 'AED';
    const hourlyRateAed = rateCurrency === 'AED'
      ? user.hourly_rate || 0
      : convertToAED(user.hourly_rate || 0, rateCurrency, DEFAULT_EXCHANGE_RATES[rateCurrency]);
    acc[user.id] = (userTotalHours[user.id] || 0) * hourlyRateAed;
    return acc;
  }, {} as Record<string, number>);

  const totalPeriodHours = Object.values(userTotalHours).reduce((sum, h) => sum + h, 0);
  const totalPeriodCostAed = Object.values(userTotalCostAed).reduce((sum, c) => sum + c, 0);
  const totalPeriodCostLkr = convertFromAED(totalPeriodCostAed, 'LKR', DEFAULT_EXCHANGE_RATES.LKR);

  // Format period label
  const periodLabel = timePeriod === 'weekly'
    ? `${formatDate(periodStart)} - ${formatDate(periodEnd)}`
    : new Date(monthStart).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

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
              Manage and track team hours with detailed insights
            </p>
          </div>
          <Button onClick={openAddModal}>
            <Plus className="h-4 w-4 mr-2" />
            Book Hours
          </Button>
        </div>

        {/* Modern Filter Controls */}
        <Card className="border-2 border-primary/10 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Time Period Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Time Period
                </label>
                <div className="flex gap-2">
                  <Button
                    variant={timePeriod === 'weekly' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setTimePeriod('weekly')}
                    className="flex-1"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Weekly
                  </Button>
                  <Button
                    variant={timePeriod === 'monthly' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setTimePeriod('monthly')}
                    className="flex-1"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Monthly
                  </Button>
                </div>
              </div>

              {/* View Type Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  View Type
                </label>
                <div className="flex gap-2">
                  <Button
                    variant={viewType === 'user-wise' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setViewType('user-wise')}
                    className="flex-1"
                  >
                    <User className="h-4 w-4 mr-2" />
                    User-Wise
                  </Button>
                  <Button
                    variant={viewType === 'team-wise' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setViewType('team-wise')}
                    className="flex-1"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Team-Wise
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Period Navigation */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => changePeriod('prev')}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="text-center">
                <p className="font-semibold text-black text-lg">
                  {periodLabel}
                </p>
                <div className="flex items-center justify-center gap-4 mt-2 text-sm">
                  <span className="text-gray-500">
                    Total Hours: <span className="font-medium text-primary">{totalPeriodHours.toFixed(1)} hrs</span>
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500">
                    Total Cost: <span className="font-medium text-primary">{formatCurrencyWithCode(totalPeriodCostLkr, 'LKR')}</span>
                    <span className="ml-2 text-xs text-gray-400">
                      ≈ {formatCurrencyWithCode(totalPeriodCostAed, 'AED')}
                    </span>
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => changePeriod('next')}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Team-Wise View */}
        {viewType === 'team-wise' && (
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
                      {timePeriod === 'weekly' && periodDays.map(date => (
                        <th key={date} className="text-center py-2 px-2 font-medium text-gray-500 min-w-16">
                          <div className="text-xs">{new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                          <div className="text-sm">{new Date(date).getDate()}</div>
                        </th>
                      ))}
                      <th className="text-center py-2 px-3 font-medium text-gray-500">Total Hrs</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-500">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => {
                      const hours = userDailyHours[user.id] || {};
                      const total = userTotalHours[user.id] || 0;
                      const cost = userTotalCost[user.id] || 0;
                      return (
                        <tr key={user.id} className="border-t border-border">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <Avatar name={user.full_name} size="sm" />
                              <div>
                                <p className="font-medium text-black text-sm">{user.full_name}</p>
                                <p className="text-xs text-gray-500">{formatCurrencyWithCode(user.hourly_rate, user.hourly_rate_currency || 'AED')}/hr</p>
                              </div>
                            </div>
                          </td>
                          {timePeriod === 'weekly' && periodDays.map(date => {
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
                          <td className="text-center py-3 px-3">
                            <span className="font-medium text-gray-700">{formatCurrencyWithCode(cost, user.hourly_rate_currency || 'AED')}</span>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-primary/20 bg-primary/5 font-semibold">
                      <td className="py-3 px-3">Total</td>
                      {timePeriod === 'weekly' && periodDays.map(date => {
                        const dayTotal = users.reduce((sum, u) => sum + (userDailyHours[u.id]?.[date] || 0), 0);
                        return (
                          <td key={date} className="text-center py-3 px-2">
                            <span className="text-sm font-semibold text-primary">
                              {dayTotal > 0 ? `${dayTotal}h` : '-'}
                            </span>
                          </td>
                        );
                      })}
                      <td className="text-center py-3 px-3 text-primary">{totalPeriodHours.toFixed(1)}h</td>
                      <td className="text-center py-3 px-3 text-primary">
                        <div>{formatCurrencyWithCode(totalPeriodCostLkr, 'LKR')}</div>
                        <div className="text-xs text-gray-400">≈ {formatCurrencyWithCode(totalPeriodCostAed, 'AED')}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* User-Wise View */}
        {viewType === 'user-wise' && (
          <div className="space-y-4">
            {users.map(user => {
              const userEntries = timeEntries.filter(te => te.user_id === user.id);
              const totalHours = userTotalHours[user.id] || 0;
              const totalCost = userTotalCost[user.id] || 0;

              if (userEntries.length === 0) return null;

              return (
                <Card key={user.id} className="border-l-4 border-l-primary">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.full_name} size="md" />
                        <div>
                          <CardTitle className="text-lg">{user.full_name}</CardTitle>
                          <p className="text-sm text-gray-500">{formatCurrencyWithCode(user.hourly_rate, user.hourly_rate_currency || 'AED')}/hr</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{totalHours.toFixed(1)}h</p>
                        <p className="text-sm text-gray-500">{formatCurrencyWithCode(totalCost, user.hourly_rate_currency || 'AED')}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Hours</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userEntries.map((entry) => {
                          const cost = entry.hours * (user.hourly_rate || 0);
                          return (
                            <TableRow key={entry.id}>
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
                                {formatCurrencyWithCode(cost, user.hourly_rate_currency || 'AED')}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500"
                                  onClick={() => handleDeleteClick(entry)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })}
            {users.every(u => timeEntries.filter(te => te.user_id === u.id).length === 0) && (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  No time entries for this period. Click &quot;Book Hours&quot; to add one.
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Time Entries Table (for Team-Wise view) */}
        {viewType === 'team-wise' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Time Entries This {timePeriod === 'weekly' ? 'Week' : 'Month'}
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
                          {formatCurrencyWithCode(cost, entryUser?.hourly_rate_currency || 'AED')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500"
                            onClick={() => handleDeleteClick(entry)}
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
                        No time entries this {timePeriod === 'weekly' ? 'week' : 'month'}. Click &quot;Book Hours&quot; to add one.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

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

        {/* Password Confirmation Modal */}
        <PasswordConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setEntryToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
          title="Delete Time Entry"
          description="This will permanently delete this time entry."
          itemName={entryToDelete ? `${entryToDelete.hours} hours on ${formatDate(entryToDelete.date)}` : undefined}
        />
      </div>
    </DashboardLayout>
  );
}
