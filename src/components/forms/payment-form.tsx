'use client';

import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrencyWithCode, SUPPORTED_CURRENCIES, DEFAULT_EXCHANGE_RATES, convertToAED } from '@/lib/currency';
import { Edit, Wallet } from 'lucide-react';
import type { PaymentMethod, SupportedCurrency, UserPaymentType, UserPaymentStatus } from '@/types/database';

export interface PaymentFormData {
  user_id: string;
  project_id: string;
  amount: string;
  currency: SupportedCurrency;
  payment_date: string;
  payment_type: UserPaymentType;
  payment_method: PaymentMethod;
  reference_number: string;
  description: string;
  status: UserPaymentStatus;
}

interface PaymentFormProps {
  initialData?: Partial<PaymentFormData>;
  users: { value: string; label: string }[];
  projects: { value: string; label: string }[];
  isEdit?: boolean;
  onSubmit: (data: PaymentFormData) => void;
  onCancel: () => void;
  onUserChange?: (userId: string) => void;
}

// This component manages its own form state to prevent parent re-renders on typing
const PaymentFormComponent = ({
  initialData,
  users,
  projects,
  isEdit = false,
  onSubmit,
  onCancel,
  onUserChange,
}: PaymentFormProps) => {
  // Local form state - changes here don't affect parent component
  const [formState, setFormState] = useState<PaymentFormData>({
    user_id: initialData?.user_id || '',
    project_id: initialData?.project_id || '',
    amount: initialData?.amount || '',
    currency: initialData?.currency || 'AED',
    payment_date: initialData?.payment_date || new Date().toISOString().split('T')[0],
    payment_type: initialData?.payment_type || 'salary',
    payment_method: initialData?.payment_method || 'bank_transfer',
    reference_number: initialData?.reference_number || '',
    description: initialData?.description || '',
    status: initialData?.status || 'completed',
  });

  const handleChange = (field: keyof PaymentFormData, value: string) => {
    if (field === 'user_id') {
      // Reset project when user changes
      setFormState(prev => ({ ...prev, [field]: value, project_id: '' }));
      // Notify parent about user change
      if (onUserChange) {
        onUserChange(value);
      }
    } else {
      setFormState(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formState);
  };

  const currencyOptions = SUPPORTED_CURRENCIES.map(c => ({
    value: c.code,
    label: `${c.flag} ${c.code}`
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Team Member"
        value={formState.user_id}
        onChange={(e) => handleChange('user_id', e.target.value)}
        options={users}
        required
        disabled={isEdit}
      />

      <Select
        label="Project (Optional)"
        value={formState.project_id}
        onChange={(e) => handleChange('project_id', e.target.value)}
        options={projects}
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

      {/* AED Equivalent Preview */}
      {formState.currency !== 'AED' && formState.amount && (
        <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">AED Equivalent:</span>
            <span className="font-semibold text-primary">
              {formatCurrencyWithCode(
                convertToAED(parseFloat(formState.amount) || 0, formState.currency, DEFAULT_EXCHANGE_RATES[formState.currency]),
                'AED'
              )}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Payment Type"
          value={formState.payment_type}
          onChange={(e) => handleChange('payment_type', e.target.value as UserPaymentType)}
          options={[
            { value: 'salary', label: 'Salary' },
            { value: 'bonus', label: 'Bonus' },
            { value: 'reimbursement', label: 'Reimbursement' },
            { value: 'advance', label: 'Advance' },
            { value: 'commission', label: 'Commission' },
            { value: 'other', label: 'Other' },
          ]}
        />
        <Select
          label="Status"
          value={formState.status}
          onChange={(e) => handleChange('status', e.target.value as UserPaymentStatus)}
          options={[
            { value: 'completed', label: 'Completed' },
            { value: 'pending', label: 'Pending' },
            { value: 'cancelled', label: 'Cancelled' },
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
          {isEdit ? <Edit className="h-4 w-4 mr-2" /> : <Wallet className="h-4 w-4 mr-2" />}
          {isEdit ? 'Update Payment' : 'Issue Payment'}
        </Button>
      </div>
    </form>
  );
};

// Memoize to prevent unnecessary re-renders from parent
export const PaymentForm = memo(PaymentFormComponent);
