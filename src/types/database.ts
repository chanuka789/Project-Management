// Database types for Supabase
export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  birthday?: string;
  location?: string;
  role: UserRole;
  hourly_rate: number;
  hourly_rate_currency?: SupportedCurrency;
  avatar_url?: string;
  default_currency?: SupportedCurrency;
  created_at: string;
  updated_at: string;
}

export type SupportedCurrency = 'AED' | 'USD' | 'QAR' | 'SAR' | 'LKR';

export interface Project {
  id: string;
  name: string;
  client_name?: string;
  description?: string;
  start_date: string;
  end_date: string;
  contract_value: number;
  contract_value_aed?: number;
  currency: SupportedCurrency;
  exchange_rate?: number;
  exchange_rate_date?: string;
  status: 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectUser {
  id: string;
  project_id: string;
  user_id: string;
  assigned_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  assigned_to?: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: string;
  user_id: string;
  project_id: string;
  task_id?: string;
  date: string;
  hours: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface AdditionalCost {
  id: string;
  project_id: string;
  description: string;
  amount: number;
  date: string;
  created_by: string;
  created_at: string;
}

export interface CompanySettings {
  id: string;
  company_name: string;
  logo_url?: string;
  updated_at: string;
}

// Client and Payment types
export interface Client {
  id: string;
  name: string;
  company_name?: string;
  emails: string[]; // Multiple emails
  phones: string[]; // Multiple phone numbers
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue';
export type PaymentMethod = 'bank_transfer' | 'cash' | 'cheque' | 'credit_card' | 'other';

export interface Payment {
  id: string;
  project_id: string;
  client_id?: string;
  amount: number;
  currency: SupportedCurrency;
  payment_date: string;
  due_date?: string;
  status: PaymentStatus;
  payment_method?: PaymentMethod;
  reference_number?: string;
  description?: string;
  invoice_number?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentWithDetails extends Payment {
  project?: Project;
  client?: Client;
}

// User Payment Types (payments issued to team members)
export type UserPaymentType = 'salary' | 'bonus' | 'reimbursement' | 'advance' | 'commission' | 'other';
export type UserPaymentStatus = 'pending' | 'completed' | 'cancelled';

export interface UserPayment {
  id: string;
  user_id: string;
  project_id?: string;
  amount: number;
  amount_aed?: number;
  currency: SupportedCurrency;
  exchange_rate?: number;
  exchange_rate_date?: string;
  payment_date: string;
  payment_type: UserPaymentType;
  payment_method?: PaymentMethod;
  reference_number?: string;
  description?: string;
  status: UserPaymentStatus;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface UserPaymentWithDetails extends UserPayment {
  user?: User;
  project?: Project;
}

export interface UserPaymentSummary {
  user_id: string;
  user_name: string;
  total_paid: number;
  total_paid_aed: number;
  payment_count: number;
  payments: UserPayment[];
}

export interface ProjectPaymentSummary {
  project_id: string;
  project_name: string;
  client_name?: string;
  contract_value: number;
  total_paid: number;
  total_pending: number;
  balance_due: number;
  payment_percentage: number;
  status: Project['status'];
  payments: Payment[];
}

// Extended types with joins
export interface ProjectWithDetails extends Project {
  assigned_users?: User[];
  tasks?: Task[];
  time_entries?: TimeEntry[];
  additional_costs?: AdditionalCost[];
  total_hours?: number;
  total_salaries?: number;
  total_additional_cost?: number;
  total_cost?: number;
  profit?: number;
}

export interface UserWithDetails extends User {
  assigned_projects?: Project[];
  time_entries?: TimeEntry[];
  tasks?: Task[];
  total_hours?: number;
  total_cost?: number;
}

export interface TimeEntryWithDetails extends TimeEntry {
  user?: User;
  project?: Project;
  task?: Task;
}

// Dashboard metrics
export interface DashboardMetrics {
  total_projects: number;
  active_projects: number;
  total_users: number;
  total_contract_value: number;
  total_costs: number;
  total_profit: number;
  profit_margin: number;
}

export interface ProjectPerformance {
  project_id: string;
  project_name: string;
  planned_hours: number;
  actual_hours: number;
  planned_cost: number;
  actual_cost: number;
  budget_variance: number;
  time_variance: number;
  status: string;
}
