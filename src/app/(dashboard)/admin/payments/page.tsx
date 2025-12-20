'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { PasswordConfirmModal } from '@/components/ui/password-confirm-modal';
import { ClientPaymentForm, ClientPaymentFormData } from '@/components/forms/client-payment-form';
import { useCompanySettings } from '@/hooks/use-company-settings';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Plus,
  Search,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Building2,
  Mail,
  Phone,
  Trash2,
  CreditCard,
  Banknote,
  FileText,
  ChevronDown,
  ChevronUp,
  PieChart,
  BarChart3,
  X,
  Printer,
  Edit,
} from 'lucide-react';
import type { User, Project, PaymentStatus, PaymentMethod, SupportedCurrency } from '@/types/database';
import { formatCurrencyWithCode, getCurrencyInfo, convertToAED, convertFromAED, DEFAULT_CURRENCY } from '@/lib/currency';

// Payment type for Supabase storage
interface Payment {
  id: string;
  project_id: string;
  amount: number;
  currency: SupportedCurrency;
  payment_date: string;
  due_date?: string;
  status: PaymentStatus;
  payment_method?: PaymentMethod;
  reference_number?: string;
  invoice_number: string;
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

interface ProjectWithPayments extends Project {
  payments: Payment[];
  total_paid: number;
  total_pending: number;
  balance_due: number;
  payment_percentage: number;
  currency: SupportedCurrency;
  contract_value_aed?: number;
  exchange_rate?: number;
}

interface ClientContact {
  emails: string[];
  phones: string[];
}

// Generate unique invoice number
const generateInvoiceNumber = (existingPayments: Payment[]): string => {
  const existingNumbers = existingPayments
    .map(p => {
      const match = p.invoice_number?.match(/INV-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => n > 0);

  const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
  const nextNumber = maxNumber + 1;
  return `INV-${nextNumber.toString().padStart(6, '0')}`;
};

/**
 * Convert payment amount to target currency
 * @param amount - The payment amount
 * @param fromCurrency - The currency of the payment
 * @param toCurrency - The target currency to convert to
 * @returns Converted amount in target currency
 */
const convertPaymentAmount = (
  amount: number,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency
): number => {
  if (fromCurrency === toCurrency) return amount;

  // Convert to AED first, then to target currency
  const amountInAED = convertToAED(amount, fromCurrency);
  return convertFromAED(amountInAED, toCurrency);
};

export default function PaymentsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<ProjectWithPayments[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [clientContacts, setClientContacts] = useState<Record<string, ClientContact>>({});
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [clientForm, setClientForm] = useState<ClientContact>({ emails: [''], phones: [''] });
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedProjectForInvoice, setSelectedProjectForInvoice] = useState<ProjectWithPayments | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [preselectedProjectId, setPreselectedProjectId] = useState<string>('');

  const supabase = createClient();
  const { companyName, logoUrl, companyEmail, companyPhone, companyAddress } = useCompanySettings();

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

      // Try to fetch payments from Supabase first
      let allPayments: Payment[] = [];
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: false });

      if (paymentsError) {
        // Table doesn't exist or other error - use localStorage as fallback
        console.log('Using localStorage for payments (Supabase table not available)');
        const savedPayments = localStorage.getItem('project_payments');
        allPayments = savedPayments ? JSON.parse(savedPayments) : [];
      } else {
        allPayments = paymentsData || [];
        // Sync to localStorage for offline access
        localStorage.setItem('project_payments', JSON.stringify(allPayments));
      }

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

      // Load client contacts from localStorage
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

