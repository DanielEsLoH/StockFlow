import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { UserRole, PaymentStatus, InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../prisma';
import { BrevoService, SendMailResult } from './mail/brevo.service';

/**
 * User data for welcome email
 */
export interface WelcomeEmailUser {
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
}

/**
 * Invoice data for email notifications
 */
export interface InvoiceEmailData {
  id: string;
  invoiceNumber: string;
  total: number;
  dueDate: Date | null;
  customer?: {
    name: string;
    email: string | null;
  } | null;
}

/**
 * Payment data for email notifications
 */
export interface PaymentEmailData {
  amount: number;
  method: string;
}

/**
 * Low stock product data
 */
export interface LowStockProduct {
  id: string;
  sku: string;
  name: string;
  stock: number;
  minStock: number;
}

/**
 * NotificationsService
 *
 * Handles all email notification logic for the StockFlow application.
 * This service provides:
 *
 * 1. Direct notification methods:
 *    - sendWelcomeEmail - Send welcome email to new users
 *    - sendInvoiceSentEmail - Notify customer when invoice is sent
 *    - sendPaymentReceivedEmail - Confirm payment received
 *
 * 2. Scheduled notifications (cron jobs):
 *    - Daily low stock alerts at 9:00 AM
 *    - Daily overdue invoice reminders at 10:00 AM
 *
 * All notifications are tenant-scoped and respect the multi-tenant architecture.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly brevoService: BrevoService,
  ) {}

  // ============================================================================
  // DIRECT NOTIFICATION METHODS
  // ============================================================================

  /**
   * Sends a welcome email to a newly registered user.
   *
   * @param user - User data including email and name
   * @returns Send result
   */
  async sendWelcomeEmail(user: WelcomeEmailUser): Promise<SendMailResult> {
    this.logger.debug(`Sending welcome email to ${user.email}`);

    // Get tenant name for personalization
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { name: true },
    });

    const tenantName = tenant?.name || 'Your Organization';
    const userName = `${user.firstName} ${user.lastName}`.trim();

    return this.brevoService.sendWelcomeEmail(user.email, userName, tenantName);
  }

  /**
   * Sends low stock alert emails to all admin users of a tenant.
   *
   * This method:
   * 1. Finds all products where stock < minStock for the tenant
   * 2. Gets all admin users' email addresses
   * 3. Sends a single email with all low stock products
   *
   * @param tenantId - Tenant ID to check for low stock products
   * @returns Send result (or null if no low stock products or no admins)
   */
  async sendLowStockAlert(tenantId: string): Promise<SendMailResult | null> {
    this.logger.debug(`Checking low stock for tenant ${tenantId}`);

    // Get tenant info
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    if (!tenant) {
      this.logger.warn(`Tenant not found: ${tenantId}`);
      return null;
    }

    // Get all products with low stock
    const allProducts = await this.prisma.product.findMany({
      where: { tenantId },
      select: {
        id: true,
        sku: true,
        name: true,
        stock: true,
        minStock: true,
      },
    });

    // Filter products where stock < minStock
    const lowStockProducts = allProducts.filter((p) => p.stock < p.minStock);

    if (lowStockProducts.length === 0) {
      this.logger.debug(`No low stock products found for tenant ${tenantId}`);
      return null;
    }

    this.logger.log(
      `Found ${lowStockProducts.length} low stock products for tenant ${tenantId}`,
    );

    // Get admin users for this tenant
    const adminUsers = await this.prisma.user.findMany({
      where: {
        tenantId,
        role: UserRole.ADMIN,
        status: 'ACTIVE',
      },
      select: { email: true },
    });

    if (adminUsers.length === 0) {
      this.logger.warn(`No admin users found for tenant ${tenantId}`);
      return null;
    }

    const adminEmails = adminUsers.map((u) => u.email);

    return this.brevoService.sendLowStockAlertEmail(
      adminEmails,
      lowStockProducts.map((p) => ({
        sku: p.sku,
        name: p.name,
        currentStock: p.stock,
        minStock: p.minStock,
      })),
      tenant.name,
    );
  }

  /**
   * Sends an email notification when an invoice is sent to a customer.
   *
   * @param invoice - Invoice data
   * @param tenantId - Tenant ID for fetching tenant name
   * @returns Send result (or null if customer has no email)
   */
  async sendInvoiceSentEmail(
    invoice: InvoiceEmailData,
    tenantId: string,
  ): Promise<SendMailResult | null> {
    if (!invoice.customer?.email) {
      this.logger.debug(
        `No customer email for invoice ${invoice.invoiceNumber}`,
      );
      return null;
    }

    this.logger.debug(
      `Sending invoice sent email for ${invoice.invoiceNumber} to ${invoice.customer.email}`,
    );

    // Get tenant name
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    return this.brevoService.sendInvoiceEmail(
      invoice.customer.email,
      invoice.customer.name,
      invoice.invoiceNumber,
      invoice.total,
      invoice.dueDate,
      tenant?.name || 'StockFlow',
    );
  }

  /**
   * Sends an overdue invoice reminder email to the customer.
   *
   * @param invoice - Invoice data with customer information
   * @param tenantId - Tenant ID for fetching tenant name
   * @returns Send result (or null if customer has no email)
   */
  async sendOverdueInvoiceAlert(
    invoice: InvoiceEmailData & { dueDate: Date },
    tenantId: string,
  ): Promise<SendMailResult | null> {
    if (!invoice.customer?.email) {
      this.logger.debug(
        `No customer email for overdue invoice ${invoice.invoiceNumber}`,
      );
      return null;
    }

    const today = new Date();
    const daysOverdue = Math.floor(
      (today.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysOverdue <= 0) {
      this.logger.debug(`Invoice ${invoice.invoiceNumber} is not overdue`);
      return null;
    }

    this.logger.debug(
      `Sending overdue invoice email for ${invoice.invoiceNumber} (${daysOverdue} days overdue)`,
    );

    // Get tenant name
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    return this.brevoService.sendOverdueInvoiceEmail(
      invoice.customer.email,
      invoice.customer.name,
      invoice.invoiceNumber,
      invoice.total,
      invoice.dueDate,
      daysOverdue,
      tenant?.name || 'StockFlow',
    );
  }

  /**
   * Sends a payment received confirmation email to the customer.
   *
   * @param payment - Payment data
   * @param invoice - Invoice data with customer information
   * @param tenantId - Tenant ID for fetching tenant name
   * @returns Send result (or null if customer has no email)
   */
  async sendPaymentReceivedEmail(
    payment: PaymentEmailData,
    invoice: InvoiceEmailData & { totalPaid?: number },
    tenantId: string,
  ): Promise<SendMailResult | null> {
    if (!invoice.customer?.email) {
      this.logger.debug(
        `No customer email for payment on invoice ${invoice.invoiceNumber}`,
      );
      return null;
    }

    this.logger.debug(
      `Sending payment received email for invoice ${invoice.invoiceNumber} to ${invoice.customer.email}`,
    );

    // Get tenant name
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    // Calculate remaining balance
    const totalPaid = (invoice.totalPaid || 0) + payment.amount;
    const remainingBalance = Math.max(0, invoice.total - totalPaid);

    return this.brevoService.sendPaymentReceivedEmail(
      invoice.customer.email,
      invoice.customer.name,
      invoice.invoiceNumber,
      payment.amount,
      payment.method,
      remainingBalance,
      tenant?.name || 'StockFlow',
    );
  }

  // ============================================================================
  // SCHEDULED CRON JOBS
  // ============================================================================

  /**
   * Daily low stock alert job.
   * Runs at 9:00 AM every day.
   *
   * Checks all active tenants for low stock products and sends alerts
   * to their admin users.
   */
  @Cron('0 9 * * *', {
    name: 'daily-low-stock-alert',
    timeZone: 'America/New_York',
  })
  async handleDailyLowStockAlert(): Promise<void> {
    this.logger.log('Running daily low stock alert cron job');

    if (!this.brevoService.isConfigured()) {
      this.logger.debug('Brevo not configured, skipping low stock alerts');
      return;
    }

    try {
      // Get all active tenants
      const tenants = await this.prisma.tenant.findMany({
        where: {
          status: { in: ['ACTIVE', 'TRIAL'] },
        },
        select: { id: true, name: true },
      });

      this.logger.debug(
        `Processing low stock alerts for ${tenants.length} tenants`,
      );

      let alertsSent = 0;

      for (const tenant of tenants) {
        try {
          const result = await this.sendLowStockAlert(tenant.id);
          if (result?.success) {
            alertsSent++;
          }
        } catch (error) {
          this.logger.error(
            `Failed to send low stock alert for tenant ${tenant.id}`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }

      this.logger.log(
        `Daily low stock alert job completed. Alerts sent: ${alertsSent}/${tenants.length}`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to run daily low stock alert job',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Daily overdue invoice reminder job.
   * Runs at 10:00 AM every day.
   *
   * Finds all sent invoices with past due dates and unpaid/partially paid status,
   * then sends reminder emails to the customers.
   */
  @Cron('0 10 * * *', {
    name: 'daily-overdue-invoice-reminder',
    timeZone: 'America/New_York',
  })
  async handleDailyOverdueInvoiceReminder(): Promise<void> {
    this.logger.log('Running daily overdue invoice reminder cron job');

    if (!this.brevoService.isConfigured()) {
      this.logger.debug('Brevo not configured, skipping overdue reminders');
      return;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find all overdue invoices across all active tenants
      const overdueInvoices = await this.prisma.invoice.findMany({
        where: {
          status: InvoiceStatus.SENT,
          paymentStatus: {
            in: [PaymentStatus.UNPAID, PaymentStatus.PARTIALLY_PAID],
          },
          dueDate: {
            lt: today, // Due date is before today
            not: null,
          },
          tenant: {
            status: { in: ['ACTIVE', 'TRIAL'] },
          },
        },
        include: {
          customer: {
            select: {
              name: true,
              email: true,
            },
          },
          tenant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      this.logger.debug(
        `Found ${overdueInvoices.length} overdue invoices to process`,
      );

      let remindersSent = 0;

      for (const invoice of overdueInvoices) {
        if (!invoice.customer?.email || !invoice.dueDate) {
          continue;
        }

        try {
          const result = await this.sendOverdueInvoiceAlert(
            {
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              total: Number(invoice.total),
              dueDate: invoice.dueDate,
              customer: invoice.customer,
            },
            invoice.tenantId,
          );

          if (result?.success) {
            remindersSent++;
          }
        } catch (error) {
          this.logger.error(
            `Failed to send overdue reminder for invoice ${invoice.invoiceNumber}`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }

      this.logger.log(
        `Daily overdue invoice reminder job completed. Reminders sent: ${remindersSent}/${overdueInvoices.length}`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to run daily overdue invoice reminder job',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  // ============================================================================
  // MANUAL TRIGGER METHODS (for testing or admin actions)
  // ============================================================================

  /**
   * Manually triggers the low stock alert for a specific tenant.
   * Useful for testing or admin-triggered alerts.
   *
   * @param tenantId - Tenant ID to check
   * @returns Send result or null
   */
  async triggerLowStockAlert(tenantId: string): Promise<SendMailResult | null> {
    this.logger.log(
      `Manually triggering low stock alert for tenant ${tenantId}`,
    );
    return this.sendLowStockAlert(tenantId);
  }

  /**
   * Manually triggers overdue invoice reminders for a specific tenant.
   * Useful for testing or admin-triggered reminders.
   *
   * @param tenantId - Tenant ID to process
   * @returns Array of send results
   */
  async triggerOverdueReminders(
    tenantId: string,
  ): Promise<Array<SendMailResult | null>> {
    this.logger.log(
      `Manually triggering overdue reminders for tenant ${tenantId}`,
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: InvoiceStatus.SENT,
        paymentStatus: {
          in: [PaymentStatus.UNPAID, PaymentStatus.PARTIALLY_PAID],
        },
        dueDate: {
          lt: today,
          not: null,
        },
      },
      include: {
        customer: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    const results: Array<SendMailResult | null> = [];

    for (const invoice of overdueInvoices) {
      if (!invoice.dueDate) continue;

      const result = await this.sendOverdueInvoiceAlert(
        {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          total: Number(invoice.total),
          dueDate: invoice.dueDate,
          customer: invoice.customer,
        },
        tenantId,
      );

      results.push(result);
    }

    return results;
  }

  /**
   * Gets the list of low stock products for a tenant without sending emails.
   * Useful for preview/debugging.
   *
   * @param tenantId - Tenant ID to check
   * @returns Array of low stock products
   */
  async getLowStockProducts(tenantId: string): Promise<LowStockProduct[]> {
    const products = await this.prisma.product.findMany({
      where: { tenantId },
      select: {
        id: true,
        sku: true,
        name: true,
        stock: true,
        minStock: true,
      },
    });

    return products.filter((p) => p.stock < p.minStock);
  }
}
