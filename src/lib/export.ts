import { formatCurrency, formatDate } from '@/lib/utils';
import type {
  TimeEntry,
  Project,
  User,
  Payment,
  UserPayment,
  ExportType,
  ExportFormat,
  SupportedCurrency,
} from '@/types/database';
import { convertToAED, DEFAULT_EXCHANGE_RATES } from '@/lib/currency';

interface ExportData {
  timeEntries?: (TimeEntry & { users?: { full_name: string }; projects?: { name: string } })[];
  projects?: Project[];
  users?: User[];
  payments?: Payment[];
  userPayments?: UserPayment[];
}

// CSV generation utilities
function escapeCSVValue(value: string | number | undefined | null): string {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function arrayToCSV(headers: string[], rows: (string | number | undefined | null)[][]): string {
  const headerLine = headers.map(escapeCSVValue).join(',');
  const dataLines = rows.map(row => row.map(escapeCSVValue).join(','));
  return [headerLine, ...dataLines].join('\n');
}

// Export functions for each type
export function exportTimesheetToCSV(
  timeEntries: ExportData['timeEntries'],
  dateRange?: { start: string; end: string }
): string {
  if (!timeEntries || timeEntries.length === 0) {
    return 'No data to export';
  }

  // Filter by date range if provided
  let filteredEntries = timeEntries;
  if (dateRange) {
    filteredEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= new Date(dateRange.start) && entryDate <= new Date(dateRange.end);
    });
  }

  const headers = ['Date', 'Team Member', 'Project', 'Hours', 'Description', 'Created At'];
  const rows = filteredEntries.map(entry => [
    formatDate(entry.date),
    entry.users?.full_name || 'Unknown',
    entry.projects?.name || 'Unknown',
    entry.hours,
    entry.description || '',
    formatDate(entry.created_at),
  ]);

  // Add summary row
  const totalHours = filteredEntries.reduce((sum, e) => sum + e.hours, 0);
  rows.push(['', '', 'TOTAL', totalHours, '', '']);

  return arrayToCSV(headers, rows);
}

export function exportProjectsToCSV(projects: Project[]): string {
  if (!projects || projects.length === 0) {
    return 'No data to export';
  }

  const headers = [
    'Project Name',
    'Client',
    'Status',
    'Start Date',
    'End Date',
    'Contract Value',
    'Currency',
    'Location',
  ];

  const rows = projects.map(project => [
    project.name,
    project.client_name || '',
    project.status.replace('_', ' '),
    formatDate(project.start_date),
    formatDate(project.end_date),
    project.contract_value,
    project.currency,
    project.location || '',
  ]);

  // Add summary
  const totalValue = projects.reduce((sum, p) => sum + (p.contract_value || 0), 0);
  rows.push(['', '', '', '', 'TOTAL', totalValue, '', '']);

  return arrayToCSV(headers, rows);
}

export function exportPaymentsToCSV(
  payments: Payment[],
  projects: { id: string; name: string }[]
): string {
  if (!payments || payments.length === 0) {
    return 'No data to export';
  }

  const projectMap = new Map(projects.map(p => [p.id, p.name]));

  const headers = [
    'Date',
    'Project',
    'Amount',
    'Currency',
    'Status',
    'Payment Method',
    'Reference',
    'Invoice Number',
    'Description',
  ];

  const rows = payments.map(payment => [
    formatDate(payment.payment_date),
    projectMap.get(payment.project_id) || 'Unknown',
    payment.amount,
    payment.currency,
    payment.status,
    payment.payment_method?.replace('_', ' ') || '',
    payment.reference_number || '',
    payment.invoice_number || '',
    payment.description || '',
  ]);

  const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  rows.push(['', 'TOTAL', totalAmount, '', '', '', '', '', '']);

  return arrayToCSV(headers, rows);
}

