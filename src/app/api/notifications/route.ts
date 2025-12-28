import { NextResponse } from 'next/server';
import { generateEmailHtml, generateEmailText, getBaseUrl } from '@/lib/email';
import type { EmailTemplate, EmailTemplateData } from '@/lib/email';

interface NotificationRequest {
  type: 'timesheet' | 'task_assigned' | 'budget_alert' | 'payment_received' | 'payment_issued';
  data: {
    // Common fields
    projectId?: string;
    projectName?: string;

    // Timesheet specific
    userName?: string;
    hours?: number;
    date?: string;
    description?: string;

    // Task specific
    taskTitle?: string;
    taskDescription?: string;
    taskPriority?: string;
    taskDueDate?: string;
    assignedUserEmail?: string;
    assignedUserName?: string;

    // Budget alert specific
    budgetPercentage?: number;
    alertLevel?: 'warning' | 'critical' | 'exceeded';

    // Payment specific
    amount?: number;
    currency?: string;
    recipientEmail?: string;
    recipientName?: string;
  };
}

// Send email using Resend
async function sendEmailViaResend(
  to: string[],
  subject: string,
  html: string,
  text: string
): Promise<{ success: boolean; error?: string; details?: unknown }> {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.log('⚠️ RESEND_API_KEY not configured - Email not sent');
    console.log('Would send to:', to.join(', '));
    console.log('Subject:', subject);
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  if (to.length === 0) {
    console.log('⚠️ No recipients specified');
    return { success: false, error: 'No recipients' };
  }

  try {
    const fromEmail = process.env.EMAIL_FROM || 'QS Global Solutions <notifications@qs-global-solutions.com>';

    console.log('📧 Sending email via Resend...');
    console.log('From:', fromEmail);
    console.log('To:', to.join(', '));
    console.log('Subject:', subject);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: to,
        subject: subject,
        html: html,
        text: text,
      }),
    });

    const responseText = await response.text();
    console.log('Resend response status:', response.status);
    console.log('Resend response:', responseText);

    if (!response.ok) {
      console.error('❌ Resend API error:', responseText);
      return { success: false, error: responseText };
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = responseText;
    }

    console.log('✅ Email sent successfully:', result);
    return { success: true, details: result };
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return { success: false, error: String(error) };
  }
}

// Get admin email addresses from environment variable
function getAdminEmails(): string[] {
  const adminEmails = process.env.ADMIN_EMAILS || '';
  const emails = adminEmails.split(',').map(e => e.trim()).filter(Boolean);
  console.log('📋 Admin emails from env:', emails.length > 0 ? emails.join(', ') : 'None configured');
  return emails;
}

export async function POST(request: Request) {
  try {
    const body: NotificationRequest = await request.json();
    const baseUrl = getBaseUrl();

    let recipients: string[] = [];
    let subject = '';
    let template: EmailTemplate;
    let templateData: EmailTemplateData = {
      companyName: 'QS Global Solutions',
    };

    switch (body.type) {
      case 'timesheet':
        // Send to all admins when a timesheet is submitted
        recipients = getAdminEmails();
        if (recipients.length === 0) {
          return NextResponse.json({ success: true, message: 'No admin recipients found' });
        }

        template = 'timesheet_submitted';
        subject = `Timesheet: ${body.data.userName} logged ${body.data.hours} hours`;
        templateData = {
          ...templateData,
          userName: body.data.userName,
          projectName: body.data.projectName,
          hours: body.data.hours,
          date: body.data.date,
          description: body.data.description,
          link: `${baseUrl}/admin/timesheet`,
        };
        break;

      case 'task_assigned':
        // Send to the assigned user (email passed directly)
        if (!body.data.assignedUserEmail) {
          return NextResponse.json({ success: true, message: 'No user email provided' });
        }

        recipients = [body.data.assignedUserEmail];
        template = 'task_assigned';
        subject = `New Task Assigned: ${body.data.taskTitle}`;
        templateData = {
          ...templateData,
          recipientName: body.data.assignedUserName || 'Team Member',
          taskTitle: body.data.taskTitle,
          taskDescription: body.data.taskDescription,
          taskPriority: body.data.taskPriority,
          taskDueDate: body.data.taskDueDate,
          projectName: body.data.projectName,
          link: `${baseUrl}/user/tasks`,
        };
        break;

      case 'budget_alert':
        // Send to all admins
        recipients = getAdminEmails();
        if (recipients.length === 0) {
          return NextResponse.json({ success: true, message: 'No admin recipients found' });
        }

        template = 'budget_alert';
        const alertPrefix = body.data.alertLevel === 'exceeded' ? '🚨'
          : body.data.alertLevel === 'critical' ? '⚠️' : '📊';
        subject = `${alertPrefix} Budget Alert: ${body.data.projectName} at ${body.data.budgetPercentage?.toFixed(0)}%`;
        templateData = {
          ...templateData,
          projectName: body.data.projectName,
          budgetPercentage: body.data.budgetPercentage,
          alertLevel: body.data.alertLevel,
          link: `${baseUrl}/admin/projects/${body.data.projectId}`,
        };
        break;

      case 'payment_received':
        // Send to all admins
        recipients = getAdminEmails();
        if (recipients.length === 0) {
          return NextResponse.json({ success: true, message: 'No admin recipients found' });
        }

        template = 'payment_received';
        subject = `💰 Payment Received: ${body.data.currency} ${body.data.amount?.toLocaleString()}`;
        templateData = {
          ...templateData,
          projectName: body.data.projectName,
          amount: body.data.amount,
          currency: body.data.currency,
          link: `${baseUrl}/admin/finance`,
        };
        break;

      case 'payment_issued':
        // Send to the specific user
        if (!body.data.recipientEmail) {
          return NextResponse.json({ success: false, error: 'Recipient email required' }, { status: 400 });
        }

        recipients = [body.data.recipientEmail];
        template = 'payment_issued';
        subject = `🎉 Payment Issued: ${body.data.currency} ${body.data.amount?.toLocaleString()}`;
        templateData = {
          ...templateData,
          recipientName: body.data.recipientName,
          amount: body.data.amount,
          currency: body.data.currency,
          link: `${baseUrl}/user/payments`,
        };
        break;

      default:
        return NextResponse.json({ success: false, error: 'Invalid notification type' }, { status: 400 });
    }

    // Generate email content
    const html = generateEmailHtml(template, templateData);
    const text = generateEmailText(template, templateData);

    // Send email
    const result = await sendEmailViaResend(recipients, subject, html, text);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${recipients.length} recipient(s)`,
      recipients: recipients.length
    });

  } catch (error) {
    console.error('Notification error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
