'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, formatDate, calculateDaysRemaining } from '@/lib/utils';
import { useCompanySettings } from '@/hooks/use-company-settings';
import { PasswordConfirmModal } from '@/components/ui/password-confirm-modal';
import {
  Plus,
  Search,
  FolderKanban,
  Calendar,
  DollarSign,
  Users,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Building2,
} from 'lucide-react';
import type { User, Project, SupportedCurrency } from '@/types/database';
import { getCurrencyInfo, formatCurrencyWithCode } from '@/lib/currency';

export default function ProjectsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
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
          setUser(profile);
        }

        const { data: projectsData } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });

        setProjects(projectsData || []);
        setFilteredProjects(projectsData || []);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  useEffect(() => {
    let filtered = projects;

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    setFilteredProjects(filtered);
  }, [searchTerm, statusFilter, projects]);

  const handleDeleteClick = (project: Project) => {
    setProjectToDelete(project);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectToDelete.id);

    if (!error) {
      setProjects(projects.filter(p => p.id !== projectToDelete.id));
    }
    setProjectToDelete(null);
  };

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'planning', label: 'Planning' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'in_progress': return 'primary';
      case 'completed': return 'success';
      case 'on_hold': return 'warning';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout user={user} title="Projects" logoUrl={logoUrl} companyName={companyName}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0a5082]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} title="Projects" logoUrl={logoUrl} companyName={companyName}>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-black">Projects</h2>
            <p className="text-gray-500 mt-1">
              Manage and monitor all your projects
            </p>
          </div>
          <Link href="/admin/projects/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={statusOptions}
                className="w-full sm:w-48"
              />
            </div>
          </CardContent>
        </Card>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban className="h-8 w-8" />}
            title="No projects found"
            description={searchTerm || statusFilter !== 'all'
              ? "Try adjusting your search or filter"
              : "Get started by creating your first project"
            }
            action={
              !searchTerm && statusFilter === 'all'
                ? { label: 'Create Project', onClick: () => window.location.href = '/admin/projects/new' }
                : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProjects.map((project) => {
              const daysRemaining = calculateDaysRemaining(project.end_date);
              // Don't show as overdue if project is completed or cancelled
              const isOverdue = daysRemaining < 0 && project.status !== 'completed' && project.status !== 'cancelled';
              const isCompleted = project.status === 'completed';

              return (
                <Card key={project.id} hover className="relative group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-[#0a5082]/10 flex items-center justify-center">
                          <FolderKanban className="h-6 w-6 text-[#0a5082]" />
                        </div>
                        <div>
                          <CardTitle className="text-base line-clamp-1">
                            {project.name}
                          </CardTitle>
                          <Badge
                            variant={getStatusBadgeVariant(project.status)}
                            className="mt-1"
                          >
                            {project.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      <div className="relative">
                        <button className="p-1 rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-5 w-5 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {project.client_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600 font-medium">{project.client_name}</span>
                      </div>
                    )}
                    {project.description && (
                      <p className="text-sm text-gray-500 line-clamp-2">
                        {project.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">
                          {formatDate(project.start_date)}
                        </span>
                      </div>
                      <div className="flex flex-col text-sm">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600 font-medium">
                            {formatCurrencyWithCode(project.contract_value, (project.currency as SupportedCurrency) || 'AED')}
                          </span>
                        </div>
                        {project.currency && project.currency !== 'AED' && project.contract_value_aed && (
                          <span className="text-xs text-muted-foreground ml-6">
                            ≈ {formatCurrencyWithCode(project.contract_value_aed, 'AED')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress bar (placeholder - calculate from actual data) */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Progress</span>
                        <span className={isOverdue ? 'text-red-500 font-medium' : isCompleted ? 'text-green-600 font-medium' : 'text-[#0a5082] font-medium'}>
                          {isCompleted
                            ? 'Completed'
                            : isOverdue
                              ? `${Math.abs(daysRemaining)} days overdue`
                              : `${daysRemaining} days left`
                          }
                        </span>
                      </div>
                      <Progress
                        value={isCompleted ? 100 : Math.min(50, 100)}
                        size="sm"
                        variant={isOverdue ? 'warning' : isCompleted ? 'success' : 'default'}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <Link href={`/admin/projects/${project.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                      <Link href={`/admin/projects/${project.id}/edit`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteClick(project)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Password Confirmation Modal */}
      <PasswordConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setProjectToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Project"
        description="This will permanently delete this project and all associated data including tasks, time entries, and costs."
        itemName={projectToDelete?.name}
      />
    </DashboardLayout>
  );
}
