'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FinanceChart } from '@/components/charts/finance-chart';
import { PieChartComponent } from '@/components/charts/pie-chart';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { formatCurrency, formatDate, getProgressPercentage } from '@/lib/utils';
import { useCompanySettings } from '@/hooks/use-company-settings';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FolderKanban,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import type { User, Project } from '@/types/database';

interface ProjectFinance {
  id: string;
  name: string;
  contract_value: number;
  labor_cost: number;
  additional_cost: number;
  total_cost: number;
  profit: number;
  profit_margin: number;
  status: string;
}

interface FinanceData {
  totalContractValue: number;
  totalLaborCost: number;
  totalAdditionalCost: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  projectFinances: ProjectFinance[];
  userCosts: { name: string; cost: number }[];
}

export default function FinancePage() {
  const [user, setUser] = useState<User | null>(null);
  const [financeData, setFinanceData] = useState<FinanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

        // Fetch all projects
        const { data: projects } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });

        // Fetch all time entries with user info
        const { data: timeEntries } = await supabase
          .from('time_entries')
          .select('*, users(id, full_name, hourly_rate)');

        // Fetch all additional costs
        const { data: additionalCosts } = await supabase
          .from('additional_costs')
          .select('*');

        // Calculate project finances
        const projectFinances: ProjectFinance[] = (projects || []).map((project) => {
          // Labor cost for this project
          const projectTimeEntries = (timeEntries || []).filter(te => te.project_id === project.id);
          const laborCost = projectTimeEntries.reduce((sum, te) => {
            return sum + (te.hours * (te.users?.hourly_rate || 0));
          }, 0);

          // Additional costs for this project
          const projectAdditionalCosts = (additionalCosts || []).filter(c => c.project_id === project.id);
          const additionalCostTotal = projectAdditionalCosts.reduce((sum, c) => sum + c.amount, 0);

          const totalCost = laborCost + additionalCostTotal;
          const profit = project.contract_value - totalCost;
          const profitMargin = project.contract_value > 0 ? (profit / project.contract_value) * 100 : 0;

          return {
            id: project.id,
            name: project.name,
            contract_value: project.contract_value,
            labor_cost: laborCost,
            additional_cost: additionalCostTotal,
            total_cost: totalCost,
            profit,
            profit_margin: profitMargin,
            status: project.status,
          };
        });

        // Calculate totals
        const totalContractValue = projectFinances.reduce((sum, p) => sum + p.contract_value, 0);
        const totalLaborCost = projectFinances.reduce((sum, p) => sum + p.labor_cost, 0);
        const totalAdditionalCost = projectFinances.reduce((sum, p) => sum + p.additional_cost, 0);
        const totalCost = totalLaborCost + totalAdditionalCost;
        const totalProfit = totalContractValue - totalCost;
        const profitMargin = totalContractValue > 0 ? (totalProfit / totalContractValue) * 100 : 0;

        // Calculate user costs
        const userCostMap = new Map<string, { name: string; cost: number }>();
        (timeEntries || []).forEach((te: { hours: number; users?: { id: string; full_name: string; hourly_rate: number } }) => {
          if (te.users) {
            const existing = userCostMap.get(te.users.id);
            const cost = te.hours * te.users.hourly_rate;
            if (existing) {
              existing.cost += cost;
            } else {
              userCostMap.set(te.users.id, { name: te.users.full_name, cost });
            }
          }
        });
        const userCosts = Array.from(userCostMap.values())
          .sort((a, b) => b.cost - a.cost)
          .slice(0, 6);

        setFinanceData({
          totalContractValue,
          totalLaborCost,
          totalAdditionalCost,
          totalCost,
          totalProfit,
          profitMargin,
          projectFinances,
          userCosts,
        });
      } catch (error) {
        console.error('Error fetching finance data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  if (isLoading) {
    return (
      <DashboardLayout user={user} title="Finance" logoUrl={logoUrl} companyName={companyName}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0a5082]" />
        </div>
      </DashboardLayout>
    );
  }

  // Chart data
  const financeChartData = financeData?.projectFinances.slice(0, 6).map(p => ({
    name: p.name.length > 12 ? p.name.slice(0, 12) + '...' : p.name,
    revenue: p.contract_value,
    cost: p.total_cost,
  })) || [];

  const costBreakdownData = [
    { name: 'Labor Cost', value: financeData?.totalLaborCost || 0 },
    { name: 'Additional Cost', value: financeData?.totalAdditionalCost || 0 },
  ];

  const userCostData = financeData?.userCosts.map(u => ({
    name: u.name,
    value: u.cost,
  })) || [];

  return (
    <DashboardLayout user={user} title="Finance" logoUrl={logoUrl} companyName={companyName}>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-black">Financial Overview</h2>
          <p className="text-gray-500 mt-1">
            Monitor financial performance across all projects
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Contract Value"
            value={formatCurrency(financeData?.totalContractValue || 0)}
            icon={<DollarSign className="h-5 w-5" />}
            description={`${financeData?.projectFinances.length || 0} projects`}
          />
          <StatCard
            title="Total Costs"
            value={formatCurrency(financeData?.totalCost || 0)}
            icon={<TrendingDown className="h-5 w-5" />}
            description={`Labor: ${formatCurrency(financeData?.totalLaborCost || 0)}`}
          />
          <StatCard
            title="Total Profit"
            value={formatCurrency(financeData?.totalProfit || 0)}
            icon={<TrendingUp className="h-5 w-5" />}
            trend={{
              value: parseFloat((financeData?.profitMargin || 0).toFixed(1)),
              label: 'margin',
            }}
          />
          <StatCard
            title="Profit Margin"
            value={`${(financeData?.profitMargin || 0).toFixed(1)}%`}
            icon={<TrendingUp className="h-5 w-5" />}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue vs Cost by Project</CardTitle>
            </CardHeader>
            <CardContent>
              <FinanceChart data={financeChartData} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <PieChartComponent data={costBreakdownData} />
            </CardContent>
          </Card>
        </div>

        {/* Cost by User */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#0a5082]" />
              Cost by Team Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {financeData?.userCosts.map((user, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#0a5082] text-white flex items-center justify-center font-medium">
                      {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <p className="font-medium">{user.name}</p>
                  </div>
                  <p className="font-semibold text-[#0a5082]">{formatCurrency(user.cost)}</p>
                </div>
              ))}
              {(!financeData?.userCosts || financeData.userCosts.length === 0) && (
                <p className="text-center text-gray-500 py-4 col-span-3">No cost data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Project Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-[#0a5082]" />
              Project Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Contract Value</TableHead>
                  <TableHead className="text-right">Labor Cost</TableHead>
                  <TableHead className="text-right">Additional Cost</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financeData?.projectFinances.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <Link
                        href={`/admin/projects/${project.id}`}
                        className="font-medium text-[#0a5082] hover:underline"
                      >
                        {project.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={project.status === 'in_progress' ? 'primary' : 'secondary'}>
                        {project.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(project.contract_value)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(project.labor_cost)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(project.additional_cost)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(project.total_cost)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className={`flex items-center justify-end gap-1 font-medium ${
                        project.profit >= 0 ? 'text-[#0a5082]' : 'text-red-500'
                      }`}>
                        {project.profit >= 0 ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" />
                        )}
                        {formatCurrency(Math.abs(project.profit))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Progress
                          value={Math.max(0, Math.min(100, project.profit_margin))}
                          size="sm"
                          className="w-16"
                          variant={project.profit_margin >= 0 ? 'default' : 'warning'}
                        />
                        <span className={`text-sm font-medium ${
                          project.profit_margin >= 0 ? 'text-[#0a5082]' : 'text-red-500'
                        }`}>
                          {project.profit_margin.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!financeData?.projectFinances || financeData.projectFinances.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                      No project data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
