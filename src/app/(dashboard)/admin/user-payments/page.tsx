'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { PasswordConfirmModal } from '@/components/ui/password-confirm-modal';
import { PaymentForm, PaymentFormData } from '@/components/forms/payment-form';
import { useCompanySettings } from '@/hooks/use-company-settings';
import { formatCurrency, formatDate } from '@/lib/utils';
import { formatCurrencyWithCode, getCurrencyInfo, SUPPORTED_CURRENCIES, DEFAULT_EXCHANGE_RATES, convertToAED, convertFromAED, fetchLiveExchangeRate } from '@/lib/currency';
import {
  Plus,
  Search,
  DollarSign,
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  Trash2,
  CreditCard,
  Banknote,
  FileText,
  ChevronDown,
  ChevronUp,
  PieChart,
  BarChart3,
  Edit,
  Wallet,
  Gift,
  ArrowUpRight,
  CircleDollarSign,
  UserCheck,
} from 'lucide-react';
import type { User, Project, PaymentMethod, SupportedCurrency, UserPayment, UserPaymentType, UserPaymentStatus, ProjectUser } from '@/types/database';

interface UserWithPayments extends User {
  payments: UserPayment[];
  total_paid: number;
  total_paid_aed: number;
  total_cost_aed: number;
  pending_aed: number;
  payment_count: number;
}

