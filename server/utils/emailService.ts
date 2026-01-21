/**
 * Email Service
 * 
 * In development mode, this logs emails to console.
 * In production, this would integrate with a real email service (SendGrid, AWS SES, etc.)
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    if (this.isDevelopment) {
      // In development, log to console
      console.log('\n========== EMAIL ==========');
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log('----------------------------');
      console.log(options.text);
      console.log('============================\n');
    } else {
      // In production, integrate with real email service
      // Example: SendGrid, AWS SES, Mailgun, etc.
      console.log('TODO: Implement production email service');
      // throw new Error('Production email service not configured');
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email: string, token: string, frontendUrl: string): Promise<void> {
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;
    
    await this.sendEmail({
      to: email,
      subject: 'Verify Your Email - OpenList',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Verify Your Email Address</h2>
          <p>Thank you for registering with OpenList! Please verify your email address to complete your registration.</p>
          <p>Click the button below to verify your email:</p>
          <p style="margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Verify Email
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p style="color: #666; font-size: 14px; word-break: break-all;">${verificationUrl}</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">This link will expire in 24 hours.</p>
          <p style="color: #666; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>
        </div>
      `,
      text: `
Verify Your Email Address

Thank you for registering with OpenList! Please verify your email address to complete your registration.

Click the link below to verify your email:
${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.
      `,
    });
  }
}

export const emailService = new EmailService();
