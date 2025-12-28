'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import {
  exportTimesheetToCSV,
  exportProjectsToCSV,
  exportPaymentsToCSV,
  exportUserPaymentsToCSV,
  exportFinanceReportToCSV,
  downloadCSV,
  generateExportFilename,
} from '@/lib/export';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import type { ExportType } from '@/types/database';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const [exportType, setExportType] = useState<ExportType>('timesheet');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  const handleExport = async () => {
    setIsExporting(true);
    setError('');

    try {
      let csvContent = '';
      const filename = generateExportFilename(exportType, 'csv');

      switch (exportType) {
        case 'timesheet': {
          const { data: timeEntries } = await supabase
            .from('time_entries')
            .select('*, users(full_name), projects(name)')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: false });

          csvContent = exportTimesheetToCSV(timeEntries || [], { start: startDate, end: endDate });
          break;
        }

        case 'projects': {
          const { data: projects } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

          csvContent = exportProjectsToCSV(projects || []);
          break;
        }

        case 'payments': {
          const { data: payments } = await supabase
            .from('payments')
            .select('*')
            .gte('payment_date', startDate)
            .lte('payment_date', endDate)
            .order('payment_date', { ascending: false });

          const { data: projects } = await supabase
            .from('projects')
            .select('id, name');

          // Handle potential localStorage fallback
          let allPayments = payments || [];
          if (!payments || payments.length === 0) {
            try {
              const cached = localStorage.getItem('project_payments');
              if (cached) {
                allPayments = JSON.parse(cached);
              }
            } catch {
              // Ignore
            }
          }

          csvContent = exportPaymentsToCSV(allPayments, projects || []);
          break;
        }

        case 'finance': {
          const { data: projects } = await supabase
            .from('projects')
            .select('*')
            .order('name');

          const { data: timeEntries } = await supabase
            .from('time_entries')
            .select('hours, user_id, project_id');

          const { data: additionalCosts } = await supabase
            .from('additional_costs')
            .select('amount, project_id');

          const { data: users } = await supabase
            .from('users')
            .select('id, hourly_rate, hourly_rate_currency');

          csvContent = exportFinanceReportToCSV(
            projects || [],
            timeEntries || [],
            additionalCosts || [],
            users || []
          );
          break;
        }

        default:
          throw new Error('Invalid export type');
      }

      if (csvContent === 'No data to export') {
        setError('No data found for the selected criteria');
        return;
      }

      downloadCSV(csvContent, filename);
      onClose();
    } catch (err) {
      setError('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportTypeOptions = [
    { value: 'timesheet', label: 'Timesheet Report' },
    { value: 'projects', label: 'Projects Report' },
    { value: 'payments', label: 'Client Payments Report' },
    { value: 'finance', label: 'Financial Report' },
  ];

  const showDateRange = exportType === 'timesheet' || exportType === 'payments';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Reports"
      description="Download your data as a CSV file"
    >
      <div className="space-y-6">
        {/* Export Type Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Report Type
          </label>
          <Select
            value={exportType}
            onChange={(e) => setExportType(e.target.value as ExportType)}
            options={exportTypeOptions}
          />
        </div>

        {/* Date Range (for timesheet and payments) */}
        {showDateRange && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Report Preview */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-green-600" />
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {exportTypeOptions.find(o => o.value === exportType)?.label}
              </p>
              <p className="text-sm text-gray-500">
                {showDateRange
                  ? `From ${startDate} to ${endDate}`
                  : 'All data will be exported'}
              </p>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
