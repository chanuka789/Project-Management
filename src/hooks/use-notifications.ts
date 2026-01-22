'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Notification, BudgetAlert, TimeEntry, Project, SupportedCurrency } from '@/types/database';
import { convertToAED, DEFAULT_EXCHANGE_RATES } from '@/lib/currency';

const NOTIFICATIONS_CACHE_KEY = 'app_notifications';
const BUDGET_ALERTS_CACHE_KEY = 'budget_alerts';

interface UseNotificationsReturn {
  notifications: Notification[];
  budgetAlerts: BudgetAlert[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  refreshNotifications: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchNotifications = useCallback(async () => {
    try {
      const maxNotificationItems = 200;
      // Fetch recent time entries as notifications
      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('*, users(full_name), projects(name)')
        .order('created_at', { ascending: false })
        .limit(maxNotificationItems);

      // Convert time entries to notifications
      const timesheetNotifications: Notification[] = (timeEntries || []).map((entry: TimeEntry & { users?: { full_name: string }; projects?: { name: string } }) => ({
        id: `timesheet-${entry.id}`,
        type: 'timesheet_submitted' as const,
        title: 'Timesheet Submitted',
        message: `${entry.users?.full_name || 'A team member'} logged ${entry.hours} hours on ${entry.projects?.name || 'a project'}`,
        link: '/admin/timesheet',
        user_id: entry.user_id,
        project_id: entry.project_id,
        is_read: false,
        created_at: entry.created_at,
        metadata: {
          user_name: entry.users?.full_name,
          project_name: entry.projects?.name,
          hours: entry.hours,
        },
      }));

      // Fetch projects for budget alerts
      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'in_progress');

      // Fetch time entries and additional costs for budget calculation
      const { data: allTimeEntries } = await supabase
        .from('time_entries')
        .select('hours, user_id, project_id');

      const { data: additionalCosts } = await supabase
        .from('additional_costs')
        .select('amount, project_id');

      const { data: users } = await supabase
        .from('users')
        .select('id, hourly_rate, hourly_rate_currency');

      // Calculate user rates in AED
      type UserWithRate = { id: string; hourly_rate: number | null; hourly_rate_currency: string | null };
      const userRatesAed = new Map((users || []).map((u: UserWithRate) => {
        const hourlyRate = u.hourly_rate || 0;
        const rateCurrency = (u.hourly_rate_currency as SupportedCurrency) || 'AED';
        const rateInAed = rateCurrency === 'AED'
          ? hourlyRate
          : convertToAED(hourlyRate, rateCurrency, DEFAULT_EXCHANGE_RATES[rateCurrency]);
        return [u.id, rateInAed];
      }));

      // Calculate budget alerts
      const alerts: BudgetAlert[] = [];
      (projects || []).forEach((project: Project) => {
        const projectTimeEntries = (allTimeEntries || []).filter((te: { project_id: string }) => te.project_id === project.id);
        const laborCost = projectTimeEntries.reduce((sum: number, te: { hours: number; user_id: string }) => {
          const rate = userRatesAed.get(te.user_id) || 0;
          return sum + (te.hours * rate);
        }, 0);

        const projectAdditionalCosts = (additionalCosts || [])
          .filter((c: { project_id: string }) => c.project_id === project.id)
          .reduce((sum: number, c: { amount: number }) => sum + (c.amount || 0), 0);

        const totalSpent = laborCost + projectAdditionalCosts;
        const budget = project.contract_value || 0;
        const percentage = budget > 0 ? (totalSpent / budget) * 100 : 0;

        if (percentage >= 80) {
          let alertLevel: BudgetAlert['alert_level'] = 'warning';
          let message = `Project has used ${percentage.toFixed(0)}% of budget`;

          if (percentage >= 100) {
            alertLevel = 'exceeded';
            message = `Project has exceeded budget by ${(percentage - 100).toFixed(0)}%`;
          } else if (percentage >= 90) {
            alertLevel = 'critical';
            message = `Project is at ${percentage.toFixed(0)}% of budget - critical!`;
          }

          alerts.push({
            id: `budget-${project.id}`,
            project_id: project.id,
            project_name: project.name,
            alert_level: alertLevel,
            budget,
            spent: totalSpent,
            percentage,
            message,
            created_at: new Date().toISOString(),
          });
        }
      });

      // Load read status from localStorage
      let readNotifications: string[] = [];
      try {
        const cached = localStorage.getItem(NOTIFICATIONS_CACHE_KEY);
        if (cached) {
          readNotifications = JSON.parse(cached);
        }
      } catch {
        // Ignore localStorage errors
      }

      // Mark notifications as read if they were previously read
      const notificationsWithReadStatus = timesheetNotifications.map(n => ({
        ...n,
        is_read: readNotifications.includes(n.id),
      }));

      setNotifications(notificationsWithReadStatus);
      setBudgetAlerts(alerts);

      // Cache budget alerts and prune older read entries
      try {
        localStorage.setItem(BUDGET_ALERTS_CACHE_KEY, JSON.stringify(alerts));
        const validReadIds = notificationsWithReadStatus.map(n => n.id);
        const prunedReadIds = readNotifications.filter(id => validReadIds.includes(id));
        localStorage.setItem(NOTIFICATIONS_CACHE_KEY, JSON.stringify(prunedReadIds));
      } catch {
        // Ignore localStorage errors
      }
    } catch {
      // Use cached data if fetch fails
      try {
        const cachedAlerts = localStorage.getItem(BUDGET_ALERTS_CACHE_KEY);
        if (cachedAlerts) {
          setBudgetAlerts(JSON.parse(cachedAlerts));
        }
      } catch {
        // Ignore errors
      }
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n =>
      n.id === id ? { ...n, is_read: true } : n
    ));

    // Save to localStorage
    try {
      const cached = localStorage.getItem(NOTIFICATIONS_CACHE_KEY);
      const readNotifications: string[] = cached ? JSON.parse(cached) : [];
      if (!readNotifications.includes(id)) {
        readNotifications.push(id);
        localStorage.setItem(NOTIFICATIONS_CACHE_KEY, JSON.stringify(readNotifications));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const markAllAsRead = useCallback(() => {
    const allIds = notifications.map(n => n.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

    // Save to localStorage
    try {
      const cached = localStorage.getItem(NOTIFICATIONS_CACHE_KEY);
      const readNotifications: string[] = cached ? JSON.parse(cached) : [];
      const merged = [...new Set([...readNotifications, ...allIds])];
      localStorage.setItem(NOTIFICATIONS_CACHE_KEY, JSON.stringify(merged));
    } catch {
      // Ignore localStorage errors
    }
  }, [notifications]);

  const unreadCount = notifications.filter(n => !n.is_read).length + budgetAlerts.length;

  return {
    notifications,
    budgetAlerts,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refreshNotifications: fetchNotifications,
  };
}
