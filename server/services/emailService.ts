import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

class EmailService {
  private transporter: Transporter | null = null;
  private fromAddress: string;
  private isConfigured: boolean = false;

  constructor() {
    this.fromAddress = process.env.EMAIL_FROM || 'noreply@openlist.app';
    this.initialize();
  }

  private initialize() {
    const host = process.env.EMAIL_HOST;
    const port = process.env.EMAIL_PORT;
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    const secure = process.env.EMAIL_SECURE === 'true';

    // If no email configuration is provided, use console logging for development
    if (!host || !port) {
      console.warn('[EmailService] Email configuration not found. Missing:', {
        host: !host ? 'EMAIL_HOST' : 'configured',
        port: !port ? 'EMAIL_PORT' : 'configured',
      });
      console.warn('[EmailService] Emails will be logged to console.');
      this.isConfigured = false;
      return;
    }

    const config: EmailConfig = {
      host,
      port: parseInt(port, 10),
      secure,
    };

    // Add auth if credentials are provided
    if (user && pass) {
      config.auth = { user, pass };
    }

    try {
      this.transporter = nodemailer.createTransport(config);
      this.isConfigured = true;
      console.log('[EmailService] Email service initialized successfully');
    } catch (error) {
      console.error('[EmailService] Failed to initialize email service:', error);
      this.isConfigured = false;
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.APP_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    
    const subject = 'Reset Your Password - OpenList';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .button:hover { background-color: #4338CA; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
            .warning { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">OpenList</h1>
            </div>
            <div class="content">
              <h2>Password Reset Request</h2>
              <p>Hello,</p>
              <p>We received a request to reset your password for your OpenList account. Click the button below to create a new password:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="background-color: #fff; padding: 10px; border: 1px solid #e5e7eb; border-radius: 4px; word-break: break-all; font-size: 14px;">
                ${resetUrl}
              </p>
              
              <div class="warning">
                <strong>⏰ Important:</strong> This link will expire in 1 hour for security reasons.
              </div>
              
              <p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
              
              <div class="footer">
                <p>This is an automated email from OpenList. Please do not reply to this email.</p>
                <p>&copy; ${new Date().getFullYear()} OpenList. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Password Reset Request

Hello,

We received a request to reset your password for your OpenList account.

To reset your password, click this link or copy it into your browser:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.

---
This is an automated email from OpenList. Please do not reply to this email.
© ${new Date().getFullYear()} OpenList. All rights reserved.
    `.trim();

    await this.sendEmail(email, subject, html, text);
  }

  private async sendEmail(to: string, subject: string, html: string, text: string): Promise<void> {
    // If email is not configured, log to console for development
    if (!this.isConfigured || !this.transporter) {
      console.log('\n' + '='.repeat(80));
      console.log('[EmailService] Development Mode - Email would be sent:');
      console.log('='.repeat(80));
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log('Text Content:');
      console.log('-'.repeat(80));
      console.log(text);
      console.log('='.repeat(80) + '\n');
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
        text,
      });

      console.log(`[EmailService] Email sent successfully to ${to}. MessageId: ${info.messageId}`);
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error);
      throw new Error('Failed to send email');
    }
  }

  // Test email configuration
  async verifyConnection(): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('[EmailService] Connection verification failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
