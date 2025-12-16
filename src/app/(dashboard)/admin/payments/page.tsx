'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { PasswordConfirmModal } from '@/components/ui/password-confirm-modal';
import { useCompanySettings } from '@/hooks/use-company-settings';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Plus,
  Search,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Building2,
  Mail,
  Phone,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  CreditCard,
  Banknote,
  FileText,
  Calendar,
  ChevronDown,
  ChevronUp,
  PieChart,
  BarChart3,
  X,
} from 'lucide-react';
import type { User, Project, Payment, PaymentStatus, PaymentMethod } from '@/types/database';

interface ProjectWithPayments extends Project {
  payments: Payment[];
  total_paid: number;
  total_pending: number;
  balance_due: number;
  payment_percentage: number;
}

interface ClientContact {
  emails: string[];
  phones: string[];
}

export default function PaymentsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<ProjectWithPayments[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithPayments | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [clientContacts, setClientContacts] = useState<Record<string, ClientContact>>({});
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [clientForm, setClientForm] = useState<ClientContact>({ emails: [''], phones: [''] });

  const [paymentForm, setPaymentForm] = useState({
    project_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    due_date: '',
    status: 'pending' as PaymentStatus,
    payment_method: 'bank_transfer' as PaymentMethod,
    reference_number: '',
    invoice_number: '',
    description: '',
  });

  const supabase = createClient();
  const { companyName, logoUrl } = useCompanySettings();

  useEffect(() => {
    fetchData();
  }, []);

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

      // Fetch all projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch all payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: false });

      const allPayments = paymentsData || [];
      setPayments(allPayments);

      // Calculate payment summaries for each project
      const projectsWithPayments = (projectsData || []).map((project) => {
        const projectPayments = allPayments.filter(p => p.project_id === project.id);
        const totalPaid = projectPayments
          .filter(p => p.status === 'paid')
          .reduce((sum, p) => sum + p.amount, 0);
        const totalPending = projectPayments
          .filter(p => p.status === 'pending' || p.status === 'partial')
          .reduce((sum, p) => sum + p.amount, 0);
        const balanceDue = project.contract_value - totalPaid;
        const paymentPercentage = project.contract_value > 0
          ? (totalPaid / project.contract_value) * 100
          : 0;

        return {
          ...project,
          payments: projectPayments,
          total_paid: totalPaid,
          total_pending: totalPending,
          balance_due: Math.max(0, balanceDue),
          payment_percentage: Math.min(100, paymentPercentage),
        };
      });

      setProjects(projectsWithPayments);

      // Load client contacts from localStorage (temporary storage)
      const savedContacts = localStorage.getItem('client_contacts');
      if (savedContacts) {
        setClientContacts(JSON.parse(savedContacts));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate overview metrics
  const metrics = {
    totalContractValue: projects.reduce((sum, p) => sum + p.contract_value, 0),
    totalReceived: projects.reduce((sum, p) => sum + p.total_paid, 0),
    totalPending: projects.reduce((sum, p) => sum + p.total_pending, 0),
    totalBalance: projects.reduce((sum, p) => sum + p.balance_due, 0),
    overduePayments: payments.filter(p =>
      p.status === 'pending' && p.due_date && new Date(p.due_date) < new Date()
    ).length,
  };

  // Payment status distribution
  const paymentStatusData = {
    paid: payments.filter(p => p.status === 'paid').length,
    pending: payments.filter(p => p.status === 'pending').length,
    partial: payments.filter(p => p.status === 'partial').length,
    overdue: payments.filter(p => p.status === 'overdue').length,
  };

  // Monthly payment data for chart
  const getMonthlyData = () => {
    const months: Record<string, { received: number; pending: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      months[key] = { received: 0, pending: 0 };
    }

    payments.forEach(payment => {
      const date = new Date(payment.payment_date);
      const key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (months[key]) {
        if (payment.status === 'paid') {
          months[key].received += payment.amount;
        } else {
          months[key].pending += payment.amount;
        }
      }
    });

    return Object.entries(months).map(([month, data]) => ({
      month,
      ...data,
    }));
  };

  const monthlyData = getMonthlyData();
  const maxMonthlyValue = Math.max(...monthlyData.map(d => d.received + d.pending), 1);

  // Filter projects
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'fully_paid' && project.payment_percentage >= 100) ||
      (statusFilter === 'partial' && project.payment_percentage > 0 && project.payment_percentage < 100) ||
      (statusFilter === 'unpaid' && project.payment_percentage === 0);
    return matchesSearch && matchesStatus;
  });

  const toggleProjectExpand = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { error } = await supabase.from('payments').insert({
        project_id: paymentForm.project_id,
        amount: parseFloat(paymentForm.amount),
        payment_date: paymentForm.payment_date,
        due_date: paymentForm.due_date || null,
        status: paymentForm.status,
        payment_method: paymentForm.payment_method,
        reference_number: paymentForm.reference_number || null,
        invoice_number: paymentForm.invoice_number || null,
        description: paymentForm.description || null,
        created_by: authUser.id,
      });

      if (error) throw error;

      setShowAddModal(false);
      setPaymentForm({
        project_id: '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        due_date: '',
        status: 'pending',
        payment_method: 'bank_transfer',
        reference_number: '',
        invoice_number: '',
        description: '',
      });
      fetchData();
    } catch (error) {
      console.error('Error adding payment:', error);
      alert('Failed to add payment');
    }
  };

  const handleDeleteClick = (payment: Payment) => {
    setPaymentToDelete(payment);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!paymentToDelete) return;
    try {
      const { error } = await supabase.from('payments').delete().eq('id', paymentToDelete.id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting payment:', error);
    }
    setPaymentToDelete(null);
  };

  const handleSaveClientContacts = (projectId: string) => {
    const newContacts = {
      ...clientContacts,
      [projectId]: {
        emails: clientForm.emails.filter(e => e.trim()),
        phones: clientForm.phones.filter(p => p.trim()),
      },
    };
    setClientContacts(newContacts);
    localStorage.setItem('client_contacts', JSON.stringify(newContacts));
    setShowClientModal(false);
    setEditingClientId(null);
  };

  const openClientModal = (projectId: string) => {
    const existing = clientContacts[projectId] || { emails: [''], phones: [''] };
    setClientForm({
      emails: existing.emails.length > 0 ? existing.emails : [''],
      phones: existing.phones.length > 0 ? existing.phones : [''],
    });
    setEditingClientId(projectId);
    setShowClientModal(true);
  };

  const addEmailField = () => setClientForm({ ...clientForm, emails: [...clientForm.emails, ''] });
  const addPhoneField = () => setClientForm({ ...clientForm, phones: [...clientForm.phones, ''] });
  const removeEmailField = (index: number) => {
    const newEmails = clientForm.emails.filter((_, i) => i !== index);
    setClientForm({ ...clientForm, emails: newEmails.length > 0 ? newEmails : [''] });
  };
  const removePhoneField = (index: number) => {
    const newPhones = clientForm.phones.filter((_, i) => i !== index);
    setClientForm({ ...clientForm, phones: newPhones.length > 0 ? newPhones : [''] });
  };

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" />Paid</Badge>;
      case 'pending':
        return <Badge variant="warning"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'partial':
        return <Badge variant="primary"><TrendingUp className="h-3 w-3 mr-1" />Partial</Badge>;
      case 'overdue':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Overdue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentMethodIcon = (method?: PaymentMethod) => {
    switch (method) {
      case 'bank_transfer': return <Banknote className="h-4 w-4" />;
      case 'credit_card': return <CreditCard className="h-4 w-4" />;
      case 'cheque': return <FileText className="h-4 w-4" />;
      case 'cash': return <DollarSign className="h-4 w-4" />;
      default: return <Receipt className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout user={user} title="Payments" logoUrl={logoUrl} companyName={companyName}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} title="Client Payments" logoUrl={logoUrl} companyName={companyName}>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Client Payments</h2>
            <p className="text-muted-foreground mt-1">
              Track and manage client payments for all projects
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Contract Value"
            value={formatCurrency(metrics.totalContractValue)}
            icon={<FileText className="h-5 w-5" />}
            description={`${projects.length} projects`}
          />
          <StatCard
            title="Total Received"
            value={formatCurrency(metrics.totalReceived)}
            icon={<CheckCircle2 className="h-5 w-5" />}
            trend={{ value: metrics.totalContractValue > 0 ? Math.round((metrics.totalReceived / metrics.totalContractValue) * 100) : 0, label: 'collected' }}
          />
          <StatCard
            title="Pending Payments"
            value={formatCurrency(metrics.totalPending)}
            icon={<Clock className="h-5 w-5" />}
            description={`${paymentStatusData.pending} invoices`}
          />
          <StatCard
            title="Balance Due"
            value={formatCurrency(metrics.totalBalance)}
            icon={<AlertCircle className="h-5 w-5" />}
            description={metrics.overduePayments > 0 ? `${metrics.overduePayments} overdue` : 'All on time'}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                Payment Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-8">
                {/* Visual Pie Chart */}
                <div className="relative w-40 h-40">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    {/* Background circle */}
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
                    {/* Paid segment */}
                    {paymentStatusData.paid > 0 && (
                      <circle
                        cx="18" cy="18" r="15.915" fill="none"
                        stroke="#22c55e" strokeWidth="3"
                        strokeDasharray={`${(paymentStatusData.paid / Math.max(payments.length, 1)) * 100} 100`}
                        strokeLinecap="round"
                      />
                    )}
                    {/* Pending segment */}
                    {paymentStatusData.pending > 0 && (
                      <circle
                        cx="18" cy="18" r="15.915" fill="none"
                        stroke="#eab308" strokeWidth="3"
                        strokeDasharray={`${(paymentStatusData.pending / Math.max(payments.length, 1)) * 100} 100`}
                        strokeDashoffset={`-${(paymentStatusData.paid / Math.max(payments.length, 1)) * 100}`}
                        strokeLinecap="round"
                      />
                    )}
                    {/* Partial segment */}
                    {paymentStatusData.partial > 0 && (
                      <circle
                        cx="18" cy="18" r="15.915" fill="none"
                        stroke="#3b82f6" strokeWidth="3"
                        strokeDasharray={`${(paymentStatusData.partial / Math.max(payments.length, 1)) * 100} 100`}
                        strokeDashoffset={`-${((paymentStatusData.paid + paymentStatusData.pending) / Math.max(payments.length, 1)) * 100}`}
                        strokeLinecap="round"
                      />
                    )}
                    {/* Overdue segment */}
                    {paymentStatusData.overdue > 0 && (
                      <circle
                        cx="18" cy="18" r="15.915" fill="none"
                        stroke="#ef4444" strokeWidth="3"
                        strokeDasharray={`${(paymentStatusData.overdue / Math.max(payments.length, 1)) * 100} 100`}
                        strokeDashoffset={`-${((paymentStatusData.paid + paymentStatusData.pending + paymentStatusData.partial) / Math.max(payments.length, 1)) * 100}`}
                        strokeLinecap="round"
                      />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">{payments.length}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                </div>
                {/* Legend */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm text-muted-foreground">Paid ({paymentStatusData.paid})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="text-sm text-muted-foreground">Pending ({paymentStatusData.pending})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm text-muted-foreground">Partial ({paymentStatusData.partial})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm text-muted-foreground">Overdue ({paymentStatusData.overdue})</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Payment Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Monthly Payment Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-end justify-between gap-2">
                {monthlyData.map((data, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col gap-0.5" style={{ height: '160px' }}>
                      {/* Pending bar */}
                      <div
                        className="w-full bg-yellow-500/30 rounded-t transition-all duration-300"
                        style={{ height: `${(data.pending / maxMonthlyValue) * 100}%` }}
                      />
                      {/* Received bar */}
                      <div
                        className="w-full bg-green-500 rounded-t transition-all duration-300"
                        style={{ height: `${(data.received / maxMonthlyValue) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{data.month}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-green-500" />
                  <span className="text-sm text-muted-foreground">Received</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-yellow-500/30" />
                  <span className="text-sm text-muted-foreground">Pending</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by project or client name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Payment Status' },
                  { value: 'fully_paid', label: 'Fully Paid' },
                  { value: 'partial', label: 'Partially Paid' },
                  { value: 'unpaid', label: 'Unpaid' },
                ]}
                className="w-full sm:w-48"
              />
            </div>
          </CardContent>
        </Card>

        {/* Project Payment Cards */}
        {filteredProjects.length === 0 ? (
          <EmptyState
            icon={<Receipt className="h-8 w-8" />}
            title="No projects found"
            description={searchTerm || statusFilter !== 'all'
              ? "Try adjusting your search or filter"
              : "Add your first project to start tracking payments"
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredProjects.map((project) => {
              const isExpanded = expandedProjects.has(project.id);
              const contacts = clientContacts[project.id];

              return (
                <Card key={project.id} className="overflow-hidden">
                  {/* Project Header */}
                  <div
                    className="p-4 sm:p-6 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleProjectExpand(project.id)}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Project Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-6 w-6 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{project.name}</h3>
                            {project.client_name && (
                              <p className="text-sm text-muted-foreground truncate">
                                Client: {project.client_name}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-1">
                              <Badge variant={project.status === 'completed' ? 'success' : project.status === 'in_progress' ? 'primary' : 'secondary'}>
                                {project.status.replace('_', ' ')}
                              </Badge>
                              {contacts && (contacts.emails.length > 0 || contacts.phones.length > 0) && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {contacts.emails.filter(e => e).length > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      {contacts.emails.filter(e => e).length}
                                    </span>
                                  )}
                                  {contacts.phones.filter(p => p).length > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {contacts.phones.filter(p => p).length}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Payment Progress */}
                      <div className="flex-1 max-w-md">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Payment Progress</span>
                          <span className="font-medium text-foreground">
                            {project.payment_percentage.toFixed(0)}%
                          </span>
                        </div>
                        <Progress
                          value={project.payment_percentage}
                          variant={project.payment_percentage >= 100 ? 'success' : project.payment_percentage > 0 ? 'default' : 'warning'}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Received: {formatCurrency(project.total_paid)}</span>
                          <span>Balance: {formatCurrency(project.balance_due)}</span>
                        </div>
                      </div>

                      {/* Contract Value & Actions */}
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Contract Value</p>
                          <p className="text-lg font-bold text-foreground">{formatCurrency(project.contract_value)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              openClientModal(project.id);
                            }}
                            title="Manage client contacts"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Payment Details */}
                  {isExpanded && (
                    <div className="border-t border-border">
                      {/* Client Contact Info */}
                      {contacts && (contacts.emails.some(e => e) || contacts.phones.some(p => p)) && (
                        <div className="px-4 sm:px-6 py-3 bg-muted/30 border-b border-border">
                          <div className="flex flex-wrap gap-4">
                            {contacts.emails.filter(e => e).map((email, i) => (
                              <a
                                key={i}
                                href={`mailto:${email}`}
                                className="flex items-center gap-2 text-sm text-primary hover:underline"
                              >
                                <Mail className="h-4 w-4" />
                                {email}
                              </a>
                            ))}
                            {contacts.phones.filter(p => p).map((phone, i) => (
                              <a
                                key={i}
                                href={`tel:${phone}`}
                                className="flex items-center gap-2 text-sm text-primary hover:underline"
                              >
                                <Phone className="h-4 w-4" />
                                {phone}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Payment Table */}
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Invoice #</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Method</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Due Date</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {project.payments.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                  No payments recorded for this project
                                </TableCell>
                              </TableRow>
                            ) : (
                              project.payments.map((payment) => (
                                <TableRow key={payment.id}>
                                  <TableCell>{formatDate(payment.payment_date)}</TableCell>
                                  <TableCell>
                                    {payment.invoice_number || '-'}
                                  </TableCell>
                                  <TableCell className="max-w-xs truncate">
                                    {payment.description || '-'}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {getPaymentMethodIcon(payment.payment_method)}
                                      <span className="capitalize text-sm">
                                        {payment.payment_method?.replace('_', ' ') || '-'}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatCurrency(payment.amount)}
                                  </TableCell>
                                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                                  <TableCell>
                                    {payment.due_date ? formatDate(payment.due_date) : '-'}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-red-500"
                                      onClick={() => handleDeleteClick(payment)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Add Payment Button */}
                      <div className="px-4 sm:px-6 py-3 border-t border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPaymentForm({ ...paymentForm, project_id: project.id });
                            setShowAddModal(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Payment for this Project
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Payment Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Record Payment"
        description="Add a new payment record for a project"
        size="lg"
      >
        <form onSubmit={handleAddPayment} className="space-y-4">
          <Select
            label="Project"
            value={paymentForm.project_id}
            onChange={(e) => setPaymentForm({ ...paymentForm, project_id: e.target.value })}
            options={[
              { value: '', label: 'Select a project' },
              ...projects.map(p => ({ value: p.id, label: `${p.name}${p.client_name ? ` - ${p.client_name}` : ''}` })),
            ]}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount (AED)"
              type="number"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              min="0"
              step="0.01"
              required
            />
            <Select
              label="Status"
              value={paymentForm.status}
              onChange={(e) => setPaymentForm({ ...paymentForm, status: e.target.value as PaymentStatus })}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'paid', label: 'Paid' },
                { value: 'partial', label: 'Partial' },
                { value: 'overdue', label: 'Overdue' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Payment Date"
              type="date"
              value={paymentForm.payment_date}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
              required
            />
            <Input
              label="Due Date (optional)"
              type="date"
              value={paymentForm.due_date}
              onChange={(e) => setPaymentForm({ ...paymentForm, due_date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Payment Method"
              value={paymentForm.payment_method}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value as PaymentMethod })}
              options={[
                { value: 'bank_transfer', label: 'Bank Transfer' },
                { value: 'cash', label: 'Cash' },
                { value: 'cheque', label: 'Cheque' },
                { value: 'credit_card', label: 'Credit Card' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <Input
              label="Invoice Number"
              value={paymentForm.invoice_number}
              onChange={(e) => setPaymentForm({ ...paymentForm, invoice_number: e.target.value })}
              placeholder="INV-001"
            />
          </div>

          <Input
            label="Reference Number"
            value={paymentForm.reference_number}
            onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
            placeholder="Transaction reference"
          />

          <Textarea
            label="Description"
            value={paymentForm.description}
            onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
            placeholder="Payment details or notes..."
            rows={2}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <Receipt className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Client Contact Modal */}
      <Modal
        isOpen={showClientModal}
        onClose={() => {
          setShowClientModal(false);
          setEditingClientId(null);
        }}
        title="Client Contact Information"
        description="Add or edit client emails and phone numbers"
        size="md"
      >
        <div className="space-y-6">
          {/* Emails */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Email Addresses
            </label>
            <div className="space-y-2">
              {clientForm.emails.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1 relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        const newEmails = [...clientForm.emails];
                        newEmails[index] = e.target.value;
                        setClientForm({ ...clientForm, emails: newEmails });
                      }}
                      placeholder="client@example.com"
                      className="pl-10"
                    />
                  </div>
                  {clientForm.emails.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEmailField(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addEmailField}>
                <Plus className="h-4 w-4 mr-2" />
                Add Email
              </Button>
            </div>
          </div>

          {/* Phone Numbers */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Phone Numbers
            </label>
            <div className="space-y-2">
              {clientForm.phones.map((phone, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1 relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        const newPhones = [...clientForm.phones];
                        newPhones[index] = e.target.value;
                        setClientForm({ ...clientForm, phones: newPhones });
                      }}
                      placeholder="+971 50 123 4567"
                      className="pl-10"
                    />
                  </div>
                  {clientForm.phones.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePhoneField(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addPhoneField}>
                <Plus className="h-4 w-4 mr-2" />
                Add Phone
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowClientModal(false);
                setEditingClientId(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => editingClientId && handleSaveClientContacts(editingClientId)}>
              Save Contacts
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <PasswordConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setPaymentToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Payment"
        description="This will permanently delete this payment record."
        itemName={paymentToDelete ? `${formatCurrency(paymentToDelete.amount)} payment` : undefined}
      />
    </DashboardLayout>
  );
}
