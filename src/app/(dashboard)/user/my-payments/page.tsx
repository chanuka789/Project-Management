'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { useCompanySettings } from '@/hooks/use-company-settings';
import { formatDate } from '@/lib/utils';
import {
  formatCurrencyWithCode,
  getCurrencyInfo,
  DEFAULT_EXCHANGE_RATES,
  convertToAED,
  SUPPORTED_CURRENCIES,
} from '@/lib/currency';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  Wallet,
  Gift,
  ArrowUpRight,
  CircleDollarSign,
  CreditCard,
  Banknote,
  FileText,
  PieChart,
  BarChart3,
  Calendar,
} from 'lucide-react';
import type { User, Project, PaymentMethod, SupportedCurrency, UserPayment, UserPaymentType, UserPaymentStatus } from '@/types/database';

export default function MyPaymentsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [payments, setPayments] = useState<UserPayment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const { companyName, logoUrl } = useCompanySettings();

  // User's preferred currency
  const userCurrency = (user?.default_currency as SupportedCurrency) || 'AED';
  const currencyInfo = getCurrencyInfo(userCurrency);

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

        // Fetch projects for reference
        const { data: projectsData } = await supabase
          .from('projects')
          .select('*');
        setProjects(projectsData || []);

        // Try to fetch user payments from Supabase
        let userPayments: UserPayment[] = [];
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('user_payments')
          .select('*')
          .eq('user_id', authUser.id)
          .order('payment_date', { ascending: false });

        if (paymentsError) {
          // Table doesn't exist - use localStorage as fallback
          console.log('Using localStorage for user payments (Supabase table not available)');
          const savedPayments = localStorage.getItem('user_payments');
          const allPayments: UserPayment[] = savedPayments ? JSON.parse(savedPayments) : [];
          userPayments = allPayments.filter(p => p.user_id === authUser.id);
        } else {
          userPayments = paymentsData || [];
        }

        setPayments(userPayments);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Convert amount to user's preferred currency
  const convertToUserCurrency = (amountAed: number): number => {
    if (userCurrency === 'AED') return amountAed;
    const rate = DEFAULT_EXCHANGE_RATES[userCurrency];
    if (rate === 0) return amountAed;
    return amountAed / rate;
  };

  // Calculate metrics in user's currency
  const completedPayments = payments.filter(p => p.status === 'completed');
  const pendingPayments = payments.filter(p => p.status === 'pending');

  const totalReceivedAed = completedPayments.reduce((sum, p) => sum + (p.amount_aed || p.amount), 0);
  const totalPendingAed = pendingPayments.reduce((sum, p) => sum + (p.amount_aed || p.amount), 0);

  const totalReceived = convertToUserCurrency(totalReceivedAed);
  const totalPending = convertToUserCurrency(totalPendingAed);

  // Payment type distribution
  const paymentTypeData = {
    salary: completedPayments.filter(p => p.payment_type === 'salary').length,
    bonus: completedPayments.filter(p => p.payment_type === 'bonus').length,
    reimbursement: completedPayments.filter(p => p.payment_type === 'reimbursement').length,
    advance: completedPayments.filter(p => p.payment_type === 'advance').length,
    commission: completedPayments.filter(p => p.payment_type === 'commission').length,
    other: completedPayments.filter(p => p.payment_type === 'other').length,
  };

  // Amount by type in user's currency
  const amountByType = {
    salary: convertToUserCurrency(completedPayments.filter(p => p.payment_type === 'salary').reduce((sum, p) => sum + (p.amount_aed || p.amount), 0)),
    bonus: convertToUserCurrency(completedPayments.filter(p => p.payment_type === 'bonus').reduce((sum, p) => sum + (p.amount_aed || p.amount), 0)),
    reimbursement: convertToUserCurrency(completedPayments.filter(p => p.payment_type === 'reimbursement').reduce((sum, p) => sum + (p.amount_aed || p.amount), 0)),
    advance: convertToUserCurrency(completedPayments.filter(p => p.payment_type === 'advance').reduce((sum, p) => sum + (p.amount_aed || p.amount), 0)),
    commission: convertToUserCurrency(completedPayments.filter(p => p.payment_type === 'commission').reduce((sum, p) => sum + (p.amount_aed || p.amount), 0)),
    other: convertToUserCurrency(completedPayments.filter(p => p.payment_type === 'other').reduce((sum, p) => sum + (p.amount_aed || p.amount), 0)),
  };

  // Monthly payment data for chart (last 6 months)
  const getMonthlyData = () => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      months[key] = 0;
    }

    completedPayments.forEach(payment => {
      const date = new Date(payment.payment_date);
      const key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (months[key] !== undefined) {
        months[key] += convertToUserCurrency(payment.amount_aed || payment.amount);
      }
    });

    return Object.entries(months).map(([month, amount]) => ({ month, amount }));
  };

  const monthlyData = getMonthlyData();
  const maxMonthlyValue = Math.max(...monthlyData.map(d => d.amount), 1);

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
        return <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" />Received</Badge>;
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

  if (isLoading) {
    return (
      <DashboardLayout user={user} title="My Payments" logoUrl={logoUrl} companyName={companyName}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} title="My Payments" logoUrl={logoUrl} companyName={companyName}>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">My Payments</h2>
            <p className="text-muted-foreground mt-1">
              View your payment history and earnings
            </p>
          </div>
          <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg">
            <span className="text-sm text-muted-foreground">Your Currency:</span>
            <span className="font-semibold text-primary">{currencyInfo?.flag} {userCurrency}</span>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={`Total Received (${userCurrency})`}
            value={formatCurrencyWithCode(totalReceived, userCurrency)}
            icon={<DollarSign className="h-5 w-5" />}
            description={`${completedPayments.length} payments`}
          />
          <StatCard
            title="Pending Payments"
            value={formatCurrencyWithCode(totalPending, userCurrency)}
            icon={<Clock className="h-5 w-5" />}
            description={`${pendingPayments.length} awaiting`}
          />
          <StatCard
            title="This Month"
            value={formatCurrencyWithCode(monthlyData[monthlyData.length - 1]?.amount || 0, userCurrency)}
            icon={<Calendar className="h-5 w-5" />}
            description={monthlyData[monthlyData.length - 1]?.month || ''}
          />
          <StatCard
            title="Average Payment"
            value={formatCurrencyWithCode(completedPayments.length > 0 ? totalReceived / completedPayments.length : 0, userCurrency)}
            icon={<TrendingUp className="h-5 w-5" />}
            description="Per transaction"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Type Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                Earnings by Category ({userCurrency})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { type: 'Salary', amount: amountByType.salary, color: '#0a5082', count: paymentTypeData.salary },
                  { type: 'Bonus', amount: amountByType.bonus, color: '#22c55e', count: paymentTypeData.bonus },
                  { type: 'Commission', amount: amountByType.commission, color: '#3b82f6', count: paymentTypeData.commission },
                  { type: 'Reimbursement', amount: amountByType.reimbursement, color: '#64748b', count: paymentTypeData.reimbursement },
                  { type: 'Advance', amount: amountByType.advance, color: '#eab308', count: paymentTypeData.advance },
                  { type: 'Other', amount: amountByType.other, color: '#94a3b8', count: paymentTypeData.other },
                ].filter(item => item.amount > 0).map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm font-medium text-foreground">{item.type}</span>
                        <span className="text-xs text-muted-foreground">({item.count})</span>
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        {formatCurrencyWithCode(item.amount, userCurrency)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${totalReceived > 0 ? (item.amount / totalReceived) * 100 : 0}%`,
                          backgroundColor: item.color
                        }}
                      />
                    </div>
                  </div>
                ))}
                {totalReceived === 0 && (
                  <p className="text-center text-muted-foreground py-8">No payments received yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Monthly Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Monthly Earnings ({userCurrency})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56 flex items-end justify-between gap-2">
                {monthlyData.map((data, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-xs font-medium text-foreground">
                      {data.amount > 0 ? formatCurrencyWithCode(data.amount, userCurrency) : '-'}
                    </span>
                    <div className="w-full flex flex-col gap-0.5" style={{ height: '160px' }}>
                      <div
                        className="w-full bg-gradient-to-t from-primary to-primary-light rounded-t transition-all duration-500"
                        style={{ height: `${Math.max((data.amount / maxMonthlyValue) * 100, 4)}%`, marginTop: 'auto' }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{data.month}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Payments Alert */}
        {pendingPayments.length > 0 && (
          <Card className="border-warning bg-warning/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <Clock className="h-5 w-5" />
                Pending Payments ({pendingPayments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      {getPaymentTypeBadge(payment.payment_type)}
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {payment.payment_type.charAt(0).toUpperCase() + payment.payment_type.slice(1)} Payment
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Expected: {formatDate(payment.payment_date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        {formatCurrencyWithCode(convertToUserCurrency(payment.amount_aed || payment.amount), userCurrency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment History Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {payments.length === 0 ? (
              <EmptyState
                icon={<Wallet className="h-8 w-8" />}
                title="No payments yet"
                description="Your payment history will appear here once you receive payments"
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount ({userCurrency})</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => {
                      const amountInUserCurrency = convertToUserCurrency(payment.amount_aed || payment.amount);
                      const project = projects.find(p => p.id === payment.project_id);

                      return (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{formatDate(payment.payment_date)}</TableCell>
                          <TableCell>{getPaymentTypeBadge(payment.payment_type)}</TableCell>
                          <TableCell>{project?.name || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getPaymentMethodIcon(payment.payment_method)}
                              <span className="capitalize text-sm">
                                {payment.payment_method?.replace('_', ' ') || '-'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrencyWithCode(amountInUserCurrency, userCurrency)}
                          </TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}
