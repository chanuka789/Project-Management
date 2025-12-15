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
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  client_name?: string;
  description?: string;
  start_date: string;
  end_date: string;
  contract_value: number;
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

// Extended types with joins
export interface ProjectWithDetails extends Project {
  assigned_users?: User[];
  tasks?: Task[];
  time_entries?: TimeEntry[];
  additional_costs?: AdditionalCost[];
  total_hours?: number;
  total_labor_cost?: number;
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
