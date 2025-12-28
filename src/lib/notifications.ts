/**
 * Client-side notification utility
 * Triggers server-side email notifications
 */

interface TimesheetNotification {
  userName: string;
  projectName: string;
  hours: number;
  date: string;
  description?: string;
}

interface TaskAssignedNotification {
  assignedUserEmail: string;
  assignedUserName: string;
  taskTitle: string;
  taskDescription?: string;
  taskPriority: string;
  taskDueDate?: string;
  projectName: string;
}

interface BudgetAlertNotification {
  projectId: string;
  projectName: string;
  budgetPercentage: number;
  alertLevel: 'warning' | 'critical' | 'exceeded';
}

interface PaymentNotification {
  projectName?: string;
  amount: number;
  currency: string;
  recipientEmail?: string;
  recipientName?: string;
}

/**
 * Send timesheet notification to admins
 */
export async function notifyTimesheetSubmitted(data: TimesheetNotification): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'timesheet',
        data,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send timesheet notification');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending timesheet notification:', error);
    return false;
  }
}

/**
 * Send task assignment notification to the assigned user
 */
export async function notifyTaskAssigned(data: TaskAssignedNotification): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'task_assigned',
        data,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send task notification');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending task notification:', error);
    return false;
  }
}

/**
 * Send budget alert notification to admins
 */
export async function notifyBudgetAlert(data: BudgetAlertNotification): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'budget_alert',
        data,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send budget alert notification');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending budget alert notification:', error);
    return false;
  }
}

/**
 * Send payment received notification to admins
 */
export async function notifyPaymentReceived(data: PaymentNotification): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'payment_received',
        data,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send payment received notification');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending payment received notification:', error);
    return false;
  }
}

/**
 * Send payment issued notification to a specific user
 */
export async function notifyPaymentIssued(data: PaymentNotification): Promise<boolean> {
  if (!data.recipientEmail) {
    console.error('Recipient email is required for payment issued notification');
    return false;
  }

  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'payment_issued',
        data,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send payment issued notification');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending payment issued notification:', error);
    return false;
  }
}