  // Save payment to Supabase or localStorage
  const savePayment = async (payment: Omit<Payment, 'id' | 'created_at'> & { id?: string; created_at?: string }): Promise<boolean> => {
    try {
      // Try Supabase first
      if (payment.id) {
        // Update existing payment
        const { error } = await supabase
          .from('payments')
          .update({
            project_id: payment.project_id,
            amount: payment.amount,
            payment_date: payment.payment_date,
            due_date: payment.due_date || null,
            status: payment.status,
            payment_method: payment.payment_method || null,
            reference_number: payment.reference_number || null,
            invoice_number: payment.invoice_number,
            description: payment.description || null,
          })
          .eq('id', payment.id);

        if (error) throw error;
      } else {
        // Create new payment
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('payments')
          .insert({
            project_id: payment.project_id,
            amount: payment.amount,
            payment_date: payment.payment_date,
            due_date: payment.due_date || null,
            status: payment.status,
            payment_method: payment.payment_method || null,
            reference_number: payment.reference_number || null,
            invoice_number: payment.invoice_number,
            description: payment.description || null,
            created_by: authUser?.id || null,
          });

        if (error) throw error;
      }
      return true;
    } catch (supabaseError) {
      console.log('Supabase save failed, using localStorage:', supabaseError);

      // Fallback to localStorage
      const savedPayments = localStorage.getItem('project_payments');
      let allPayments: Payment[] = savedPayments ? JSON.parse(savedPayments) : [];

      if (payment.id) {
        // Update existing
        allPayments = allPayments.map(p =>
          p.id === payment.id
            ? { ...p, ...payment, updated_at: new Date().toISOString() }
            : p
        );
      } else {
        // Create new
        const newPayment: Payment = {
          ...payment,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
        } as Payment;
        allPayments.push(newPayment);
      }

      localStorage.setItem('project_payments', JSON.stringify(allPayments));
      return true;
    }
  };

