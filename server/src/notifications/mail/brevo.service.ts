import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Brevo from '@getbrevo/brevo';

/**
 * Result of sending an email
 */
export interface SendMailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Options for sending an email via Brevo
 */
export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  attachments?: Array<{
    name: string;
    content: string; // base64 encoded content
  }>;
}

/**
 * Low stock product data for email
 */
export interface LowStockProductEmail {
  sku: string;
  name: string;
  currentStock: number;
  minStock: number;
}

/**
 * Invoice data for email notifications
 */
export interface InvoiceEmailData {
  invoiceNumber: string;
  total: number;
  dueDate: Date | null;
  customerName: string;
  customerEmail: string;
}

/**
 * Payment data for email notifications
 */
export interface PaymentEmailData {
  amount: number;
  method: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  remainingBalance: number;
}

/**
 * BrevoService
 *
 * Handles email sending via Brevo (formerly Sendinblue) API.
 * Provides transactional email functionality for the StockFlow application.
 *
 * Features:
 * - Send transactional emails via Brevo API
 * - Professional HTML email templates with inline CSS
 * - Retry logic with exponential backoff
 * - Graceful degradation when API key not configured
 * - Support for attachments (base64 encoded)
 *
 * Configuration:
 * Requires BREVO_API_KEY environment variable.
 * Optional: BREVO_SENDER_EMAIL, BREVO_SENDER_NAME
 */
@Injectable()
export class BrevoService {
  private readonly logger = new Logger(BrevoService.name);
  private readonly apiInstance: Brevo.TransactionalEmailsApi | null = null;
  private readonly isApiConfigured: boolean;
  private readonly senderEmail: string;
  private readonly senderName: string;
  private readonly frontendUrl: string;
  private readonly appUrl: string;
  private readonly adminEmail: string;
  private readonly maxRetries = 3;
  private readonly baseDelayMs = 1000;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    this.senderEmail =
      this.configService.get<string>('BREVO_SENDER_EMAIL') ||
      'noreply@stockflow.com';
    this.senderName =
      this.configService.get<string>('BREVO_SENDER_NAME') || 'StockFlow';
    this.frontendUrl =
      this.configService.get<string>('app.frontendUrl') ||
      'http://localhost:5173';
    this.appUrl =
      this.configService.get<string>('app.appUrl') || 'https://stockflow.com';
    this.adminEmail =
      this.configService.get<string>('admin.email') || 'admin@stockflow.com';

    this.isApiConfigured = !!apiKey;

