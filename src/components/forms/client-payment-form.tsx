'use client';

import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Receipt } from 'lucide-react';
import type { PaymentStatus, PaymentMethod, SupportedCurrency } from '@/types/database';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';

export interface ClientPaymentFormData {
  project_id: string;
  amount: string;
  currency: SupportedCurrency;
  payment_date: string;
  due_date: string;
  status: PaymentStatus;
  payment_method: PaymentMethod;
  reference_number: string;
  invoice_number: string;
  description: string;
}

interface ClientPaymentFormProps {
  initialData?: Partial<ClientPaymentFormData>;
  projects: { value: string; label: string }[];
  isEdit?: boolean;
  nextInvoiceNumber: string;
  onSubmit: (data: ClientPaymentFormData) => void;
  onCancel: () => void;
}

// This component manages its own form state to prevent parent re-renders on typing
const ClientPaymentFormComponent = ({
  initialData,
  projects,
  isEdit = false,
  nextInvoiceNumber,
  onSubmit,
  onCancel,
}: ClientPaymentFormProps) => {
  // Local form state - changes here don't affect parent component
  const [formState, setFormState] = useState<ClientPaymentFormData>({
    project_id: initialData?.project_id || '',
    amount: initialData?.amount || '',
    currency: initialData?.currency || 'AED',
    payment_date: initialData?.payment_date || new Date().toISOString().split('T')[0],
    due_date: initialData?.due_date || '',
    status: initialData?.status || 'pending',
    payment_method: initialData?.payment_method || 'bank_transfer',
    reference_number: initialData?.reference_number || '',
    invoice_number: initialData?.invoice_number || '',
    description: initialData?.description || '',
  });

  const handleChange = (field: keyof ClientPaymentFormData, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formState);
  };

  // Currency options for the selector
  const currencyOptions = SUPPORTED_CURRENCIES.map(curr => ({
    value: curr.code,
    label: `${curr.flag} ${curr.code} - ${curr.name}`,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Project"
        value={formState.project_id}
        onChange={(e) => handleChange('project_id', e.target.value)}
        options={projects}
        required
        disabled={isEdit}
      />

      <div className="grid grid-cols-3 gap-4">
        <Select
          label="Currency"
          value={formState.currency}
          onChange={(e) => handleChange('currency', e.target.value as SupportedCurrency)}
          options={currencyOptions}
        />
        <Input
          label={`Amount (${formState.currency})`}
          type="number"
          value={formState.amount}
          onChange={(e) => handleChange('amount', e.target.value)}
          min="0"
          step="0.01"
          required
          className="col-span-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Status"
          value={formState.status}
          onChange={(e) => handleChange('status', e.target.value as PaymentStatus)}
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
          value={formState.payment_date}
          onChange={(e) => handleChange('payment_date', e.target.value)}
          required
        />
        <Input
          label="Due Date (optional)"
          type="date"
          value={formState.due_date}
          onChange={(e) => handleChange('due_date', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Payment Method"
          value={formState.payment_method}
          onChange={(e) => handleChange('payment_method', e.target.value as PaymentMethod)}
          options={[
            { value: 'bank_transfer', label: 'Bank Transfer' },
            { value: 'cash', label: 'Cash' },
            { value: 'cheque', label: 'Cheque' },
            { value: 'credit_card', label: 'Credit Card' },
            { value: 'other', label: 'Other' },
          ]}
        />
        <Input
          label={isEdit ? "Invoice Number" : "Invoice Number (auto-generated if empty)"}
          value={formState.invoice_number}
          onChange={(e) => handleChange('invoice_number', e.target.value)}
          placeholder={isEdit ? '' : `Next: ${nextInvoiceNumber}`}
          disabled={isEdit}
        />
      </div>

      <Input
        label="Reference Number"
        value={formState.reference_number}
        onChange={(e) => handleChange('reference_number', e.target.value)}
        placeholder="Transaction reference"
      />

      <Textarea
        label="Description"
        value={formState.description}
        onChange={(e) => handleChange('description', e.target.value)}
        placeholder="Payment details or notes..."
        rows={2}
      />

      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit">
          {isEdit ? <Edit className="h-4 w-4 mr-2" /> : <Receipt className="h-4 w-4 mr-2" />}
          {isEdit ? 'Update Payment' : 'Record Payment'}
        </Button>
      </div>
    </form>
  );
};

// Memoize to prevent unnecessary re-renders from parent
export const ClientPaymentForm = memo(ClientPaymentFormComponent);