  // Delete payment from Supabase or localStorage
  const deletePayment = async (paymentId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;
      return true;
    } catch (supabaseError) {
      console.log('Supabase delete failed, using localStorage:', supabaseError);

      const savedPayments = localStorage.getItem('project_payments');
      let allPayments: Payment[] = savedPayments ? JSON.parse(savedPayments) : [];
      allPayments = allPayments.filter(p => p.id !== paymentId);
      localStorage.setItem('project_payments', JSON.stringify(allPayments));
      return true;
    }
  };

  // Calculate overview metrics (memoized to prevent recalculation on form inputs)
  const metrics = useMemo(() => {
    const userCurrency = user?.default_currency || DEFAULT_CURRENCY;

    // Calculate total received (paid + partial payments) in user's default currency
    const totalReceived = payments
      .filter(p => p.status === 'paid' || p.status === 'partial')
      .reduce((sum, p) => {
        const convertedAmount = convertPaymentAmount(p.amount, p.currency, userCurrency);
        return sum + convertedAmount;
      }, 0);

    // Calculate total pending in user's default currency
    const totalPending = payments
      .filter(p => p.status === 'pending' || p.status === 'overdue')
      .reduce((sum, p) => {
        const convertedAmount = convertPaymentAmount(p.amount, p.currency, userCurrency);
        return sum + convertedAmount;
      }, 0);

    // Calculate total contract value in user's default currency
    const totalContractValue = projects.reduce((sum, p) => {
      const convertedValue = convertPaymentAmount(
        p.contract_value,
        p.currency || DEFAULT_CURRENCY,
        userCurrency
      );
      return sum + convertedValue;
    }, 0);

    const totalBalance = totalContractValue - totalReceived;

    return {
      totalContractValue,
      totalReceived,
      totalPending,
      totalBalance,
      overduePayments: payments.filter(p =>
        p.status === 'pending' && p.due_date && new Date(p.due_date) < new Date()
      ).length,
      userCurrency,
    };
  }, [projects, payments, user]);

  // Payment status distribution (memoized)
  const paymentStatusData = useMemo(() => ({
    paid: payments.filter(p => p.status === 'paid').length,
    pending: payments.filter(p => p.status === 'pending').length,
    partial: payments.filter(p => p.status === 'partial').length,
    overdue: payments.filter(p => p.status === 'overdue').length,
  }), [payments]);

  // Monthly payment data for chart (memoized)
  const monthlyData = useMemo(() => {
    const userCurrency = user?.default_currency || DEFAULT_CURRENCY;
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
        const convertedAmount = convertPaymentAmount(payment.amount, payment.currency, userCurrency);
        if (payment.status === 'paid') {
          months[key].received += convertedAmount;
        } else {
          months[key].pending += convertedAmount;
        }
      }
    });

    return Object.entries(months).map(([month, data]) => ({
      month,
      ...data,
    }));
  }, [payments, user]);

  const maxMonthlyValue = useMemo(() => Math.max(...monthlyData.map(d => d.received + d.pending), 1), [monthlyData]);

  // Filter projects (memoized - only recalculate when search/filter/projects change)
  const filteredProjects = useMemo(() => projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'fully_paid' && project.payment_percentage >= 100) ||
      (statusFilter === 'partial' && project.payment_percentage > 0 && project.payment_percentage < 100) ||
      (statusFilter === 'unpaid' && project.payment_percentage === 0);
    return matchesSearch && matchesStatus;
  }), [projects, searchTerm, statusFilter]);

  const toggleProjectExpand = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const handleAddPayment = async (formData: ClientPaymentFormData) => {
    try {
      const invoiceNumber = formData.invoice_number || generateInvoiceNumber(payments);

      await savePayment({
        project_id: formData.project_id,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        payment_date: formData.payment_date,
        due_date: formData.due_date || undefined,
        status: formData.status,
        payment_method: formData.payment_method,
        reference_number: formData.reference_number || undefined,
        invoice_number: invoiceNumber,
        description: formData.description || undefined,
      });

      setShowAddModal(false);
      setPreselectedProjectId('');
      fetchData();
    } catch (error) {
      console.error('Error adding payment:', error);
      alert('Failed to add payment');
    }
  };

  const handleEditClick = (payment: Payment) => {
    setEditingPayment(payment);
    setShowEditModal(true);
  };

  const handleUpdatePayment = async (formData: ClientPaymentFormData) => {
    if (!editingPayment) return;

    try {
      await savePayment({
        id: editingPayment.id,
        project_id: formData.project_id,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        payment_date: formData.payment_date,
        due_date: formData.due_date || undefined,
        status: formData.status,
        payment_method: formData.payment_method,
        reference_number: formData.reference_number || undefined,
        invoice_number: formData.invoice_number,
        description: formData.description || undefined,
        created_at: editingPayment.created_at,
      });

      setShowEditModal(false);
      setEditingPayment(null);
      fetchData();
    } catch (error) {
      console.error('Error updating payment:', error);
      alert('Failed to update payment');
    }
  };

  const handleDeleteClick = (payment: Payment) => {
    setPaymentToDelete(payment);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!paymentToDelete) return;
    try {
      await deletePayment(paymentToDelete.id);
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

  const openInvoicePreview = (payment: Payment, project: ProjectWithPayments) => {
    setSelectedPayment(payment);
    setSelectedProjectForInvoice(project);
    setShowInvoiceModal(true);
  };

  const handlePrintInvoice = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !selectedPayment || !selectedProjectForInvoice) return;

    const project = selectedProjectForInvoice;
    const payment = selectedPayment;
    const projectCurrency = (project.currency as SupportedCurrency) || 'AED';
    const currencyInfo = getCurrencyInfo(projectCurrency);
    const isNonAED = projectCurrency !== 'AED';

    const paymentPercentage = project.contract_value > 0
      ? ((payment.amount / project.contract_value) * 100).toFixed(0)
      : '100';

    // Calculate AED equivalent for non-AED currencies
    const exchangeRate = project.exchange_rate || 1;
    const paymentAmountAed = isNonAED ? payment.amount * exchangeRate : payment.amount;
    const contractValueAed = project.contract_value_aed || project.contract_value;

    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${payment.invoice_number}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

          * { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
            color: #1a1a2e;
            line-height: 1.6;
            background: #fff;
            -webkit-font-smoothing: antialiased;
          }

          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 0;
            background: #fff;
          }

          /* Modern Header with Gradient */
          .header {
            background: linear-gradient(135deg, #0a5082 0%, #063a5e 100%);
            color: white;
            padding: 40px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            position: relative;
            overflow: hidden;
          }

          .header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -20%;
            width: 60%;
            height: 200%;
            background: rgba(255, 255, 255, 0.03);
            transform: rotate(15deg);
          }

          .header-left {
            position: relative;
            z-index: 1;
          }

          .invoice-title {
            font-size: 32px;
            font-weight: 700;
            letter-spacing: 3px;
            margin-bottom: 8px;
          }

          .invoice-number {
            font-size: 14px;
            opacity: 0.9;
            font-weight: 400;
          }

          .header-right {
            text-align: right;
            position: relative;
            z-index: 1;
          }

          .logo-container {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 16px;
            margin-bottom: 12px;
          }

          .logo-container img {
            height: 60px;
            width: auto;
            border-radius: 8px;
          }

          .company-name {
            font-size: 16px;
            font-weight: 600;
            line-height: 1.4;
          }

          /* Info Cards Section */
          .info-section {
            padding: 40px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
          }

          .info-card {
            background: #f8fafc;
            border-radius: 12px;
            padding: 24px;
            border: 1px solid #e2e8f0;
          }

          .info-card-title {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #0a5082;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid #0a5082;
          }

          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 13px;
          }

          .info-row:last-child {
            margin-bottom: 0;
          }

          .info-label {
            color: #64748b;
            font-weight: 500;
          }

          .info-value {
            color: #1a1a2e;
            font-weight: 600;
            text-align: right;
          }

          /* Bill To/From Section */
          .bill-section {
            padding: 0 40px 30px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
          }

          .bill-card {
            padding: 20px;
            border-radius: 12px;
          }

          .bill-from {
            background: linear-gradient(135deg, #0a5082 0%, #1a6da8 100%);
            color: white;
          }

          .bill-to {
            background: #f1f5f9;
            border: 2px solid #e2e8f0;
          }

          .bill-title {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
            opacity: 0.8;
          }

          .bill-to .bill-title {
            color: #0a5082;
          }

          .bill-name {
            font-size: 16px;
            font-weight: 600;
          }

          .bill-to .bill-name {
            color: #1a1a2e;
          }

          /* Payment Table */
          .table-section {
            padding: 0 40px 40px;
          }

          .table-title {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #0a5082;
            margin-bottom: 16px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }

          th {
            background: linear-gradient(135deg, #0a5082 0%, #063a5e 100%);
            color: white;
            padding: 16px 20px;
            text-align: left;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          th:last-child {
            text-align: right;
          }

          td {
            padding: 20px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 14px;
            color: #1a1a2e;
          }

          td:last-child {
            text-align: right;
            font-weight: 600;
          }

          .amount-cell {
            font-family: 'SF Mono', 'Roboto Mono', monospace;
          }

          .sub-amount {
            display: block;
            font-size: 11px;
            color: #64748b;
            font-weight: 400;
            margin-top: 4px;
          }

          /* Total Row */
          .total-row {
            background: linear-gradient(135deg, #0a5082 0%, #063a5e 100%);
          }

          .total-row td {
            color: white;
            border: none;
            font-size: 16px;
            font-weight: 700;
          }

          .total-row td:first-child {
            text-transform: uppercase;
            letter-spacing: 1px;
            font-size: 12px;
          }

          /* Currency Badge */
          .currency-badge {
            display: inline-block;
            background: rgba(10, 80, 130, 0.1);
            color: #0a5082;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            margin-left: 8px;
          }

          /* Exchange Rate Note */
          .exchange-note {
            background: #fef3c7;
            border: 1px solid #fcd34d;
            border-radius: 8px;
            padding: 12px 16px;
            margin-top: 20px;
            font-size: 12px;
            color: #92400e;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .exchange-note-icon {
            width: 16px;
            height: 16px;
          }

          /* Footer */
          .footer {
            background: #f8fafc;
            padding: 30px 40px;
            border-top: 3px solid #0a5082;
          }

          .footer-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }

          .footer-left {
            flex: 1;
          }

          .footer-title {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #0a5082;
            margin-bottom: 12px;
          }

          .footer-company {
            font-weight: 600;
            color: #1a1a2e;
            margin-bottom: 8px;
          }

          .footer-contact {
            font-size: 13px;
            color: #64748b;
            line-height: 1.8;
          }

          .footer-right {
            text-align: right;
          }

          .thank-you {
            font-size: 24px;
            font-weight: 300;
            color: #0a5082;
            margin-bottom: 8px;
          }

          .payment-terms {
            font-size: 12px;
            color: #64748b;
          }

          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            .invoice-container {
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <!-- Header -->
          <div class="header">
            <div class="header-left">
              <div class="invoice-title">INVOICE</div>
              <div class="invoice-number">${payment.invoice_number}</div>
            </div>
            <div class="header-right">
              <div class="logo-container">
                ${logoUrl ? `<img src="${logoUrl}" alt="Company Logo" />` : ''}
              </div>
              <div class="company-name">${companyName || 'QS Global Solutions'}</div>
            </div>
          </div>

          <!-- Info Section -->
          <div class="info-section">
            <div class="info-card">
              <div class="info-card-title">Invoice Details</div>
              <div class="info-row">
                <span class="info-label">Invoice Date</span>
                <span class="info-value">${new Date(payment.payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              ${payment.due_date ? `
              <div class="info-row">
                <span class="info-label">Due Date</span>
                <span class="info-value">${new Date(payment.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              ` : ''}
              <div class="info-row">
                <span class="info-label">Currency</span>
                <span class="info-value">${currencyInfo?.flag || ''} ${projectCurrency}</span>
              </div>
            </div>

            <div class="info-card">
              <div class="info-card-title">Project Information</div>
              <div class="info-row">
                <span class="info-label">Project Name</span>
                <span class="info-value">${project.name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Client</span>
                <span class="info-value">${project.client_name || 'N/A'}</span>
              </div>
              ${project.description ? `
              <div class="info-row">
                <span class="info-label">Location</span>
                <span class="info-value">${project.description}</span>
              </div>
              ` : ''}
            </div>
          </div>

          <!-- Bill From / To -->
          <div class="bill-section">
            <div class="bill-card bill-from">
              <div class="bill-title">From</div>
              <div class="bill-name">${companyName || 'QS Global Solutions Pvt Ltd'}</div>
            </div>
            <div class="bill-card bill-to">
              <div class="bill-title">Bill To</div>
              <div class="bill-name">${project.client_name || 'Client Name'}</div>
            </div>
          </div>

          <!-- Payment Table -->
          <div class="table-section">
            <div class="table-title">Payment Summary</div>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Contract Value</th>
                  <th>Percentage</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    Professional Services
                    <span class="currency-badge">${projectCurrency}</span>
                  </td>
                  <td class="amount-cell">
                    ${formatCurrencyWithCode(project.contract_value, projectCurrency)}
                    ${isNonAED ? `<span class="sub-amount">≈ ${formatCurrencyWithCode(contractValueAed, 'AED')}</span>` : ''}
                  </td>
                  <td>${paymentPercentage}%</td>
                  <td class="amount-cell">
                    ${formatCurrencyWithCode(payment.amount, projectCurrency)}
                    ${isNonAED ? `<span class="sub-amount">≈ ${formatCurrencyWithCode(paymentAmountAed, 'AED')}</span>` : ''}
                  </td>
                </tr>
                <tr class="total-row">
                  <td colspan="3">Total Amount Due</td>
                  <td class="amount-cell">
                    ${formatCurrencyWithCode(payment.amount, projectCurrency)}
                  </td>
                </tr>
              </tbody>
            </table>

            ${isNonAED ? `
            <div class="exchange-note">
              <svg class="exchange-note-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4M12 8h.01"/>
              </svg>
              <span>Exchange Rate Applied: 1 ${projectCurrency} = ${exchangeRate.toFixed(4)} AED (as of ${project.exchange_rate_date || new Date().toISOString().split('T')[0]})</span>
            </div>
            ` : ''}
          </div>

          <!-- Footer -->
          <div class="footer">
            <div class="footer-content">
              <div class="footer-left">
                <div class="footer-title">Contact Information</div>
                <div class="footer-company">${companyName || 'QS Global Solutions Pvt Ltd'}</div>
                <div class="footer-contact">
                  ${companyEmail ? `Email: ${companyEmail}` : 'Email: info@qs-global-solutions.com'}<br/>
                  ${companyPhone ? `Tel: ${companyPhone}` : 'Tel: +971 54 554 7086 / +965 9986 9738 / +94 714927395'}
                  ${companyAddress ? `<br/>Address: ${companyAddress}` : ''}
                </div>
              </div>
              <div class="footer-right">
                <div class="thank-you">Thank You</div>
                <div class="payment-terms">Payment terms: Due upon receipt</div>
              </div>
            </div>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
  };

  // Memoized project options for forms (stable reference)
  const projectOptions = useMemo(() => [
    { value: '', label: 'Select a project' },
    ...projects.map(p => ({ value: p.id, label: `${p.name}${p.client_name ? ` - ${p.client_name}` : ''}` })),
  ], [projects]);

  // Get next invoice number (memoized)
  const nextInvoiceNumber = useMemo(() => generateInvoiceNumber(payments), [payments]);

  // Get initial data for edit form (memoized)
  const editFormInitialData = useMemo(() => {
    if (!editingPayment) return undefined;
    return {
      project_id: editingPayment.project_id,
      amount: editingPayment.amount.toString(),
      currency: editingPayment.currency || 'AED',
      payment_date: editingPayment.payment_date,
      due_date: editingPayment.due_date || '',
      status: editingPayment.status,
      payment_method: editingPayment.payment_method || 'bank_transfer',
      reference_number: editingPayment.reference_number || '',
      invoice_number: editingPayment.invoice_number,
      description: editingPayment.description || '',
    };
  }, [editingPayment]);

  // Get initial data for add form (memoized)
  const addFormInitialData = useMemo(() => {
    if (!preselectedProjectId) return undefined;
    return { project_id: preselectedProjectId };
  }, [preselectedProjectId]);

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
            title={`Total Contract Value (${metrics.userCurrency})`}
            value={formatCurrencyWithCode(metrics.totalContractValue, metrics.userCurrency)}
            icon={<FileText className="h-5 w-5" />}
            description={`${projects.length} projects`}
          />
          <StatCard
            title={`Total Received (${metrics.userCurrency})`}
            value={formatCurrencyWithCode(metrics.totalReceived, metrics.userCurrency)}
            icon={<CheckCircle2 className="h-5 w-5" />}
            trend={{ value: metrics.totalContractValue > 0 ? Math.round((metrics.totalReceived / metrics.totalContractValue) * 100) : 0, label: 'collected' }}
          />
          <StatCard
            title={`Pending Payments (${metrics.userCurrency})`}
            value={formatCurrencyWithCode(metrics.totalPending, metrics.userCurrency)}
            icon={<Clock className="h-5 w-5" />}
            description={`${paymentStatusData.pending} invoices`}
          />
          <StatCard
            title={`Balance Due (${metrics.userCurrency})`}
            value={formatCurrencyWithCode(metrics.totalBalance, metrics.userCurrency)}
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
                <div className="relative w-40 h-40">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
                    {paymentStatusData.paid > 0 && (
                      <circle
                        cx="18" cy="18" r="15.915" fill="none"
                        stroke="#22c55e" strokeWidth="3"
                        strokeDasharray={`${(paymentStatusData.paid / Math.max(payments.length, 1)) * 100} 100`}
                        strokeLinecap="round"
                      />
                    )}
                    {paymentStatusData.pending > 0 && (
                      <circle
                        cx="18" cy="18" r="15.915" fill="none"
                        stroke="#eab308" strokeWidth="3"
                        strokeDasharray={`${(paymentStatusData.pending / Math.max(payments.length, 1)) * 100} 100`}
                        strokeDashoffset={`-${(paymentStatusData.paid / Math.max(payments.length, 1)) * 100}`}
                        strokeLinecap="round"
                      />
                    )}
                    {paymentStatusData.partial > 0 && (
                      <circle
                        cx="18" cy="18" r="15.915" fill="none"
                        stroke="#3b82f6" strokeWidth="3"
                        strokeDasharray={`${(paymentStatusData.partial / Math.max(payments.length, 1)) * 100} 100`}
                        strokeDashoffset={`-${((paymentStatusData.paid + paymentStatusData.pending) / Math.max(payments.length, 1)) * 100}`}
                        strokeLinecap="round"
                      />
                    )}
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
                      <div
                        className="w-full bg-yellow-500/30 rounded-t transition-all duration-300"
                        style={{ height: `${(data.pending / maxMonthlyValue) * 100}%` }}
                      />
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
                  <div
                    className="p-4 sm:p-6 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleProjectExpand(project.id)}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
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

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Contract Value</p>
                          <p className="text-lg font-bold text-foreground">{formatCurrencyWithCode(project.contract_value, (project.currency as SupportedCurrency) || 'AED')}</p>
                          {project.currency && project.currency !== 'AED' && project.contract_value_aed && (
                            <p className="text-xs text-muted-foreground">≈ {formatCurrencyWithCode(project.contract_value_aed, 'AED')}</p>
                          )}
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

                  {isExpanded && (
                    <div className="border-t border-border">
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
                                    <span className="font-mono text-sm">{payment.invoice_number || '-'}</span>
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
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-primary"
                                        onClick={() => handleEditClick(payment)}
                                        title="Edit Payment"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-primary"
                                        onClick={() => openInvoicePreview(payment, project)}
                                        title="Generate Invoice"
                                      >
                                        <Printer className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-500"
                                        onClick={() => handleDeleteClick(payment)}
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
                            setPreselectedProjectId(project.id);
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
        onClose={() => {
          setShowAddModal(false);
          setPreselectedProjectId('');
        }}
        title="Record Payment"
        description="Add a new payment record for a project"
        size="lg"
      >
        <ClientPaymentForm
          initialData={addFormInitialData}
          projects={projectOptions}
          isEdit={false}
          nextInvoiceNumber={nextInvoiceNumber}
          onSubmit={handleAddPayment}
          onCancel={() => {
            setShowAddModal(false);
            setPreselectedProjectId('');
          }}
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
        <ClientPaymentForm
          initialData={editFormInitialData}
          projects={projectOptions}
          isEdit={true}
          nextInvoiceNumber={nextInvoiceNumber}
          onSubmit={handleUpdatePayment}
          onCancel={() => {
            setShowEditModal(false);
            setEditingPayment(null);
          }}
        />
      </Modal>

      {/* Invoice Preview Modal */}
      <Modal
        isOpen={showInvoiceModal}
        onClose={() => {
          setShowInvoiceModal(false);
          setSelectedPayment(null);
          setSelectedProjectForInvoice(null);
        }}
        title="Invoice Preview"
        description="Preview and print the invoice"
        size="lg"
      >
        {selectedPayment && selectedProjectForInvoice && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice Number:</span>
                <span className="font-mono font-medium">{selectedPayment.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Project:</span>
                <span className="font-medium">{selectedProjectForInvoice.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client:</span>
                <span className="font-medium">{selectedProjectForInvoice.client_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Currency:</span>
                <span className="font-medium">{getCurrencyInfo((selectedProjectForInvoice.currency as SupportedCurrency) || 'AED')?.flag} {selectedProjectForInvoice.currency || 'AED'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <div className="text-right">
                  <span className="font-medium text-primary">{formatCurrencyWithCode(selectedPayment.amount, (selectedProjectForInvoice.currency as SupportedCurrency) || 'AED')}</span>
                  {selectedProjectForInvoice.currency && selectedProjectForInvoice.currency !== 'AED' && (
                    <span className="block text-xs text-muted-foreground">
                      ≈ {formatCurrencyWithCode(selectedPayment.amount * (selectedProjectForInvoice.exchange_rate || 1), 'AED')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">{formatDate(selectedPayment.payment_date)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowInvoiceModal(false);
                  setSelectedPayment(null);
                  setSelectedProjectForInvoice(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handlePrintInvoice}>
                <Printer className="h-4 w-4 mr-2" />
                Print / Save as PDF
              </Button>
            </div>
          </div>
        )}
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