    if (this.isApiConfigured) {
      this.apiInstance = new Brevo.TransactionalEmailsApi();
      this.apiInstance.setApiKey(
        Brevo.TransactionalEmailsApiApiKeys.apiKey,
        apiKey!,
      );
      this.logger.log('Brevo email service configured successfully');
    } else {
      this.logger.warn(
        'Brevo API key not configured - emails will be logged only. ' +
          'Set BREVO_API_KEY environment variable to enable email sending.',
      );
    }
  }

  /**
   * Checks if the Brevo service is properly configured and can send emails.
   *
   * @returns True if API key is configured, false otherwise
   */
  isConfigured(): boolean {
    return this.isApiConfigured;
  }

  /**
   * Validates an email address format.
   *
   * @param email - Email address to validate
   * @returns True if valid, false otherwise
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Sends an email via Brevo API with retry logic.
   *
   * @param options - Email options including recipients, subject, and content
   * @returns Result indicating success or failure
   */
  async sendEmail(options: SendEmailOptions): Promise<SendMailResult> {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    // Validate email addresses
    const invalidEmails = recipients.filter(
      (email) => !this.isValidEmail(email),
    );
    if (invalidEmails.length > 0) {
      this.logger.warn(`Invalid email addresses: ${invalidEmails.join(', ')}`);
      return {
        success: false,
        error: `Invalid email addresses: ${invalidEmails.join(', ')}`,
      };
    }

    if (!this.isApiConfigured || !this.apiInstance) {
      this.logger.debug(
        `Brevo not configured. Would have sent email to ${recipients.join(', ')}: ${options.subject}`,
      );
      return {
        success: true,
        messageId: 'brevo-not-configured',
      };
    }

    this.logger.debug(
      `Sending email to ${recipients.join(', ')}: ${options.subject}`,
    );

    return this.sendWithRetry(options, recipients, 0);
  }

  /**
   * Sends an email with retry logic for transient failures.
   *
   * @param options - Email options
   * @param recipients - Array of recipient email addresses
   * @param attempt - Current attempt number (0-indexed)
   * @returns Result indicating success or failure
   */
  private async sendWithRetry(
    options: SendEmailOptions,
    recipients: string[],
    attempt: number,
  ): Promise<SendMailResult> {
    try {
      const sendSmtpEmail = new Brevo.SendSmtpEmail();

      sendSmtpEmail.sender = {
        name: this.senderName,
        email: this.senderEmail,
      };

      sendSmtpEmail.to = recipients.map((email) => ({ email }));
      sendSmtpEmail.subject = options.subject;
      sendSmtpEmail.htmlContent = options.htmlContent;

      if (options.textContent) {
        sendSmtpEmail.textContent = options.textContent;
      }

      if (options.attachments && options.attachments.length > 0) {
        sendSmtpEmail.attachment = options.attachments.map((att) => ({
          name: att.name,
          content: att.content,
        }));
      }

      const result = await this.apiInstance!.sendTransacEmail(sendSmtpEmail);
      const messageId = result.body?.messageId || 'unknown';

      this.logger.log(
        `Email sent successfully to ${recipients.join(', ')}: ${options.subject} (messageId: ${messageId})`,
      );

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Check if we should retry
      if (attempt < this.maxRetries - 1 && this.isRetryableError(error)) {
        const delay = this.calculateBackoffDelay(attempt);
        this.logger.warn(
          `Email send failed (attempt ${attempt + 1}/${this.maxRetries}): ${errorMessage}. Retrying in ${delay}ms...`,
        );

        await this.delay(delay);
        return this.sendWithRetry(options, recipients, attempt + 1);
      }

      // Log final failure
      this.logger.error(
        `Failed to send email to ${recipients.join(', ')}: ${options.subject}`,
        error instanceof Error ? error.stack : undefined,
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Determines if an error is retryable (transient network/server errors).
   *
   * @param error - The error to check
   * @returns True if the error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const retryableMessages = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'ESOCKET',
      'EAI_AGAIN',
      'socket hang up',
      'connection timeout',
      'getaddrinfo',
      '429', // Rate limit
      '500', // Server error
      '502', // Bad gateway
      '503', // Service unavailable
      '504', // Gateway timeout
    ];

    return retryableMessages.some(
      (msg) =>
        error.message.includes(msg) ||
        (error as NodeJS.ErrnoException).code === msg,
    );
  }

  /**
   * Calculates exponential backoff delay.
   *
   * @param attempt - Current attempt number (0-indexed)
   * @returns Delay in milliseconds
   */
  private calculateBackoffDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s
    return this.baseDelayMs * Math.pow(2, attempt);
  }

  /**
   * Delays execution for the specified time.
   *
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Gets the base HTML email template with inline styles.
   *
   * @param content - Main content to insert into the template
   * @param title - Email title for the header
   * @returns Complete HTML email
   */
  private getEmailTemplate(content: string, title: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; background-color: #2563eb; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">StockFlow</h1>
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
            <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
                &copy; ${new Date().getFullYear()} StockFlow. All rights reserved.
              </p>
              <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
                This is an automated message. Please do not reply directly to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Formats a currency amount.
   *
   * @param amount - Amount to format
   * @returns Formatted currency string
   */
  private formatCurrency(amount: number): string {
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  }

  /**
   * Formats a date for display.
   *
   * @param date - Date to format
   * @returns Formatted date string
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Formats a payment method enum value to a human-readable string.
   *
   * @param method - Payment method enum value
   * @returns Human-readable payment method
   */
  private formatPaymentMethod(method: string): string {
    const methodMap: Record<string, string> = {
      CASH: 'Cash',
      CREDIT_CARD: 'Credit Card',
      DEBIT_CARD: 'Debit Card',
      BANK_TRANSFER: 'Bank Transfer',
      CHECK: 'Check',
      OTHER: 'Other',
    };

    return methodMap[method] || method;
  }

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================

  /**
   * Sends a welcome email to a new user.
   *
   * @param email - User's email address
   * @param userName - User's display name
   * @param tenantName - Organization/tenant name
   * @returns Send result
   */
  async sendWelcomeEmail(
    email: string,
    userName: string,
    tenantName: string,
  ): Promise<SendMailResult> {
    const content = `
      <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 600;">
        Welcome to StockFlow, ${userName}!
      </h2>
      <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        You've been added to <strong>${tenantName}</strong> on StockFlow. We're excited to have you on board!
      </p>
      <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        StockFlow helps you manage your inventory, track invoices, and streamline your business operations.
      </p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="border-radius: 6px; background-color: #2563eb;">
            <a href="${this.frontendUrl}/login" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 500;">
              Get Started
            </a>
          </td>
        </tr>
      </table>
      <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px;">
        Need help? Contact our support team at <a href="mailto:support@stockflow.com" style="color: #2563eb;">support@stockflow.com</a>
      </p>`;

    const htmlContent = this.getEmailTemplate(content, 'Welcome to StockFlow');

    return this.sendEmail({
      to: email,
      subject: `Welcome to StockFlow, ${userName}!`,
      htmlContent,
      textContent: `Welcome to StockFlow, ${userName}! You've been added to ${tenantName}. Get started at ${this.frontendUrl}/login`,
    });
  }

  /**
   * Sends an invoice notification email to a customer.
   *
   * @param customerEmail - Customer's email address
   * @param customerName - Customer's name
   * @param invoiceNumber - Invoice number
   * @param total - Invoice total amount
   * @param dueDate - Invoice due date
   * @param tenantName - Organization/tenant name
   * @param pdfBuffer - Optional PDF attachment as Buffer
   * @returns Send result
   */
  async sendInvoiceEmail(
    customerEmail: string,
    customerName: string,
    invoiceNumber: string,
    total: number,
    dueDate: Date | null,
    tenantName: string,
    pdfBuffer?: Buffer,
  ): Promise<SendMailResult> {
    const dueDateDisplay = dueDate ? this.formatDate(dueDate) : 'Upon receipt';

    const content = `
      <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 600;">
        Invoice ${invoiceNumber}
      </h2>
      <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Hello ${customerName},
      </p>
      <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Please find attached your invoice from <strong>${tenantName}</strong>.
      </p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 24px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="padding: 8px 0;">
                  <span style="color: #6b7280; font-size: 14px;">Invoice Number</span><br>
                  <span style="color: #111827; font-size: 16px; font-weight: 500;">${invoiceNumber}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">
                  <span style="color: #6b7280; font-size: 14px;">Amount Due</span><br>
                  <span style="color: #111827; font-size: 24px; font-weight: 600;">${this.formatCurrency(total)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">
                  <span style="color: #6b7280; font-size: 14px;">Due Date</span><br>
                  <span style="color: #111827; font-size: 16px; font-weight: 500;">${dueDateDisplay}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="margin: 0; color: #6b7280; font-size: 14px;">
        If you have any questions about this invoice, please don't hesitate to contact us.
      </p>`;

    const htmlContent = this.getEmailTemplate(
      content,
      `Invoice ${invoiceNumber}`,
    );

    const attachments: Array<{ name: string; content: string }> = [];
    if (pdfBuffer) {
      attachments.push({
        name: `Invoice-${invoiceNumber}.pdf`,
        content: pdfBuffer.toString('base64'),
      });
    }

    return this.sendEmail({
      to: customerEmail,
      subject: `Invoice ${invoiceNumber} from ${tenantName}`,
      htmlContent,
      textContent: `Invoice ${invoiceNumber} from ${tenantName}. Amount Due: ${this.formatCurrency(total)}. Due Date: ${dueDateDisplay}`,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
  }

  /**
   * Sends a password reset email.
   *
   * @param email - User's email address
   * @param resetToken - Password reset token
   * @param userName - User's display name
   * @returns Send result
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    userName: string,
  ): Promise<SendMailResult> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${resetToken}`;

    const content = `
      <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 600;">
        Reset Your Password
      </h2>
      <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Hello ${userName},
      </p>
      <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        We received a request to reset your password. Click the button below to create a new password:
      </p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
        <tr>
          <td style="border-radius: 6px; background-color: #2563eb;">
            <a href="${resetUrl}" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 500;">
              Reset Password
            </a>
          </td>
        </tr>
      </table>
      <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
      </p>
      <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px;">
        If the button doesn't work, copy and paste this URL into your browser:<br>
        <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
      </p>`;

    const htmlContent = this.getEmailTemplate(content, 'Reset Your Password');

    return this.sendEmail({
      to: email,
      subject: 'Reset Your StockFlow Password',
      htmlContent,
      textContent: `Hello ${userName}, we received a request to reset your password. Visit this link to create a new password: ${resetUrl}. This link will expire in 1 hour.`,
    });
  }

  /**
   * Sends a low stock alert email to admin users.
   *
   * @param adminEmails - Array of admin email addresses
   * @param products - Array of low stock products
   * @param tenantName - Organization/tenant name
   * @returns Send result
   */
  async sendLowStockAlertEmail(
    adminEmails: string[],
    products: LowStockProductEmail[],
    tenantName: string,
  ): Promise<SendMailResult> {
    const productRows = products
      .map(
        (p) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 14px;">${p.sku}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 14px;">${p.name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #dc2626; font-size: 14px; font-weight: 600;">${p.currentStock}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 14px;">${p.minStock}</td>
        </tr>`,
      )
      .join('');

    const content = `
      <div style="padding: 12px 16px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px; margin-bottom: 24px;">
        <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 500;">
          Low Stock Alert - ${products.length} product(s) need attention
        </p>
      </div>
      <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        The following products at <strong>${tenantName}</strong> have fallen below their minimum stock levels:
      </p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 24px;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 12px; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e5e7eb;">SKU</th>
            <th style="padding: 12px; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e5e7eb;">Product</th>
            <th style="padding: 12px; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e5e7eb;">Current</th>
            <th style="padding: 12px; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e5e7eb;">Minimum</th>
          </tr>
        </thead>
        <tbody>
          ${productRows}
        </tbody>
      </table>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="border-radius: 6px; background-color: #2563eb;">
            <a href="${this.frontendUrl}/products" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 500;">
              View Products
            </a>
          </td>
        </tr>
      </table>`;

    const htmlContent = this.getEmailTemplate(content, 'Low Stock Alert');

    return this.sendEmail({
      to: adminEmails,
      subject: `[StockFlow] Low Stock Alert - ${products.length} product(s) need attention`,
      htmlContent,
      textContent: `Low Stock Alert for ${tenantName}: ${products.length} product(s) are below minimum stock levels. Visit ${this.frontendUrl}/products to view details.`,
    });
  }

  /**
   * Sends an overdue invoice reminder email to a customer.
   *
   * @param customerEmail - Customer's email address
   * @param customerName - Customer's name
   * @param invoiceNumber - Invoice number
   * @param total - Invoice total amount
   * @param dueDate - Invoice due date
   * @param daysOverdue - Number of days past due
   * @param tenantName - Organization/tenant name
   * @returns Send result
   */
  async sendOverdueInvoiceEmail(
    customerEmail: string,
    customerName: string,
    invoiceNumber: string,
    total: number,
    dueDate: Date,
    daysOverdue: number,
    tenantName: string,
  ): Promise<SendMailResult> {
    const content = `
      <div style="padding: 12px 16px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px; margin-bottom: 24px;">
        <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 500;">
          Payment Reminder - ${daysOverdue} day(s) overdue
        </p>
      </div>
      <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 600;">
        Invoice ${invoiceNumber} is Overdue
      </h2>
      <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Hello ${customerName},
      </p>
      <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        This is a friendly reminder that payment for the following invoice from <strong>${tenantName}</strong> is now overdue:
      </p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 24px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="padding: 8px 0;">
                  <span style="color: #6b7280; font-size: 14px;">Invoice Number</span><br>
                  <span style="color: #111827; font-size: 16px; font-weight: 500;">${invoiceNumber}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">
                  <span style="color: #6b7280; font-size: 14px;">Amount Due</span><br>
                  <span style="color: #dc2626; font-size: 24px; font-weight: 600;">${this.formatCurrency(total)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">
                  <span style="color: #6b7280; font-size: 14px;">Original Due Date</span><br>
                  <span style="color: #111827; font-size: 16px; font-weight: 500;">${this.formatDate(dueDate)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">
                  <span style="color: #6b7280; font-size: 14px;">Days Overdue</span><br>
                  <span style="color: #dc2626; font-size: 16px; font-weight: 600;">${daysOverdue} day(s)</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Please arrange payment at your earliest convenience. If you have already made this payment, please disregard this notice.
      </p>
      <p style="margin: 0; color: #6b7280; font-size: 14px;">
        If you have any questions about this invoice, please contact us.
      </p>`;

    const htmlContent = this.getEmailTemplate(content, 'Invoice Overdue');

    return this.sendEmail({
      to: customerEmail,
      subject: `[Reminder] Invoice ${invoiceNumber} is ${daysOverdue} day(s) overdue`,
      htmlContent,
      textContent: `Payment Reminder: Invoice ${invoiceNumber} from ${tenantName} is ${daysOverdue} day(s) overdue. Amount due: ${this.formatCurrency(total)}. Original due date: ${this.formatDate(dueDate)}. Please arrange payment at your earliest convenience.`,
    });
  }

  /**
   * Sends a payment received confirmation email to a customer.
   *
   * @param customerEmail - Customer's email address
   * @param customerName - Customer's name
   * @param invoiceNumber - Invoice number
   * @param paymentAmount - Amount paid
   * @param paymentMethod - Payment method used
   * @param remainingBalance - Remaining balance on invoice
   * @param tenantName - Organization/tenant name
   * @returns Send result
   */
  async sendPaymentReceivedEmail(
    customerEmail: string,
    customerName: string,
    invoiceNumber: string,
    paymentAmount: number,
    paymentMethod: string,
    remainingBalance: number,
    tenantName: string,
  ): Promise<SendMailResult> {
    const isPaidInFull = remainingBalance <= 0;
    const statusBadge = isPaidInFull
      ? '<span style="display: inline-block; padding: 4px 12px; background-color: #dcfce7; color: #166534; font-size: 12px; font-weight: 500; border-radius: 9999px;">PAID IN FULL</span>'
      : `<span style="display: inline-block; padding: 4px 12px; background-color: #fef3c7; color: #92400e; font-size: 12px; font-weight: 500; border-radius: 9999px;">BALANCE: ${this.formatCurrency(remainingBalance)}</span>`;

    const content = `
      <div style="padding: 12px 16px; background-color: #dcfce7; border-left: 4px solid #16a34a; border-radius: 4px; margin-bottom: 24px;">
        <p style="margin: 0; color: #166534; font-size: 14px; font-weight: 500;">
          Payment Received - Thank you!
        </p>
      </div>
      <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 600;">
        Payment Confirmation
      </h2>
      <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Hello ${customerName},
      </p>
      <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        We have received your payment for Invoice ${invoiceNumber}. Thank you for your business!
      </p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 24px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="padding: 8px 0;">
                  <span style="color: #6b7280; font-size: 14px;">Invoice Number</span><br>
                  <span style="color: #111827; font-size: 16px; font-weight: 500;">${invoiceNumber}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">
                  <span style="color: #6b7280; font-size: 14px;">Payment Amount</span><br>
                  <span style="color: #16a34a; font-size: 24px; font-weight: 600;">${this.formatCurrency(paymentAmount)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">
                  <span style="color: #6b7280; font-size: 14px;">Payment Method</span><br>
                  <span style="color: #111827; font-size: 16px; font-weight: 500;">${this.formatPaymentMethod(paymentMethod)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">
                  <span style="color: #6b7280; font-size: 14px;">Payment Date</span><br>
                  <span style="color: #111827; font-size: 16px; font-weight: 500;">${this.formatDate(new Date())}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 16px 0 0 0;">
                  ${statusBadge}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="margin: 0; color: #6b7280; font-size: 14px;">
        From <strong>${tenantName}</strong>
      </p>`;

    const htmlContent = this.getEmailTemplate(content, 'Payment Received');

    return this.sendEmail({
      to: customerEmail,
      subject: `Payment Received - Invoice ${invoiceNumber}`,
      htmlContent,
      textContent: `Payment Received: Thank you for your payment of ${this.formatCurrency(paymentAmount)} for Invoice ${invoiceNumber}. Payment method: ${this.formatPaymentMethod(paymentMethod)}. ${isPaidInFull ? 'Invoice is now paid in full.' : `Remaining balance: ${this.formatCurrency(remainingBalance)}`}`,
    });
  }

  /**
   * Sends a notification email to the admin when a new user registers.
   * This email alerts the admin that a new registration is pending approval.
   *
   * @param data - Registration data including user and tenant information
   * @returns Send result
   */
  async sendAdminNewRegistrationNotification(data: {
    userEmail: string;
    userName: string;
    tenantName: string;
    registrationDate: Date;
  }): Promise<SendMailResult> {
    const { userEmail, userName, tenantName, registrationDate } = data;
    const adminPanelUrl = `${this.appUrl}/admin/users`;

    const content = `
      <div style="padding: 12px 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; margin-bottom: 24px;">
        <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 500;">
          Nuevo registro pendiente de aprobacion
        </p>
      </div>
      <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 600;">
        Nueva solicitud de registro
      </h2>
      <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Se ha recibido una nueva solicitud de registro que requiere tu aprobacion.
      </p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 24px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="padding: 8px 0;">
                  <span style="color: #6b7280; font-size: 14px;">Nombre del usuario</span><br>
                  <span style="color: #111827; font-size: 16px; font-weight: 500;">${userName}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">
                  <span style="color: #6b7280; font-size: 14px;">Email</span><br>
                  <span style="color: #111827; font-size: 16px; font-weight: 500;">${userEmail}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">
                  <span style="color: #6b7280; font-size: 14px;">Nombre de la empresa</span><br>
                  <span style="color: #111827; font-size: 16px; font-weight: 500;">${tenantName}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">
                  <span style="color: #6b7280; font-size: 14px;">Fecha de registro</span><br>
                  <span style="color: #111827; font-size: 16px; font-weight: 500;">${this.formatDate(registrationDate)}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="border-radius: 6px; background-color: #2563eb;">
            <a href="${adminPanelUrl}" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 500;">
              Ir al panel de administracion
            </a>
          </td>
        </tr>
      </table>
      <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px;">
        Puedes aprobar o rechazar esta solicitud desde el panel de administracion.
      </p>`;

    const htmlContent = this.getEmailTemplate(
      content,
      'Nuevo registro pendiente',
    );

    return this.sendEmail({
      to: this.adminEmail,
      subject: '[StockFlow] Nuevo registro pendiente de aprobacion',
      htmlContent,
      textContent: `Nuevo registro pendiente de aprobacion. Usuario: ${userName} (${userEmail}). Empresa: ${tenantName}. Fecha: ${this.formatDate(registrationDate)}. Accede al panel de administracion para aprobar o rechazar: ${adminPanelUrl}`,
    });
  }

  /**
   * Sends a registration confirmation email to the user.
   * This email confirms that their registration was received and is pending approval.
   *
   * @param data - User data including email, name, and tenant name
   * @returns Send result
   */
  async sendUserRegistrationConfirmation(data: {
    to: string;
    firstName: string;
    tenantName: string;
  }): Promise<SendMailResult> {
    const { to, firstName, tenantName } = data;

    const content = `
      <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 600;">
        Bienvenido a StockFlow, ${firstName}!
      </h2>
      <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Hemos recibido tu solicitud de registro para <strong>${tenantName}</strong> en StockFlow.
      </p>
      <div style="padding: 16px; background-color: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 4px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; color: #166534; font-size: 14px; font-weight: 500;">
          Estado: Pendiente de aprobacion
        </p>
        <p style="margin: 0; color: #166534; font-size: 14px;">
          Tu cuenta esta siendo revisada por nuestro equipo de administracion.
        </p>
      </div>
      <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 16px; font-weight: 600;">
        Que sucede ahora?
      </h3>
      <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #374151; font-size: 16px; line-height: 1.8;">
        <li>Nuestro equipo revisara tu solicitud de registro.</li>
        <li>Recibiras un correo electronico cuando tu cuenta sea aprobada.</li>
        <li>Una vez aprobada, podras iniciar sesion y comenzar a usar StockFlow.</li>
      </ul>
      <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        El proceso de aprobacion normalmente toma entre 24-48 horas habiles.
      </p>
      <p style="margin: 0; color: #6b7280; font-size: 14px;">
        Si tienes alguna pregunta, no dudes en contactarnos en <a href="mailto:support@stockflow.com" style="color: #2563eb;">support@stockflow.com</a>
      </p>`;

    const htmlContent = this.getEmailTemplate(
      content,
      'Registro recibido - StockFlow',
    );

    return this.sendEmail({
      to,
      subject: 'Bienvenido a StockFlow - Registro recibido',
      htmlContent,
      textContent: `Bienvenido a StockFlow, ${firstName}! Hemos recibido tu solicitud de registro para ${tenantName}. Tu cuenta esta pendiente de aprobacion. El proceso normalmente toma entre 24-48 horas habiles. Te notificaremos por correo electronico cuando tu cuenta sea aprobada.`,
    });
  }

  /**
   * Sends an email verification email to the user.
   * This email contains a verification link that the user must click to verify their email address.
   * The link expires after 24 hours.
   *
   * @param data - Verification data including recipient email, name, and verification URL
   * @returns Send result
   */
  async sendVerificationEmail(data: {
    to: string;
    firstName: string;
    verificationUrl: string;
  }): Promise<SendMailResult> {
    const { to, firstName, verificationUrl } = data;

    const content = `
      <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 600;">
        Verifica tu correo electronico
      </h2>
      <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Hola ${firstName},
      </p>
      <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Gracias por registrarte en StockFlow. Para completar tu registro, por favor verifica tu direccion de correo electronico haciendo clic en el siguiente boton:
      </p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
        <tr>
          <td style="border-radius: 6px; background-color: #2563eb;">
            <a href="${verificationUrl}" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 500;">
              Verificar correo electronico
            </a>
          </td>
        </tr>
      </table>
      <div style="padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; margin-bottom: 24px;">
        <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 500;">
          Este enlace expirara en 24 horas.
        </p>
      </div>
      <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Si no creaste una cuenta en StockFlow, puedes ignorar este correo de forma segura.
      </p>
      <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px;">
        Si el boton no funciona, copia y pega esta URL en tu navegador:<br>
        <a href="${verificationUrl}" style="color: #2563eb; word-break: break-all;">${verificationUrl}</a>
      </p>`;

    const htmlContent = this.getEmailTemplate(
      content,
      'Verifica tu correo electronico - StockFlow',
    );

    return this.sendEmail({
      to,
      subject: 'StockFlow - Verifica tu correo electronico',
      htmlContent,
      textContent: `Hola ${firstName}, gracias por registrarte en StockFlow. Para completar tu registro, verifica tu correo electronico visitando: ${verificationUrl}. Este enlace expirara en 24 horas. Si no creaste una cuenta, puedes ignorar este mensaje.`,
    });
  }
}
