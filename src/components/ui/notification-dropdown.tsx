'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useNotifications } from '@/hooks/use-notifications';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import {
  Bell,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  X,
  ChevronRight,
  DollarSign,
  FileText,
  Users,
} from 'lucide-react';
import type { Notification, BudgetAlert } from '@/types/database';

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'timesheet_submitted':
      return <Clock className="h-4 w-4 text-blue-500" />;
    case 'task_assigned':
      return <Users className="h-4 w-4 text-purple-500" />;
    case 'payment_received':
    case 'payment_issued':
      return <DollarSign className="h-4 w-4 text-green-500" />;
    case 'budget_alert':
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    case 'project_update':
      return <FileText className="h-4 w-4 text-[#0a5082]" />;
    default:
      return <Bell className="h-4 w-4 text-gray-500" />;
  }
}

function getBudgetAlertColor(level: BudgetAlert['alert_level']) {
  switch (level) {
    case 'exceeded':
      return 'text-red-500 bg-red-50';
    case 'critical':
      return 'text-orange-500 bg-orange-50';
    case 'warning':
      return 'text-yellow-600 bg-yellow-50';
    default:
      return 'text-gray-500 bg-gray-50';
  }
}

function getBudgetAlertIcon(level: BudgetAlert['alert_level']) {
  switch (level) {
    case 'exceeded':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'critical':
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
  }
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'notifications' | 'alerts'>('notifications');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    budgetAlerts,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadNotifications = notifications.filter(n => !n.is_read);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadNotifications.length > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-[#0a5082] hover:underline"
                >
                  Mark all as read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'notifications'
                  ? 'text-[#0a5082] border-b-2 border-[#0a5082]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Activity
              {unreadNotifications.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[#0a5082] text-white text-xs">
                  {unreadNotifications.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'alerts'
                  ? 'text-[#0a5082] border-b-2 border-[#0a5082]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Budget Alerts
              {budgetAlerts.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-orange-500 text-white text-xs">
                  {budgetAlerts.length}
                </span>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0a5082]" />
              </div>
            ) : activeTab === 'notifications' ? (
              notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {notifications.slice(0, 10).map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => markAsRead(notification.id)}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
                        !notification.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                      }`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {getTimeAgo(notification.created_at)}
                        </p>
                      </div>
                      {notification.link && (
                        <Link
                          href={notification.link}
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                          }}
                          className="flex-shrink-0"
                        >
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              budgetAlerts.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">All projects within budget</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {budgetAlerts.map((alert) => (
                    <Link
                      key={alert.id}
                      href={`/admin/projects/${alert.project_id}`}
                      onClick={() => setIsOpen(false)}
                      className="block"
                    >
                      <div className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors`}>
                        <div className={`flex-shrink-0 mt-0.5 p-2 rounded-lg ${getBudgetAlertColor(alert.alert_level)}`}>
                          {getBudgetAlertIcon(alert.alert_level)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {alert.project_name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {alert.message}
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-gray-400">
                              Budget: {formatCurrency(alert.budget)}
                            </span>
                            <span className="text-xs text-gray-400">
                              Spent: {formatCurrency(alert.spent)}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                alert.alert_level === 'exceeded'
                                  ? 'bg-red-500'
                                  : alert.alert_level === 'critical'
                                  ? 'bg-orange-500'
                                  : 'bg-yellow-500'
                              }`}
                              style={{ width: `${Math.min(alert.percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                        <ChevronRight className="flex-shrink-0 h-4 w-4 text-gray-400" />
                      </div>
                    </Link>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <Link
              href="/admin/timesheet"
              onClick={() => setIsOpen(false)}
              className="text-sm text-[#0a5082] hover:underline flex items-center justify-center gap-1"
            >
              View all activity
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
