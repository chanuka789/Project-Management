import { NextResponse } from 'next/server';
import { generateEmailHtml, generateEmailText, type EmailNotification } from '@/lib/email';

/**
 * Email Sending API Route
 *
 * This route handles sending emails using various providers.
 * Configure by setting one of these environment variables:
 *
 * - RESEND_API_KEY: Use Resend (recommended)
 * - SENDGRID_API_KEY: Use SendGrid
 *
 * In development mode (no API keys), emails are logged to console.
 */

export async function POST(request: Request) {
  try {
    const body: EmailNotification = await request.json();

    if (!body.to || !body.subject || !body.template) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, template' },
        { status: 400 }
      );
    }

    const recipients = Array.isArray(body.to) ? body.to : [body.to];
    const htmlContent = generateEmailHtml(body.template, body.data);
    const textContent = generateEmailText(body.template, body.data);

    // Try Resend first
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      const fromEmail = process.env.EMAIL_FROM || 'notifications@qs-global-solutions.com';

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: recipients,
          subject: body.subject,
          html: htmlContent,
          text: textContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        return NextResponse.json(
          { error: `Resend API error: ${errorData}` },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, provider: 'resend' });
    }

    // Try SendGrid
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    if (sendgridApiKey) {
      const fromEmail = process.env.EMAIL_FROM || 'notifications@qs-global-solutions.com';

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: recipients.map(email => ({ email })) }],
          from: { email: fromEmail },
          subject: body.subject,
          content: [
            { type: 'text/plain', value: textContent },
            { type: 'text/html', value: htmlContent },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        return NextResponse.json(
          { error: `SendGrid API error: ${errorData}` },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, provider: 'sendgrid' });
    }

    // Development mode - log to console
    console.log('='.repeat(50));
    console.log('📧 EMAIL NOTIFICATION (Development Mode)');
    console.log('='.repeat(50));
    console.log('To:', recipients.join(', '));
    console.log('Subject:', body.subject);
    console.log('Template:', body.template);
    console.log('Data:', JSON.stringify(body.data, null, 2));
    console.log('='.repeat(50));

    return NextResponse.json({
      success: true,
      provider: 'development',
      message: 'Email logged to console (no email provider configured)',
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to send email: ${message}` },
      { status: 500 }
    );
  }
}
