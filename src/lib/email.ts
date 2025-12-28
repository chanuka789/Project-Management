/**
 * Email Notification System - QS Global Solutions
 *
 * This module provides email notification functionality.
 * Configure your email provider by setting environment variables:
 *
 * For production, use one of:
 * - RESEND_API_KEY (Resend)
 * - SENDGRID_API_KEY (SendGrid)
 *
 * For development, emails are logged to console.
 */

// Email template types
export type EmailTemplate =
  | 'timesheet_submitted'
  | 'task_assigned'
  | 'payment_received'
  | 'payment_issued'
  | 'budget_alert'
  | 'weekly_summary'
  | 'project_update'
  | 'welcome';

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
  taskDescription?: string;
  taskPriority?: string;
  taskDueDate?: string;
  budgetPercentage?: number;
  alertLevel?: string;
  link?: string;
  companyName?: string;
  date?: string;
  description?: string;
}

// QS Global Solutions Brand Colors
const BRAND = {
  primary: '#0a5082',
  primaryDark: '#083d63',
  secondary: '#1a365d',
  accent: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  text: '#1f2937',
  textLight: '#6b7280',
  background: '#f8fafc',
  white: '#ffffff',
  border: '#e5e7eb',
};

// Generate professional email HTML content
export function generateEmailHtml(template: EmailTemplate, data: EmailTemplateData): string {
  const companyName = data.companyName || 'QS Global Solutions';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://qs-global-solutions.com';

  // Common email wrapper
  const emailWrapper = (content: string, title: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: ${BRAND.white}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.secondary} 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: ${BRAND.white}; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                ${companyName}
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">
                Project Management System
              </p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: ${BRAND.background}; padding: 24px 40px; border-top: 1px solid ${BRAND.border};">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px 0; color: ${BRAND.textLight}; font-size: 13px;">
                      This is an automated notification from ${companyName}
                    </p>
                    <p style="margin: 0; color: ${BRAND.textLight}; font-size: 12px;">
                      © ${new Date().getFullYear()} ${companyName}. All rights reserved.
                    </p>
                    <p style="margin: 8px 0 0 0;">
                      <a href="${baseUrl}" style="color: ${BRAND.primary}; text-decoration: none; font-size: 12px;">
                        Visit Dashboard
                      </a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Button style
  const buttonStyle = `
    display: inline-block;
    padding: 14px 32px;
    background: linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%);
    color: ${BRAND.white};
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    text-align: center;
    box-shadow: 0 2px 4px rgba(10, 80, 130, 0.3);
  `;

  // Info box style
  const infoBoxStyle = `
    background-color: ${BRAND.background};
    border-left: 4px solid ${BRAND.primary};
    padding: 16px 20px;
    border-radius: 0 8px 8px 0;
    margin: 24px 0;
  `;

  switch (template) {
    case 'timesheet_submitted':
      return emailWrapper(`
        <h2 style="margin: 0 0 16px 0; color: ${BRAND.text}; font-size: 22px; font-weight: 600;">
          ⏱️ New Timesheet Entry
        </h2>
        <p style="margin: 0 0 24px 0; color: ${BRAND.textLight}; font-size: 15px; line-height: 1.6;">
          A team member has logged new hours in the system.
        </p>

        <div style="${infoBoxStyle}">
          <table role="presentation" style="width: 100%;">
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: ${BRAND.textLight}; font-size: 13px;">Team Member</span><br>
                <span style="color: ${BRAND.text}; font-size: 16px; font-weight: 600;">${data.userName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: ${BRAND.textLight}; font-size: 13px;">Project</span><br>
                <span style="color: ${BRAND.text}; font-size: 16px; font-weight: 600;">${data.projectName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: ${BRAND.textLight}; font-size: 13px;">Hours Logged</span><br>
                <span style="color: ${BRAND.primary}; font-size: 24px; font-weight: 700;">${data.hours} hours</span>
              </td>
            </tr>
            ${data.date ? `
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: ${BRAND.textLight}; font-size: 13px;">Date</span><br>
                <span style="color: ${BRAND.text}; font-size: 16px; font-weight: 600;">${data.date}</span>
              </td>
            </tr>
            ` : ''}
            ${data.description ? `
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: ${BRAND.textLight}; font-size: 13px;">Description</span><br>
                <span style="color: ${BRAND.text}; font-size: 14px;">${data.description}</span>
              </td>
            </tr>
            ` : ''}
          </table>
        </div>

        ${data.link ? `
        <p style="text-align: center; margin-top: 32px;">
          <a href="${data.link}" style="${buttonStyle}">
            View Timesheet Details
          </a>
        </p>
        ` : ''}
      `, 'New Timesheet Entry');

    case 'task_assigned':
      const priorityColor = data.taskPriority === 'high' ? BRAND.danger :
                           data.taskPriority === 'medium' ? BRAND.warning : BRAND.success;
      return emailWrapper(`
        <h2 style="margin: 0 0 16px 0; color: ${BRAND.text}; font-size: 22px; font-weight: 600;">
          📋 New Task Assigned
        </h2>
        <p style="margin: 0 0 8px 0; color: ${BRAND.textLight}; font-size: 15px; line-height: 1.6;">
          Hi <strong style="color: ${BRAND.text};">${data.recipientName}</strong>,
        </p>
        <p style="margin: 0 0 24px 0; color: ${BRAND.textLight}; font-size: 15px; line-height: 1.6;">
          You have been assigned a new task. Please review the details below.
        </p>

        <div style="${infoBoxStyle}">
          <table role="presentation" style="width: 100%;">
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: ${BRAND.textLight}; font-size: 13px;">Task Title</span><br>
                <span style="color: ${BRAND.text}; font-size: 18px; font-weight: 600;">${data.taskTitle}</span>
              </td>
            </tr>
            ${data.projectName ? `
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: ${BRAND.textLight}; font-size: 13px;">Project</span><br>
                <span style="color: ${BRAND.text}; font-size: 16px; font-weight: 600;">${data.projectName}</span>
              </td>
            </tr>
            ` : ''}
            ${data.taskDescription ? `
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: ${BRAND.textLight}; font-size: 13px;">Description</span><br>
                <span style="color: ${BRAND.text}; font-size: 14px; line-height: 1.5;">${data.taskDescription}</span>
              </td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: ${BRAND.textLight}; font-size: 13px;">Priority</span><br>
                <span style="display: inline-block; padding: 4px 12px; background-color: ${priorityColor}; color: white; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                  ${data.taskPriority || 'Medium'}
                </span>
              </td>
            </tr>
            ${data.taskDueDate ? `
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: ${BRAND.textLight}; font-size: 13px;">Due Date</span><br>
                <span style="color: ${BRAND.text}; font-size: 16px; font-weight: 600;">${data.taskDueDate}</span>
              </td>
            </tr>
            ` : ''}
          </table>
        </div>

        ${data.link ? `
        <p style="text-align: center; margin-top: 32px;">
          <a href="${data.link}" style="${buttonStyle}">
            View Task Details
          </a>
        </p>
        ` : ''}
      `, 'New Task Assigned');

    case 'budget_alert':
      const alertColor = data.alertLevel === 'exceeded' ? BRAND.danger
        : data.alertLevel === 'critical' ? '#ea580c'
        : BRAND.warning;
      const alertIcon = data.alertLevel === 'exceeded' ? '🚨'
        : data.alertLevel === 'critical' ? '⚠️' : '📊';
      const alertTitle = data.alertLevel === 'exceeded' ? 'Budget Exceeded!'
        : data.alertLevel === 'critical' ? 'Critical Budget Alert'
        : 'Budget Warning';

      return emailWrapper(`
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 48px;">${alertIcon}</span>
        </div>
        <h2 style="margin: 0 0 16px 0; color: ${alertColor}; font-size: 22px; font-weight: 600; text-align: center;">
          ${alertTitle}
        </h2>
        <p style="margin: 0 0 24px 0; color: ${BRAND.textLight}; font-size: 15px; line-height: 1.6; text-align: center;">
          Project budget requires your attention.
        </p>

        <div style="background-color: ${BRAND.background}; border: 2px solid ${alertColor}; padding: 24px; border-radius: 12px; margin: 24px 0; text-align: center;">
          <p style="margin: 0 0 8px 0; color: ${BRAND.textLight}; font-size: 14px;">Project</p>
          <p style="margin: 0 0 16px 0; color: ${BRAND.text}; font-size: 20px; font-weight: 600;">${data.projectName}</p>

          <p style="margin: 0 0 8px 0; color: ${BRAND.textLight}; font-size: 14px;">Budget Used</p>
          <p style="margin: 0; color: ${alertColor}; font-size: 48px; font-weight: 700;">${data.budgetPercentage?.toFixed(0)}%</p>

          <!-- Progress bar -->
          <div style="background-color: #e5e7eb; border-radius: 999px; height: 12px; margin-top: 16px; overflow: hidden;">
            <div style="background-color: ${alertColor}; height: 100%; width: ${Math.min(data.budgetPercentage || 0, 100)}%; border-radius: 999px;"></div>
          </div>
        </div>

        <p style="margin: 24px 0; color: ${BRAND.textLight}; font-size: 14px; line-height: 1.6;">
          ${data.alertLevel === 'exceeded'
            ? 'This project has exceeded its allocated budget. Immediate action is recommended.'
            : data.alertLevel === 'critical'
            ? 'This project is approaching its budget limit. Please review and take necessary action.'
            : 'This project is using a significant portion of its budget. Consider reviewing upcoming expenses.'}
        </p>

        ${data.link ? `
        <p style="text-align: center; margin-top: 32px;">
          <a href="${data.link}" style="${buttonStyle}">
            Review Project Budget
          </a>
        </p>
        ` : ''}
      `, alertTitle);

    case 'payment_received':
      return emailWrapper(`
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 48px;">💰</span>
        </div>
        <h2 style="margin: 0 0 16px 0; color: ${BRAND.success}; font-size: 22px; font-weight: 600; text-align: center;">
          Payment Received
        </h2>
        <p style="margin: 0 0 24px 0; color: ${BRAND.textLight}; font-size: 15px; line-height: 1.6; text-align: center;">
          A new payment has been recorded in the system.
        </p>

        <div style="background-color: ${BRAND.background}; border: 2px solid ${BRAND.success}; padding: 24px; border-radius: 12px; margin: 24px 0; text-align: center;">
          <p style="margin: 0 0 8px 0; color: ${BRAND.textLight}; font-size: 14px;">Amount Received</p>
          <p style="margin: 0 0 16px 0; color: ${BRAND.success}; font-size: 36px; font-weight: 700;">
            ${data.currency} ${data.amount?.toLocaleString()}
          </p>
          <p style="margin: 0 0 8px 0; color: ${BRAND.textLight}; font-size: 14px;">For Project</p>
          <p style="margin: 0; color: ${BRAND.text}; font-size: 18px; font-weight: 600;">${data.projectName}</p>
        </div>

        ${data.link ? `
        <p style="text-align: center; margin-top: 32px;">
          <a href="${data.link}" style="${buttonStyle}">
            View Payment Details
          </a>
        </p>
        ` : ''}
      `, 'Payment Received');

    case 'payment_issued':
      return emailWrapper(`
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 48px;">🎉</span>
        </div>
        <h2 style="margin: 0 0 16px 0; color: ${BRAND.primary}; font-size: 22px; font-weight: 600; text-align: center;">
          Payment Issued
        </h2>
        <p style="margin: 0 0 8px 0; color: ${BRAND.textLight}; font-size: 15px; line-height: 1.6; text-align: center;">
          Hi <strong style="color: ${BRAND.text};">${data.recipientName}</strong>,
        </p>
        <p style="margin: 0 0 24px 0; color: ${BRAND.textLight}; font-size: 15px; line-height: 1.6; text-align: center;">
          Great news! A payment has been issued to you.
        </p>

        <div style="background-color: ${BRAND.background}; border: 2px solid ${BRAND.primary}; padding: 24px; border-radius: 12px; margin: 24px 0; text-align: center;">
          <p style="margin: 0 0 8px 0; color: ${BRAND.textLight}; font-size: 14px;">Payment Amount</p>
          <p style="margin: 0; color: ${BRAND.primary}; font-size: 36px; font-weight: 700;">
            ${data.currency} ${data.amount?.toLocaleString()}
          </p>
        </div>

        <p style="margin: 24px 0; color: ${BRAND.textLight}; font-size: 14px; line-height: 1.6; text-align: center;">
          This payment will be processed according to your payment terms.
          If you have any questions, please contact the admin team.
        </p>

        ${data.link ? `
        <p style="text-align: center; margin-top: 32px;">
          <a href="${data.link}" style="${buttonStyle}">
            View Payment History
          </a>
        </p>
        ` : ''}
      `, 'Payment Issued');

    case 'welcome':
      return emailWrapper(`
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 48px;">👋</span>
        </div>
        <h2 style="margin: 0 0 16px 0; color: ${BRAND.text}; font-size: 22px; font-weight: 600; text-align: center;">
          Welcome to ${companyName}!
        </h2>
        <p style="margin: 0 0 8px 0; color: ${BRAND.textLight}; font-size: 15px; line-height: 1.6; text-align: center;">
          Hi <strong style="color: ${BRAND.text};">${data.recipientName}</strong>,
        </p>
        <p style="margin: 0 0 24px 0; color: ${BRAND.textLight}; font-size: 15px; line-height: 1.6; text-align: center;">
          Your account has been created. You can now access the project management system.
        </p>

        <div style="${infoBoxStyle}">
          <p style="margin: 0; color: ${BRAND.text}; font-size: 14px; line-height: 1.6;">
            <strong>What you can do:</strong><br>
            • View your assigned projects<br>
            • Log your working hours<br>
            • Track your tasks<br>
            • View payment history
          </p>
        </div>

        ${data.link ? `
        <p style="text-align: center; margin-top: 32px;">
          <a href="${data.link}" style="${buttonStyle}">
            Access Dashboard
          </a>
        </p>
        ` : ''}
      `, `Welcome to ${companyName}`);

    default:
      return emailWrapper(`
        <h2 style="margin: 0 0 16px 0; color: ${BRAND.text}; font-size: 22px; font-weight: 600;">
          Notification
        </h2>
        <p style="margin: 0 0 24px 0; color: ${BRAND.textLight}; font-size: 15px; line-height: 1.6;">
          You have a new notification from ${companyName}.
        </p>
        ${data.link ? `
        <p style="text-align: center; margin-top: 32px;">
          <a href="${data.link}" style="${buttonStyle}">
            View Details
          </a>
        </p>
        ` : ''}
      `, 'Notification');
  }
}

// Generate plain text version
export function generateEmailText(template: EmailTemplate, data: EmailTemplateData): string {
  const companyName = data.companyName || 'QS Global Solutions';
  const separator = '━'.repeat(40);

  switch (template) {
    case 'timesheet_submitted':
      return `${companyName}
${separator}

NEW TIMESHEET ENTRY

Team Member: ${data.userName}
Project: ${data.projectName}
Hours Logged: ${data.hours} hours
${data.date ? `Date: ${data.date}` : ''}
${data.description ? `Description: ${data.description}` : ''}

${data.link ? `View Details: ${data.link}` : ''}

${separator}
This is an automated notification from ${companyName}`;

    case 'task_assigned':
      return `${companyName}
${separator}

NEW TASK ASSIGNED

Hi ${data.recipientName},

You have been assigned a new task.

Task: ${data.taskTitle}
${data.projectName ? `Project: ${data.projectName}` : ''}
${data.taskDescription ? `Description: ${data.taskDescription}` : ''}
Priority: ${data.taskPriority || 'Medium'}
${data.taskDueDate ? `Due Date: ${data.taskDueDate}` : ''}

${data.link ? `View Task: ${data.link}` : ''}

${separator}
This is an automated notification from ${companyName}`;

    case 'budget_alert':
      const alertTitle = data.alertLevel === 'exceeded' ? 'BUDGET EXCEEDED'
        : data.alertLevel === 'critical' ? 'CRITICAL BUDGET ALERT'
        : 'BUDGET WARNING';
      return `${companyName}
${separator}

${alertTitle}

Project: ${data.projectName}
Budget Used: ${data.budgetPercentage?.toFixed(0)}%

${data.alertLevel === 'exceeded'
  ? 'This project has exceeded its allocated budget. Immediate action is recommended.'
  : data.alertLevel === 'critical'
  ? 'This project is approaching its budget limit. Please review and take necessary action.'
  : 'This project is using a significant portion of its budget.'}

${data.link ? `Review Project: ${data.link}` : ''}

${separator}
This is an automated notification from ${companyName}`;

    case 'payment_received':
      return `${companyName}
${separator}

PAYMENT RECEIVED

Amount: ${data.currency} ${data.amount?.toLocaleString()}
Project: ${data.projectName}

${data.link ? `View Details: ${data.link}` : ''}

${separator}
This is an automated notification from ${companyName}`;

    case 'payment_issued':
      return `${companyName}
${separator}

PAYMENT ISSUED

Hi ${data.recipientName},

A payment has been issued to you.

Amount: ${data.currency} ${data.amount?.toLocaleString()}

${data.link ? `View Payment History: ${data.link}` : ''}

${separator}
This is an automated notification from ${companyName}`;

    default:
      return `${companyName}
${separator}

NOTIFICATION

You have a new notification.

${data.link ? `View Details: ${data.link}` : ''}

${separator}
This is an automated notification from ${companyName}`;
  }
}

// Get base URL for email links
export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://pms.qs-global-solutions.com';
}
