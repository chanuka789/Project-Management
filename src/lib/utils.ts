import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'AED'): string {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function calculateDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    planning: 'bg-primary/20 text-primary',
    in_progress: 'bg-primary/60 text-white',
    on_hold: 'bg-black/20 text-black',
    completed: 'bg-primary text-white',
    cancelled: 'bg-black/40 text-white',
    pending: 'bg-black/10 text-black',
    low: 'bg-primary/20 text-primary',
    medium: 'bg-primary/50 text-white',
    high: 'bg-primary text-white',
  };
  return colors[status] || 'bg-gray-100 text-gray-600';
}

export function calculateProjectMetrics(
  contractValue: number,
  laborCost: number,
  additionalCost: number
) {
  const totalCost = laborCost + additionalCost;
  const profit = contractValue - totalCost;
  const profitMargin = contractValue > 0 ? (profit / contractValue) * 100 : 0;

  return {
    totalCost,
    profit,
    profitMargin,
  };
}

export function getProgressPercentage(current: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(Math.round((current / total) * 100), 100);
}