export default function UserPaymentsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<UserWithPayments[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([]);
  const [payments, setPayments] = useState<UserPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<UserPayment | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<UserPayment | null>(null);
  const [preselectedUserId, setPreselectedUserId] = useState<string>('');
  const [selectedUserForPayment, setSelectedUserForPayment] = useState<string>('');
  const [lkrExchangeRate, setLkrExchangeRate] = useState<number>(DEFAULT_EXCHANGE_RATES.LKR);

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

      // Fetch all users
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .order('full_name');

      // Fetch all projects for assignment
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .order('name');

      setProjects(projectsData || []);

      // Fetch project-user assignments
      const { data: projectUsersData } = await supabase
        .from('project_users')
        .select('*');

      setProjectUsers(projectUsersData || []);

      // Try to fetch user payments from Supabase
      let allPayments: UserPayment[] = [];
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('user_payments')
        .select('*')
        .order('payment_date', { ascending: false });

      if (paymentsError) {
        // Table doesn't exist - use localStorage as fallback
        const savedPayments = localStorage.getItem('user_payments');
        try {
          allPayments = savedPayments ? JSON.parse(savedPayments) : [];
        } catch {
          allPayments = [];
        }
      } else {
        allPayments = paymentsData || [];
        localStorage.setItem('user_payments', JSON.stringify(allPayments));
      }

      setPayments(allPayments);

      // Fetch time entries to calculate costs
      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('*, users(id, hourly_rate, hourly_rate_currency)');

      // Calculate payment summaries for each user
      const usersWithPayments = (usersData || []).map((u) => {
        const userPayments = allPayments.filter(p => p.user_id === u.id);
        const totalPaid = userPayments
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + p.amount, 0);
        const totalPaidAed = userPayments
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + (p.amount_aed || p.amount), 0);

        // Calculate total cost from timesheets (in AED)
        const userTimeEntries = (timeEntries || []).filter((te: { user_id: string }) => te.user_id === u.id);
        const totalCostAed = userTimeEntries.reduce((sum: number, te: { hours: number; users?: { hourly_rate: number; hourly_rate_currency?: string } }) => {
          const hourlyRate = te.users?.hourly_rate || u.hourly_rate || 0;
          const rateCurrency = (te.users?.hourly_rate_currency as SupportedCurrency) || u.hourly_rate_currency || 'AED';
          const hourlyRateAed = rateCurrency === 'AED'
            ? hourlyRate
            : convertToAED(hourlyRate, rateCurrency, DEFAULT_EXCHANGE_RATES[rateCurrency]);
          return sum + (te.hours * hourlyRateAed);
        }, 0);

        // Pending = Total cost - Total paid
        const pendingAed = Math.max(0, totalCostAed - totalPaidAed);

        return {
          ...u,
          payments: userPayments,
          total_paid: totalPaid,
          total_paid_aed: totalPaidAed,
          total_cost_aed: totalCostAed,
          pending_aed: pendingAed,
          payment_count: userPayments.length,
        };
      });

      setUsers(usersWithPayments);

      // Fetch LKR exchange rate
      try {
        const exchangeRateData = await fetch('/api/exchange-rate?from=AED&to=LKR');
        if (exchangeRateData.ok) {
          const rateInfo = await exchangeRateData.json();
          setLkrExchangeRate(rateInfo.rate || DEFAULT_EXCHANGE_RATES.LKR);
        }
      } catch {
        setLkrExchangeRate(DEFAULT_EXCHANGE_RATES.LKR);
      }
    } catch {
      // Data fetch failed - user will see empty state
    } finally {
      setIsLoading(false);
    }
  };

  // Save payment to Supabase or localStorage
  const savePayment = async (payment: Omit<UserPayment, 'id' | 'created_at'> & { id?: string; created_at?: string }): Promise<boolean> => {
    try {
      if (payment.id) {
        // Update existing payment
        const { error } = await supabase
          .from('user_payments')
          .update({
            user_id: payment.user_id,
            project_id: payment.project_id || null,
            amount: payment.amount,
            amount_aed: payment.amount_aed,
            currency: payment.currency,
            exchange_rate: payment.exchange_rate,
            exchange_rate_date: payment.exchange_rate_date,
            payment_date: payment.payment_date,
            payment_type: payment.payment_type,
            payment_method: payment.payment_method || null,
            reference_number: payment.reference_number || null,
            description: payment.description || null,
            status: payment.status,
          })
          .eq('id', payment.id);

        if (error) throw error;
      } else {
        // Create new payment
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('user_payments')
          .insert({
            user_id: payment.user_id,
            project_id: payment.project_id || null,
            amount: payment.amount,
            amount_aed: payment.amount_aed,
            currency: payment.currency,
            exchange_rate: payment.exchange_rate,
            exchange_rate_date: payment.exchange_rate_date,
            payment_date: payment.payment_date,
            payment_type: payment.payment_type,
            payment_method: payment.payment_method || null,
            reference_number: payment.reference_number || null,
            description: payment.description || null,
            status: payment.status,
            created_by: authUser?.id || null,
          });

        if (error) throw error;
      }
      return true;
    } catch {
      // Fallback to localStorage
      const savedPayments = localStorage.getItem('user_payments');
      let allPayments: UserPayment[] = [];
      try {
        allPayments = savedPayments ? JSON.parse(savedPayments) : [];
      } catch {
        allPayments = [];
      }

      if (payment.id) {
        allPayments = allPayments.map(p =>
          p.id === payment.id
            ? { ...p, ...payment, updated_at: new Date().toISOString() }
            : p
        );
      } else {
        const newPayment: UserPayment = {
          ...payment,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
        } as UserPayment;
        allPayments.push(newPayment);
      }

      localStorage.setItem('user_payments', JSON.stringify(allPayments));
      return true;
    }
  };

  // Delete payment
  const deletePayment = async (paymentId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('user_payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;
      return true;
    } catch {
      // Fallback to localStorage
      const savedPayments = localStorage.getItem('user_payments');
      let allPayments: UserPayment[] = [];
      try {
        allPayments = savedPayments ? JSON.parse(savedPayments) : [];
      } catch {
        allPayments = [];
      }
      allPayments = allPayments.filter(p => p.id !== paymentId);
      localStorage.setItem('user_payments', JSON.stringify(allPayments));
      return true;
    }
  };

  // Calculate overview metrics (memoized to prevent recalculation on form inputs)
  const metrics = useMemo(() => ({
    totalPaid: payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount_aed || p.amount), 0),
    totalPendingFromTimesheets: users.reduce((sum, u) => sum + u.pending_aed, 0),
    totalPayments: payments.length,
    activeUsers: users.filter(u => u.payment_count > 0).length,
  }), [payments, users]);

  // Payment type distribution (memoized)
  const paymentTypeData = useMemo(() => ({
    salary: payments.filter(p => p.payment_type === 'salary').length,
    bonus: payments.filter(p => p.payment_type === 'bonus').length,
    reimbursement: payments.filter(p => p.payment_type === 'reimbursement').length,
    advance: payments.filter(p => p.payment_type === 'advance').length,
    commission: payments.filter(p => p.payment_type === 'commission').length,
    other: payments.filter(p => p.payment_type === 'other').length,
  }), [payments]);

  // Monthly payment data for chart (memoized)
  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      months[key] = 0;
    }

    payments.forEach(payment => {
      if (payment.status === 'completed') {
        const date = new Date(payment.payment_date);
        const key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        if (months[key] !== undefined) {
          months[key] += payment.amount_aed || payment.amount;
        }
      }
    });

    return Object.entries(months).map(([month, amount]) => ({ month, amount }));
  }, [payments]);

  const maxMonthlyValue = useMemo(() => Math.max(...monthlyData.map(d => d.amount), 1), [monthlyData]);

  // Filter users (memoized - only recalculate when search/filter/users change)
  const filteredUsers = useMemo(() => users.filter(u => {
    const matchesSearch = u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' ||
      u.payments.some(p => p.payment_type === typeFilter);
    return matchesSearch && matchesType;
  }), [users, searchTerm, typeFilter]);

  const toggleUserExpand = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const handleAddPayment = async (formData: PaymentFormData) => {
    try {
      const amount = parseFloat(formData.amount);

      // Fetch real-time exchange rate at submission time
      let exchangeRate = 1;
      let amountAed = amount;

      if (formData.currency !== 'AED') {
        exchangeRate = await fetchLiveExchangeRate(formData.currency, 'AED');
        amountAed = convertToAED(amount, formData.currency, exchangeRate);
      }

      await savePayment({
        user_id: formData.user_id,
        project_id: formData.project_id || undefined,
        amount: amount,
        amount_aed: amountAed,
        currency: formData.currency,
        exchange_rate: exchangeRate,
        exchange_rate_date: new Date().toISOString().split('T')[0],
        payment_date: formData.payment_date,
        payment_type: formData.payment_type,
        payment_method: formData.payment_method,
        reference_number: formData.reference_number || undefined,
        description: formData.description || undefined,
        status: formData.status,
      });

      setShowAddModal(false);
      setPreselectedUserId('');
      setSelectedUserForPayment('');
      fetchData();
    } catch {
      alert('Failed to add payment');
    }
  };

  const handleEditClick = (payment: UserPayment) => {
    setEditingPayment(payment);
    setShowEditModal(true);
  };

  const handleUpdatePayment = async (formData: PaymentFormData) => {
    if (!editingPayment) return;

    try {
      const amount = parseFloat(formData.amount);

      // Fetch real-time exchange rate at submission time
      let exchangeRate = 1;
      let amountAed = amount;

      if (formData.currency !== 'AED') {
        exchangeRate = await fetchLiveExchangeRate(formData.currency, 'AED');
        amountAed = convertToAED(amount, formData.currency, exchangeRate);
      }

      await savePayment({
        id: editingPayment.id,
        user_id: formData.user_id,
        project_id: formData.project_id || undefined,
        amount: amount,
        amount_aed: amountAed,
        currency: formData.currency,
        exchange_rate: exchangeRate,
        exchange_rate_date: new Date().toISOString().split('T')[0],
        payment_date: formData.payment_date,
        payment_type: formData.payment_type,
        payment_method: formData.payment_method,
        reference_number: formData.reference_number || undefined,
        description: formData.description || undefined,
        status: formData.status,
        created_at: editingPayment.created_at,
      });

      setShowEditModal(false);
      setEditingPayment(null);
      fetchData();
    } catch {
      alert('Failed to update payment');
    }
  };

  const handleDeleteClick = (payment: UserPayment) => {
    setPaymentToDelete(payment);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!paymentToDelete) return;
    try {
      await deletePayment(paymentToDelete.id);
      fetchData();
    } catch {
      alert('Failed to delete payment');
    }
    setPaymentToDelete(null);
  };

  const getPaymentTypeBadge = (type: UserPaymentType) => {
    switch (type) {
      case 'salary':
        return <Badge variant="primary"><Wallet className="h-3 w-3 mr-1" />Salary</Badge>;
      case 'bonus':
        return <Badge variant="success"><Gift className="h-3 w-3 mr-1" />Bonus</Badge>;
      case 'reimbursement':
        return <Badge variant="secondary"><ArrowUpRight className="h-3 w-3 mr-1" />Reimbursement</Badge>;
      case 'advance':
        return <Badge variant="warning"><CircleDollarSign className="h-3 w-3 mr-1" />Advance</Badge>;
      case 'commission':
        return <Badge variant="primary"><TrendingUp className="h-3 w-3 mr-1" />Commission</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: UserPaymentStatus) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'pending':
        return <Badge variant="warning"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
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
      default: return <Wallet className="h-4 w-4" />;
    }
  };

  // Memoized user options for forms (stable reference)
  const userOptions = useMemo(() => [
    { value: '', label: 'Select a team member' },
    ...users.map(u => ({ value: u.id, label: `${u.full_name} (${u.email})` })),
  ], [users]);

  // Get projects assigned to a specific user
  const getProjectsForUser = (userId: string) => {
    if (!userId) return [];
    const userProjectIds = projectUsers
      .filter(pu => pu.user_id === userId)
      .map(pu => pu.project_id);
    return projects.filter(p => userProjectIds.includes(p.id));
  };

  // Memoized filtered project options based on selected user
  const filteredProjectOptions = useMemo(() => {
    const userToFilter = selectedUserForPayment || preselectedUserId;
    if (!userToFilter) {
      return [{ value: '', label: 'Select a team member first' }];
    }
    const userProjects = getProjectsForUser(userToFilter);
    if (userProjects.length === 0) {
      return [{ value: '', label: 'No projects assigned to this user' }];
    }
    return [
      { value: '', label: 'No specific project' },
      ...userProjects.map(p => ({ value: p.id, label: p.name })),
    ];
  }, [projects, projectUsers, selectedUserForPayment, preselectedUserId]);

  // Memoized project options for forms (stable reference) - for edit form, show all projects
  const projectOptions = useMemo(() => [
    { value: '', label: 'No specific project' },
    ...projects.map(p => ({ value: p.id, label: p.name })),
  ], [projects]);

  // Get initial data for edit form (memoized)
  const editFormInitialData = useMemo(() => {
    if (!editingPayment) return undefined;
    return {
      user_id: editingPayment.user_id,
      project_id: editingPayment.project_id || '',
      amount: editingPayment.amount.toString(),
      currency: editingPayment.currency || 'AED',
      payment_date: editingPayment.payment_date,
      payment_type: editingPayment.payment_type,
      payment_method: editingPayment.payment_method || 'bank_transfer',
      reference_number: editingPayment.reference_number || '',
      description: editingPayment.description || '',
      status: editingPayment.status,
    };
  }, [editingPayment]);

  // Memoized filtered project options for edit form based on the payment's user
  const editFilteredProjectOptions = useMemo(() => {
    if (!editingPayment) {
      return [{ value: '', label: 'No specific project' }];
    }
    const userProjects = getProjectsForUser(editingPayment.user_id);
    if (userProjects.length === 0) {
      return [{ value: '', label: 'No projects assigned to this user' }];
    }
    return [
      { value: '', label: 'No specific project' },
      ...userProjects.map(p => ({ value: p.id, label: p.name })),
    ];
  }, [projects, projectUsers, editingPayment]);

  // Get initial data for add form (memoized)
  const addFormInitialData = useMemo(() => {
    if (!preselectedUserId) return undefined;
    return { user_id: preselectedUserId };
  }, [preselectedUserId]);

  if (isLoading) {
    return (
      <DashboardLayout user={user} title="User Payments" logoUrl={logoUrl} companyName={companyName}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} title="Team Payments" logoUrl={logoUrl} companyName={companyName}>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Team Payments</h2>
            <p className="text-muted-foreground mt-1">
              Track and manage payments issued to team members
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Issue Payment
          </Button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Paid (AED)"
            value={formatCurrency(metrics.totalPaid)}
            icon={<DollarSign className="h-5 w-5" />}
            description={`${formatCurrency(metrics.totalPaid * lkrExchangeRate)} LKR`}
            secondaryDescription={`${metrics.totalPayments} payments`}
          />
          <StatCard
            title="Pending to Pay (AED)"
            value={formatCurrency(metrics.totalPendingFromTimesheets)}
            icon={<Clock className="h-5 w-5" />}
            description={`${formatCurrency(metrics.totalPendingFromTimesheets * lkrExchangeRate)} LKR`}
            secondaryDescription="From timesheets"
          />
          <StatCard
            title="Team Members Paid"
            value={metrics.activeUsers.toString()}
            icon={<UserCheck className="h-5 w-5" />}
            description={`of ${users.length} total`}
          />
          <StatCard
            title="This Month"
            value={formatCurrency(monthlyData[monthlyData.length - 1]?.amount || 0)}
            icon={<TrendingUp className="h-5 w-5" />}
            description={`${formatCurrency((monthlyData[monthlyData.length - 1]?.amount || 0) * lkrExchangeRate)} LKR`}
            secondaryDescription={monthlyData[monthlyData.length - 1]?.month || ''}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                Payment Type Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-8">
                <div className="relative w-40 h-40">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
                    {paymentTypeData.salary > 0 && (
                      <circle
                        cx="18" cy="18" r="15.915" fill="none"
                        stroke="#0a5082" strokeWidth="3"
                        strokeDasharray={`${(paymentTypeData.salary / Math.max(payments.length, 1)) * 100} 100`}
                        strokeLinecap="round"
                      />
                    )}
                    {paymentTypeData.bonus > 0 && (
                      <circle
                        cx="18" cy="18" r="15.915" fill="none"
                        stroke="#22c55e" strokeWidth="3"
                        strokeDasharray={`${(paymentTypeData.bonus / Math.max(payments.length, 1)) * 100} 100`}
                        strokeDashoffset={`-${(paymentTypeData.salary / Math.max(payments.length, 1)) * 100}`}
                        strokeLinecap="round"
                      />
                    )}
                    {paymentTypeData.reimbursement > 0 && (
                      <circle
                        cx="18" cy="18" r="15.915" fill="none"
                        stroke="#64748b" strokeWidth="3"
                        strokeDasharray={`${(paymentTypeData.reimbursement / Math.max(payments.length, 1)) * 100} 100`}
                        strokeDashoffset={`-${((paymentTypeData.salary + paymentTypeData.bonus) / Math.max(payments.length, 1)) * 100}`}
                        strokeLinecap="round"
                      />
                    )}
                    {paymentTypeData.advance > 0 && (
                      <circle
                        cx="18" cy="18" r="15.915" fill="none"
                        stroke="#eab308" strokeWidth="3"
                        strokeDasharray={`${(paymentTypeData.advance / Math.max(payments.length, 1)) * 100} 100`}
                        strokeDashoffset={`-${((paymentTypeData.salary + paymentTypeData.bonus + paymentTypeData.reimbursement) / Math.max(payments.length, 1)) * 100}`}
                        strokeLinecap="round"
                      />
                    )}
                    {paymentTypeData.commission > 0 && (
                      <circle
                        cx="18" cy="18" r="15.915" fill="none"
                        stroke="#3b82f6" strokeWidth="3"
                        strokeDasharray={`${(paymentTypeData.commission / Math.max(payments.length, 1)) * 100} 100`}
                        strokeDashoffset={`-${((paymentTypeData.salary + paymentTypeData.bonus + paymentTypeData.reimbursement + paymentTypeData.advance) / Math.max(payments.length, 1)) * 100}`}
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
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#0a5082]" />
                    <span className="text-sm text-muted-foreground">Salary ({paymentTypeData.salary})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm text-muted-foreground">Bonus ({paymentTypeData.bonus})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-500" />
                    <span className="text-sm text-muted-foreground">Reimbursement ({paymentTypeData.reimbursement})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="text-sm text-muted-foreground">Advance ({paymentTypeData.advance})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm text-muted-foreground">Commission ({paymentTypeData.commission})</span>
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
                Monthly Payment Trend (AED)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-end justify-between gap-2">
                {monthlyData.map((data, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col gap-0.5" style={{ height: '160px' }}>
                      <div
                        className="w-full bg-primary rounded-t transition-all duration-300"
                        style={{ height: `${Math.max((data.amount / maxMonthlyValue) * 100, 2)}%`, marginTop: 'auto' }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{data.month}</span>
                  </div>
                ))}
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
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Payment Types' },
                  { value: 'salary', label: 'Salary' },
                  { value: 'bonus', label: 'Bonus' },
                  { value: 'reimbursement', label: 'Reimbursement' },
                  { value: 'advance', label: 'Advance' },
                  { value: 'commission', label: 'Commission' },
                  { value: 'other', label: 'Other' },
                ]}
                className="w-full sm:w-48"
              />
            </div>
          </CardContent>
        </Card>

        {/* User Payment Cards */}
        {filteredUsers.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title="No team members found"
            description={searchTerm || typeFilter !== 'all'
              ? "Try adjusting your search or filter"
              : "Add team members to start tracking payments"
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((u) => {
              const isExpanded = expandedUsers.has(u.id);

              return (
                <Card key={u.id} className="overflow-hidden">
                  <div
                    className="p-4 sm:p-6 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleUserExpand(u.id)}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt={u.full_name} className="h-12 w-12 rounded-full object-cover" />
                            ) : (
                              <Users className="h-6 w-6 text-primary" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{u.full_name}</h3>
                            <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={u.role === 'admin' ? 'primary' : 'secondary'}>
                                {u.role}
                              </Badge>
                              {u.payment_count > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {u.payment_count} payment{u.payment_count !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Paid</p>
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrencyWithCode(
                              u.default_currency && u.default_currency !== 'AED'
                                ? convertFromAED(u.total_paid_aed, u.default_currency, DEFAULT_EXCHANGE_RATES[u.default_currency])
                                : u.total_paid_aed,
                              u.default_currency || 'AED'
                            )}
                          </p>
                          {u.default_currency && u.default_currency !== 'AED' && u.total_paid_aed > 0 && (
                            <p className="text-xs text-muted-foreground">≈ {formatCurrencyWithCode(u.total_paid_aed, 'AED')}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Pending</p>
                          <p className={`text-lg font-bold ${u.pending_aed > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                            {formatCurrencyWithCode(
                              u.default_currency && u.default_currency !== 'AED'
                                ? convertFromAED(u.pending_aed, u.default_currency, DEFAULT_EXCHANGE_RATES[u.default_currency])
                                : u.pending_aed,
                              u.default_currency || 'AED'
                            )}
                          </p>
                          {u.default_currency && u.default_currency !== 'AED' && u.pending_aed > 0 && (
                            <p className="text-xs text-muted-foreground">≈ {formatCurrencyWithCode(u.pending_aed, 'AED')}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Project</TableHead>
                              <TableHead>Method</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {u.payments.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                  No payments recorded for this team member
                                </TableCell>
                              </TableRow>
                            ) : (
                              u.payments.map((payment) => (
                                <TableRow key={payment.id}>
                                  <TableCell>{formatDate(payment.payment_date)}</TableCell>
                                  <TableCell>{getPaymentTypeBadge(payment.payment_type)}</TableCell>
                                  <TableCell>
                                    {payment.project_id
                                      ? projects.find(p => p.id === payment.project_id)?.name || '-'
                                      : '-'
                                    }
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {getPaymentMethodIcon(payment.payment_method)}
                                      <span className="capitalize text-sm">
                                        {payment.payment_method?.replace('_', ' ') || '-'}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div>
                                      <span className="font-medium">
                                        {formatCurrencyWithCode(payment.amount, payment.currency || 'AED')}
                                      </span>
                                      {payment.currency && payment.currency !== 'AED' && payment.amount_aed && (
                                        <span className="block text-xs text-muted-foreground">
                                          ≈ {formatCurrencyWithCode(payment.amount_aed, 'AED')}
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-primary"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditClick(payment);
                                        }}
                                        title="Edit Payment"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-500"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteClick(payment);
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="px-4 sm:px-6 py-3 border-t border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreselectedUserId(u.id);
                            setSelectedUserForPayment(u.id);
                            setShowAddModal(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Payment for {u.full_name}
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
        onClose={() => {
          setShowAddModal(false);
          setPreselectedUserId('');
          setSelectedUserForPayment('');
        }}
        title="Issue Payment"
        description="Record a payment issued to a team member"
        size="lg"
      >
        <PaymentForm
          initialData={addFormInitialData}
          users={userOptions}
          projects={filteredProjectOptions}
          isEdit={false}
          onSubmit={handleAddPayment}
          onCancel={() => {
            setShowAddModal(false);
            setPreselectedUserId('');
            setSelectedUserForPayment('');
          }}
          onUserChange={(userId) => setSelectedUserForPayment(userId)}
        />
      </Modal>

      {/* Edit Payment Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingPayment(null);
        }}
        title="Edit Payment"
        description="Update payment details"
        size="lg"
      >
        <PaymentForm
          initialData={editFormInitialData}
          users={userOptions}
          projects={editFilteredProjectOptions}
          isEdit={true}
          onSubmit={handleUpdatePayment}
          onCancel={() => {
            setShowEditModal(false);
            setEditingPayment(null);
          }}
        />
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
        itemName={paymentToDelete ? `${formatCurrencyWithCode(paymentToDelete.amount, paymentToDelete.currency || 'AED')} payment` : undefined}
      />
    </DashboardLayout>
  );
}
