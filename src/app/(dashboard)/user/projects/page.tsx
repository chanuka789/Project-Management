'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, formatDate, calculateDaysRemaining, getProgressPercentage } from '@/lib/utils';
import {
  FolderKanban,
  Calendar,
  Clock,
  ClipboardList,
  Users,
} from 'lucide-react';
import type { User, Project, Task, TimeEntry } from '@/types/database';

interface ProjectWithDetails extends Project {
  tasks: Task[];
  time_entries: TimeEntry[];
  team_members: User[];
}

export default function UserProjectsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
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

        const projectIds = (projectUsers || []).map(pu => pu.project_id);

        if (projectIds.length > 0) {
          // Fetch tasks for these projects
          const { data: tasks } = await supabase
            .from('tasks')
            .select('*')
            .in('project_id', projectIds);

          // Fetch time entries
          const { data: timeEntries } = await supabase
            .from('time_entries')
            .select('*')
            .eq('user_id', authUser.id)
            .in('project_id', projectIds);

          // Fetch team members
          const { data: allProjectUsers } = await supabase
            .from('project_users')
            .select('project_id, users(*)')
            .in('project_id', projectIds);

          // Combine data
          const projectsWithDetails = (projectUsers || []).map((pu: { projects: Project; project_id: string }) => ({
            ...pu.projects,
            tasks: (tasks || []).filter(t => t.project_id === pu.project_id),
            time_entries: (timeEntries || []).filter(te => te.project_id === pu.project_id),
            team_members: (allProjectUsers || [])
              .filter((apu: { project_id: string }) => apu.project_id === pu.project_id)
              .map((apu: { users: User }) => apu.users)
              .filter(Boolean),
          }));

          setProjects(projectsWithDetails);
        }
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
      <DashboardLayout user={user} title="My Projects">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0a5082]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} title="My Projects">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-black">My Projects</h2>
          <p className="text-gray-500 mt-1">
            View your assigned projects and track progress
          </p>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban className="h-8 w-8" />}
            title="No projects assigned"
            description="You haven't been assigned to any projects yet"
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {projects.map((project) => {
              const daysRemaining = calculateDaysRemaining(project.end_date);
              const myTasks = project.tasks.filter(t => t.assigned_to === user?.id);
              const completedTasks = myTasks.filter(t => t.status === 'completed').length;
              const totalHours = project.time_entries.reduce((sum, te) => sum + te.hours, 0);

              return (
                <Card key={project.id} className="overflow-hidden">
                  <CardHeader className="bg-[#0a5082]/5 border-b border-[#0a5082]/10">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">{project.description}</p>
                      </div>
                      <Badge variant={project.status === 'in_progress' ? 'primary' : 'secondary'}>
                        {project.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {/* Timeline */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Calendar className="h-4 w-4" />
                        {formatDate(project.start_date)} - {formatDate(project.end_date)}
                      </div>
                      <span className={daysRemaining >= 0 ? 'text-[#0a5082] font-medium' : 'text-red-500 font-medium'}>
                        {daysRemaining >= 0 ? `${daysRemaining} days left` : `${Math.abs(daysRemaining)} days overdue`}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-center mb-2">
                          <Clock className="h-5 w-5 text-[#0a5082]" />
                        </div>
                        <p className="text-lg font-bold text-black">{totalHours.toFixed(1)}</p>
                        <p className="text-xs text-gray-500">Hours Logged</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-center mb-2">
                          <ClipboardList className="h-5 w-5 text-[#0a5082]" />
                        </div>
                        <p className="text-lg font-bold text-black">{completedTasks}/{myTasks.length}</p>
                        <p className="text-xs text-gray-500">My Tasks</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-center mb-2">
                          <Users className="h-5 w-5 text-[#0a5082]" />
                        </div>
                        <p className="text-lg font-bold text-black">{project.team_members.length}</p>
                        <p className="text-xs text-gray-500">Team Members</p>
                      </div>
                    </div>

                    {/* Task Progress */}
                    {myTasks.length > 0 && (
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-500">Task Progress</span>
                          <span className="font-medium text-[#0a5082]">
                            {getProgressPercentage(completedTasks, myTasks.length)}%
                          </span>
                        </div>
                        <Progress
                          value={getProgressPercentage(completedTasks, myTasks.length)}
                          size="md"
                        />
                      </div>
                    )}

                    {/* My Tasks List */}
                    {myTasks.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">My Tasks</p>
                        <div className="space-y-2">
                          {myTasks.slice(0, 3).map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-gray-50"
                            >
                              <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${
                                  task.status === 'completed' ? 'bg-[#0a5082]' : 'bg-gray-300'
                                }`} />
                                <span className={`text-sm ${
                                  task.status === 'completed' ? 'line-through text-gray-400' : ''
                                }`}>
                                  {task.title}
                                </span>
                              </div>
                              <Badge variant={task.priority === 'high' ? 'primary' : 'secondary'} className="text-xs">
                                {task.priority}
                              </Badge>
                            </div>
                          ))}
                          {myTasks.length > 3 && (
                            <p className="text-xs text-gray-400 text-center mt-2">
                              +{myTasks.length - 3} more tasks
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
