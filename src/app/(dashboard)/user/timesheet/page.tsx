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
import { useCompanySettings } from '@/hooks/use-company-settings';
import { PasswordConfirmModal } from '@/components/ui/password-confirm-modal';
import { formatDate } from '@/lib/utils';
import {
  Plus,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Save,
  Trash2,
} from 'lucide-react';
import type { User, Project, TimeEntry, ProjectUserWithProject } from '@/types/database';
import { notifyTimesheetSubmitted } from '@/lib/notifications';

export default function TimesheetPage() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [timeEntries, setTimeEntries] = useState<(TimeEntry & { projects: Project })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff)).toISOString().split('T')[0];
  });
  const [formData, setFormData] = useState({
    project_id: '',
    hours: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<(TimeEntry & { projects: Project }) | null>(null);
  const supabase = useMemo(() => createClient(), []);
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

        // Fetch assigned projects
        const { data: projectUsers } = await supabase
          .from('project_users')
          .select('project_id, projects(*)')
          .eq('user_id', authUser.id);

        setProjects(((projectUsers as ProjectUserWithProject[]) || []).map((pu) => Array.isArray(pu.projects) ? pu.projects[0] : pu.projects).filter(Boolean));

        // Fetch time entries for current week
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const { data: entries } = await supabase
          .from('time_entries')
          .select('*, projects(*)')
          .eq('user_id', authUser.id)
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
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: newEntry, error } = await supabase.from('time_entries').insert({
        user_id: authUser.id,
        project_id: formData.project_id,
        hours: parseFloat(formData.hours),
        description: formData.description || null,
        date: formData.date,
      }).select('*, projects(*)').single();

      if (error) throw error;

      // Update state without reloading
      if (newEntry) {
        setTimeEntries([newEntry, ...timeEntries]);

        // Send email notification to admins
        const project = projects.find(p => p.id === formData.project_id);
        notifyTimesheetSubmitted({
          userName: user?.full_name || 'Team Member',
          projectName: project?.name || 'Unknown Project',
          hours: parseFloat(formData.hours),
          date: formData.date,
          description: formData.description || undefined,
        });
      }
      setShowModal(false);
      setFormData({ project_id: '', hours: '', description: '', date: new Date().toISOString().split('T')[0] });
    } catch (error) {
      console.error('Error adding time entry:', error);
      alert('Failed to add time entry');
    }
  };

  const handleDeleteClick = (entry: TimeEntry & { projects: Project }) => {
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

  // Calculate daily hours
  const dailyHours = weekDays.reduce((acc, date) => {
    acc[date] = timeEntries
      .filter(te => te.date === date)
      .reduce((sum, te) => sum + te.hours, 0);
    return acc;
  }, {} as Record<string, number>);

  const totalWeekHours = Object.values(dailyHours).reduce((sum, h) => sum + h, 0);

  if (isLoading) {
    return (
      <DashboardLayout user={user} title="Timesheet" logoUrl={logoUrl} companyName={companyName}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0a5082]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} title="Timesheet" logoUrl={logoUrl} companyName={companyName}>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-black">Timesheet</h2>
            <p className="text-gray-500 mt-1">
              Log and track your working hours
            </p>
          </div>
          <Button onClick={() => {
            setFormData({ ...formData, date: new Date().toISOString().split('T')[0] });
            setShowModal(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Log Time
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
                  Total: <span className="font-medium text-[#0a5082]">{totalWeekHours.toFixed(1)} hours</span>
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => changeWeek('next')}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#0a5082]" />
              Weekly Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((date) => {
                const isToday = date === new Date().toISOString().split('T')[0];
                const hours = dailyHours[date] || 0;

                return (
                  <div
                    key={date}
                    onClick={() => {
                      setFormData({ ...formData, date });
                      setShowModal(true);
                    }}
                    className={`p-4 rounded-lg text-center cursor-pointer transition-colors ${
                      isToday
                        ? 'bg-primary text-white'
                        : hours > 0
                        ? 'bg-primary/10'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    <p className={`text-xs font-medium ${isToday ? 'text-white/80' : 'text-muted-foreground'}`}>
                      {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <p className={`text-lg font-bold mt-1 ${isToday ? 'text-white' : 'text-foreground'}`}>
                      {new Date(date).getDate()}
                    </p>
                    <p className={`text-sm font-medium mt-2 ${
                      isToday ? 'text-white/90' : hours > 0 ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      {hours > 0 ? `${hours}h` : '-'}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Time Entries Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#0a5082]" />
              Time Entries This Week
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
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeEntries.map((entry) => (
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
                    <TableCell className="text-right font-semibold text-[#0a5082]">
                      {entry.hours} hrs
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
                ))}
                {timeEntries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                      No time entries this week. Click &quot;Log Time&quot; to add one.
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
          title="Log Time"
          description="Record your working hours"
          size="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="What did you work on?"
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