export function exportUserPaymentsToCSV(
  userPayments: UserPayment[],
  users: User[]
): string {
  if (!userPayments || userPayments.length === 0) {
    return 'No data to export';
  }

  const userMap = new Map(users.map(u => [u.id, u.full_name]));

  const headers = [
    'Date',
    'Team Member',
    'Amount',
    'Amount (AED)',
    'Currency',
    'Type',
    'Status',
    'Payment Method',
    'Reference',
    'Description',
  ];

  const rows = userPayments.map(payment => [
    formatDate(payment.payment_date),
    userMap.get(payment.user_id) || 'Unknown',
    payment.amount,
    payment.amount_aed || payment.amount,
    payment.currency,
    payment.payment_type,
    payment.status,
    payment.payment_method?.replace('_', ' ') || '',
    payment.reference_number || '',
    payment.description || '',
  ]);

  const totalAed = userPayments.reduce((sum, p) => sum + (p.amount_aed || p.amount || 0), 0);
  rows.push(['', 'TOTAL', '', totalAed, 'AED', '', '', '', '', '']);

  return arrayToCSV(headers, rows);
}

export function exportFinanceReportToCSV(
  projects: Project[],
  timeEntries: { hours: number; user_id: string; project_id: string }[],
  additionalCosts: { amount: number; project_id: string }[],
  users: { id: string; hourly_rate?: number | null; hourly_rate_currency?: string | null }[]
): string {
  if (!projects || projects.length === 0) {
    return 'No data to export';
  }

  // Calculate user rates in AED
  const userRatesAed = new Map(users.map(u => {
    const hourlyRate = u.hourly_rate || 0;
    const rateCurrency = (u.hourly_rate_currency as SupportedCurrency) || 'AED';
    const rateInAed = rateCurrency === 'AED'
      ? hourlyRate
      : convertToAED(hourlyRate, rateCurrency, DEFAULT_EXCHANGE_RATES[rateCurrency]);
    return [u.id, rateInAed];
  }));

  const headers = [
    'Project Name',
    'Client',
    'Status',
    'Contract Value (AED)',
    'Labor Cost (AED)',
    'Additional Costs (AED)',
    'Total Cost (AED)',
    'Profit (AED)',
    'Profit Margin (%)',
  ];

  const rows = projects.map(project => {
    const projectTimeEntries = timeEntries.filter(te => te.project_id === project.id);
    const laborCost = projectTimeEntries.reduce((sum, te) => {
      const rate = userRatesAed.get(te.user_id) || 0;
      return sum + (te.hours * rate);
    }, 0);

    const projectAdditionalCosts = additionalCosts
      .filter(c => c.project_id === project.id)
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    const totalCost = laborCost + projectAdditionalCosts;
    const contractValueAed = project.contract_value_aed || project.contract_value || 0;
    const profit = contractValueAed - totalCost;
    const profitMargin = contractValueAed > 0 ? ((profit / contractValueAed) * 100).toFixed(1) : '0';

    return [
      project.name,
      project.client_name || '',
      project.status.replace('_', ' '),
      Math.round(contractValueAed),
      Math.round(laborCost),
      Math.round(projectAdditionalCosts),
      Math.round(totalCost),
      Math.round(profit),
      profitMargin,
    ];
  });

  // Calculate totals
  const totals = rows.reduce(
    (acc, row) => ({
      contractValue: acc.contractValue + (Number(row[3]) || 0),
      laborCost: acc.laborCost + (Number(row[4]) || 0),
      additionalCost: acc.additionalCost + (Number(row[5]) || 0),
      totalCost: acc.totalCost + (Number(row[6]) || 0),
      profit: acc.profit + (Number(row[7]) || 0),
    }),
    { contractValue: 0, laborCost: 0, additionalCost: 0, totalCost: 0, profit: 0 }
  );

  const overallMargin = totals.contractValue > 0
    ? ((totals.profit / totals.contractValue) * 100).toFixed(1)
    : '0';

  rows.push([
    'TOTAL',
    '',
    '',
    totals.contractValue,
    totals.laborCost,
    totals.additionalCost,
    totals.totalCost,
    totals.profit,
    overallMargin,
  ]);

  return arrayToCSV(headers, rows);
}

// Download utility
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// Generate filename with date
export function generateExportFilename(type: ExportType, format: ExportFormat): string {
  const date = new Date().toISOString().split('T')[0];
  return `${type}_export_${date}`;
}
