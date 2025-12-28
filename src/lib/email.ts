/**
 * Email Notification System
 *
 * This module provides email notification functionality.
 * Configure your email provider by setting environment variables:
 *
 * For production, use one of:
 * - RESEND_API_KEY (Resend)
 * - SENDGRID_API_KEY (SendGrid)
 * - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (SMTP)
 *
 * For development, emails are logged to console.
 */

import type { User, Project, TimeEntry, BudgetAlert } from '@/types/database';

// Email template types
export type EmailTemplate =
  | 'timesheet_submitted'
  | 'task_assigned'
  | 'payment_received'
  | 'payment_issued'
  | 'budget_alert'
  | 'weekly_summary'
  | 'project_update';

export interface EmailNotification {
  to: string | string[];
  subject: string;
  template: EmailTemplate;
  data: EmailTemplateData;
}

export interface EmailTemplateData {
  recipientName?: string;
  userName?: string;
  projectName?: string;
  hours?: number;
  amount?: number;
  currency?: string;
  taskTitle?: string;
  budgetPercentage?: number;
  alertLevel?: string;
  link?: string;
  companyName?: string;
}

// Generate email HTML content based on template
export function generateEmailHtml(template: EmailTemplate, data: EmailTemplateData): string {
  const companyName = data.companyName || 'QS Consultancy';
  const baseStyles = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: #ffffff;
  `;

  const headerStyles = `
    background: linear-gradient(135deg, #0a5082 0%, #1a365d 100%);
    color: white;
    padding: 24px;
    text-align: center;
    border-radius: 8px 8px 0 0;
  `;

  const contentStyles = `
    padding: 24px;
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-top: none;
    border-radius: 0 0 8px 8px;
  `;

  const buttonStyles = `
    display: inline-block;
    padding: 12px 24px;
    background-color: #0a5082;
    color: white;
    text-decoration: none;
    border-radius: 6px;
    font-weight: 600;
    margin-top: 16px;
  `;

  switch (template) {
    case 'timesheet_submitted':
      return `
        <div style="${baseStyles}">
          <div style="${headerStyles}">
            <h1 style="margin: 0; font-size: 24px;">${companyName}</h1>
          </div>
          <div style="${contentStyles}">
            <h2 style="margin-top: 0; color: #1a365d;">New Timesheet Entry</h2>
            <p style="color: #64748b; line-height: 1.6;">
              <strong>${data.userName}</strong> has logged <strong>${data.hours} hours</strong>
              on <strong>${data.projectName}</strong>.
            </p>
            ${data.link ? `<a href="${data.link}" style="${buttonStyles}">View Timesheet</a>` : ''}
          </div>
        </div>
      `;

    case 'task_assigned':
      return `
        <div style="${baseStyles}">
          <div style="${headerStyles}">
            <h1 style="margin: 0; font-size: 24px;">${companyName}</h1>
          </div>
          <div style="${contentStyles}">
            <h2 style="margin-top: 0; color: #1a365d;">Task Assigned</h2>
            <p style="color: #64748b; line-height: 1.6;">
              Hi ${data.recipientName},<br><br>
              You have been assigned a new task: <strong>${data.taskTitle}</strong>
              ${data.projectName ? ` on project <strong>${data.projectName}</strong>` : ''}.
            </p>
            ${data.link ? `<a href="${data.link}" style="${buttonStyles}">View Task</a>` : ''}
          </div>
        </div>
      `;

    case 'payment_received':
      return `
        <div style="${baseStyles}">
          <div style="${headerStyles}">
            <h1 style="margin: 0; font-size: 24px;">${companyName}</h1>
          </div>
          <div style="${contentStyles}">
            <h2 style="margin-top: 0; color: #1a365d;">Payment Received</h2>
            <p style="color: #64748b; line-height: 1.6;">
              A payment of <strong>${data.currency} ${data.amount?.toLocaleString()}</strong>
              has been received for <strong>${data.projectName}</strong>.
            </p>
            ${data.link ? `<a href="${data.link}" style="${buttonStyles}">View Payment</a>` : ''}
          </div>
        </div>
      `;

    case 'payment_issued':
      return `
        <div style="${baseStyles}">
          <div style="${headerStyles}">
            <h1 style="margin: 0; font-size: 24px;">${companyName}</h1>
          </div>
          <div style="${contentStyles}">
            <h2 style="margin-top: 0; color: #1a365d;">Payment Issued</h2>
            <p style="color: #64748b; line-height: 1.6;">
              Hi ${data.recipientName},<br><br>
              A payment of <strong>${data.currency} ${data.amount?.toLocaleString()}</strong>
              has been issued to you.
            </p>
            ${data.link ? `<a href="${data.link}" style="${buttonStyles}">View Payment</a>` : ''}
          </div>
        </div>
      `;

    case 'budget_alert':
      const alertColor = data.alertLevel === 'exceeded' ? '#dc2626'
        : data.alertLevel === 'critical' ? '#ea580c'
        : '#ca8a04';
      return `
        <div style="${baseStyles}">
          <div style="${headerStyles}">
            <h1 style="margin: 0; font-size: 24px;">${companyName}</h1>
          </div>
          <div style="${contentStyles}">
            <h2 style="margin-top: 0; color: ${alertColor};">
              ⚠️ Budget Alert - ${data.projectName}
            </h2>
            <p style="color: #64748b; line-height: 1.6;">
              Project <strong>${data.projectName}</strong> has reached
              <strong style="color: ${alertColor};">${data.budgetPercentage}%</strong> of its budget.
              ${data.alertLevel === 'exceeded' ? 'The project has exceeded its allocated budget.' : ''}
            </p>
            ${data.link ? `<a href="${data.link}" style="${buttonStyles}">View Project</a>` : ''}
          </div>
        </div>
      `;

    case 'weekly_summary':
      return `
        <div style="${baseStyles}">
          <div style="${headerStyles}">
            <h1 style="margin: 0; font-size: 24px;">${companyName}</h1>
          </div>
          <div style="${contentStyles}">
            <h2 style="margin-top: 0; color: #1a365d;">Weekly Summary</h2>
            <p style="color: #64748b; line-height: 1.6;">
              Hi ${data.recipientName},<br><br>
              Here's your weekly project summary.
            </p>
            ${data.link ? `<a href="${data.link}" style="${buttonStyles}">View Dashboard</a>` : ''}
          </div>
        </div>
      `;

    default:
      return `
        <div style="${baseStyles}">
          <div style="${headerStyles}">
            <h1 style="margin: 0; font-size: 24px;">${companyName}</h1>
          </div>
          <div style="${contentStyles}">
            <h2 style="margin-top: 0; color: #1a365d;">Notification</h2>
            <p style="color: #64748b; line-height: 1.6;">
              You have a new notification from ${companyName}.
            </p>
            ${data.link ? `<a href="${data.link}" style="${buttonStyles}">View Details</a>` : ''}
          </div>
        </div>
      `;
  }
}

// Generate plain text version
export function generateEmailText(template: EmailTemplate, data: EmailTemplateData): string {
  const companyName = data.companyName || 'QS Consultancy';

  switch (template) {
    case 'timesheet_submitted':
      return `${companyName}\n\nNew Timesheet Entry\n\n${data.userName} has logged ${data.hours} hours on ${data.projectName}.\n\n${data.link ? `View: ${data.link}` : ''}`;
    case 'task_assigned':
      return `${companyName}\n\nTask Assigned\n\nHi ${data.recipientName},\n\nYou have been assigned a new task: ${data.taskTitle}${data.projectName ? ` on project ${data.projectName}` : ''}.\n\n${data.link ? `View: ${data.link}` : ''}`;
    case 'payment_received':
      return `${companyName}\n\nPayment Received\n\nA payment of ${data.currency} ${data.amount?.toLocaleString()} has been received for ${data.projectName}.\n\n${data.link ? `View: ${data.link}` : ''}`;
    case 'payment_issued':
      return `${companyName}\n\nPayment Issued\n\nHi ${data.recipientName},\n\nA payment of ${data.currency} ${data.amount?.toLocaleString()} has been issued to you.\n\n${data.link ? `View: ${data.link}` : ''}`;
    case 'budget_alert':
      return `${companyName}\n\nBudget Alert\n\nProject ${data.projectName} has reached ${data.budgetPercentage}% of its budget.\n\n${data.link ? `View: ${data.link}` : ''}`;
    default:
      return `${companyName}\n\nNotification\n\nYou have a new notification.\n\n${data.link ? `View: ${data.link}` : ''}`;
  }
}

// Email sending function (calls API route)
export async function sendEmail(notification: EmailNotification): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notification),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.error || 'Failed to send email' };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Network error' };
  }
}

// Helper functions for common notifications
export async function notifyTimesheetSubmitted(
  adminEmails: string[],
  userName: string,
  projectName: string,
  hours: number,
  companyName?: string
): Promise<void> {
  await sendEmail({
    to: adminEmails,
    subject: `Timesheet: ${userName} logged ${hours} hours`,
    template: 'timesheet_submitted',
    data: {
      userName,
      projectName,
      hours,
      companyName,
      link: '/admin/timesheet',
    },
  });
}

export async function notifyTaskAssigned(
  userEmail: string,
  userName: string,
  taskTitle: string,
  projectName: string,
  companyName?: string
): Promise<void> {
  await sendEmail({
    to: userEmail,
    subject: `New Task Assigned: ${taskTitle}`,
    template: 'task_assigned',
    data: {
      recipientName: userName,
      taskTitle,
      projectName,
      companyName,
      link: '/user/tasks',
    },
  });
}

export async function notifyBudgetAlert(
  adminEmails: string[],
  projectName: string,
  budgetPercentage: number,
  alertLevel: 'warning' | 'critical' | 'exceeded',
  projectId: string,
  companyName?: string
): Promise<void> {
  await sendEmail({
    to: adminEmails,
    subject: `⚠️ Budget Alert: ${projectName} at ${budgetPercentage.toFixed(0)}%`,
    template: 'budget_alert',
    data: {
      projectName,
      budgetPercentage,
      alertLevel,
      companyName,
      link: `/admin/projects/${projectId}`,
    },
  });
}
