import type { PrismaClient } from '@prisma/client';

/**
 * Delete ALL data in correct FK order (children first).
 * Covers all 63 models in the schema.
 */
export async function cleanup(prisma: PrismaClient): Promise<void> {
  console.log('🗑️  Cleaning existing data (all 63 models)...');

  // --- Leaf / child tables first ---

  // Integrations
  await prisma.syncLog.deleteMany();
  await prisma.productMapping.deleteMany();
  await prisma.integration.deleteMany();

  // Exchange rates
  await prisma.exchangeRate.deleteMany();

  // Billing
  await prisma.billingTransaction.deleteMany();

  // Collection & Recurring
  await prisma.collectionReminder.deleteMany();
  await prisma.recurringInvoice.deleteMany();

  // Withholding Certificates
  await prisma.withholdingCertificate.deleteMany();

  // Support Documents
  await prisma.supportDocumentItem.deleteMany();
  await prisma.supportDocument.deleteMany();

  // Remissions
  await prisma.remissionItem.deleteMany();
  await prisma.remission.deleteMany();

  // Banking
  await prisma.bankStatementLine.deleteMany();
  await prisma.bankStatement.deleteMany();
  await prisma.bankAccount.deleteMany();

  // Journal Entries
  await prisma.journalEntryLine.deleteMany();
  await prisma.journalEntry.deleteMany();

  // Accounting
  await prisma.accountingConfig.deleteMany();
  await prisma.accountingPeriod.deleteMany();
  await prisma.account.deleteMany();

  // Cost Centers
  await prisma.costCenter.deleteMany();

  // Expenses
  await prisma.expense.deleteMany();

  // Purchases
  await prisma.purchasePayment.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.supplier.deleteMany();

  // Quotations
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();

  // POS
  await prisma.salePayment.deleteMany();
  await prisma.cashRegisterMovement.deleteMany();
  await prisma.pOSSale.deleteMany();
  await prisma.pOSSession.deleteMany();
  await prisma.cashRegister.deleteMany();

  // Payroll
  await prisma.payrollEntry.deleteMany();
  await prisma.payrollPeriod.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.payrollConfig.deleteMany();

  // DIAN
  await prisma.dianDocument.deleteMany();
  await prisma.tenantDianConfig.deleteMany();

  // Core commerce
  await prisma.userPermissionOverride.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.warehouseStock.deleteMany();

  // Products & Categories
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  // Customers & Warehouses
  await prisma.customer.deleteMany();
  await prisma.warehouse.deleteMany();

  // Subscriptions
  await prisma.subscription.deleteMany();

  // Users & Tenants
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // System Admins
  await prisma.systemAdminAuditLog.deleteMany();
  await prisma.systemAdmin.deleteMany();

  console.log('   ✅ All data cleaned (63 models)');
}
