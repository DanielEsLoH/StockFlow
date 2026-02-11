import type {
  TDocumentDefinitions,
  Content,
  TableCell,
} from 'pdfmake/interfaces';

/**
 * Invoice data structure for PDF generation
 */
export interface InvoiceTemplateData {
  // Tenant / Issuer info
  tenant: {
    name: string;
    email: string;
    phone?: string | null;
    businessName?: string | null;
    nit?: string | null;
    dv?: string | null;
    address?: string | null;
    city?: string | null;
    resolutionNumber?: string | null;
    resolutionPrefix?: string | null;
    resolutionRangeFrom?: number | null;
    resolutionRangeTo?: number | null;
    resolutionDate?: Date | null;
  };
  // Invoice info
  invoice: {
    invoiceNumber: string;
    issueDate: Date;
    dueDate?: Date | null;
    status: string;
    paymentStatus: string;
    notes?: string | null;
    dianCufe?: string | null;
  };
  // Customer info
  customer?: {
    name: string;
    email?: string | null;
    phone?: string | null;
    documentType: string;
    documentNumber: string;
    address?: string | null;
    city?: string | null;
  } | null;
  // Invoice items
  items: Array<{
    productName: string;
    productSku: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    discount: number;
    subtotal: number;
    tax: number;
    total: number;
  }>;
  // Totals
  totals: {
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
  };
}

/**
 * Formats a number as currency (Colombian Pesos)
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formats a date in Spanish locale
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

/**
 * Translates invoice status to Spanish
 */
function translateStatus(status: string): string {
  const translations: Record<string, string> = {
    DRAFT: 'Borrador',
    PENDING: 'Pendiente',
    SENT: 'Enviada',
    OVERDUE: 'Vencida',
    CANCELLED: 'Cancelada',
    VOID: 'Anulada',
  };
  return translations[status] || status;
}

/**
 * Translates payment status to Spanish
 */
function translatePaymentStatus(status: string): string {
  const translations: Record<string, string> = {
    UNPAID: 'Sin pagar',
    PARTIALLY_PAID: 'Pago parcial',
    PAID: 'Pagada',
  };
  return translations[status] || status;
}

/**
 * Creates a PDF document definition for an invoice
 */
export function createInvoiceTemplate(
  data: InvoiceTemplateData,
): TDocumentDefinitions {
  const content: Content[] = [];

  const hasDianConfig = !!data.tenant.nit;
  const companyName = data.tenant.businessName || data.tenant.name;

  // Header with company info and invoice details
  const companyStack: Content[] = [
    { text: companyName, style: 'companyName' },
  ];
  if (data.tenant.nit) {
    companyStack.push({
      text: `NIT: ${data.tenant.nit}-${data.tenant.dv || ''}`,
      style: 'companyInfo',
    });
  }
  if (data.tenant.address) {
    companyStack.push({
      text: `${data.tenant.address}${data.tenant.city ? `, ${data.tenant.city}` : ''}`,
      style: 'companyInfo',
    });
  }
  if (data.tenant.phone) {
    companyStack.push({
      text: `Tel: ${data.tenant.phone}`,
      style: 'companyInfo',
    });
  }
  companyStack.push({ text: data.tenant.email, style: 'companyInfo' });

  const invoiceStack: Content[] = [
    {
      text: hasDianConfig
        ? 'FACTURA ELECTRÓNICA DE VENTA'
        : 'FACTURA',
      style: 'invoiceTitle',
    },
    { text: data.invoice.invoiceNumber, style: 'invoiceNumber' },
    {
      text: `Fecha: ${formatDate(data.invoice.issueDate)}`,
      style: 'invoiceInfo',
    },
  ];
  if (data.invoice.dueDate) {
    invoiceStack.push({
      text: `Vence: ${formatDate(data.invoice.dueDate)}`,
      style: 'invoiceInfo',
    });
  }
  invoiceStack.push(
    {
      text: `Estado: ${translateStatus(data.invoice.status)}`,
      style: 'invoiceInfo',
    },
    {
      text: `Pago: ${translatePaymentStatus(data.invoice.paymentStatus)}`,
      style: 'invoiceInfo',
    },
  );

  content.push({
    columns: [
      { width: '*', stack: companyStack },
      {
        width: 'auto',
        alignment: 'right' as const,
        stack: invoiceStack,
      },
    ],
  });

  // Resolution info
  if (data.tenant.resolutionNumber) {
    let resText = `Resolución DIAN No. ${data.tenant.resolutionNumber}`;
    if (data.tenant.resolutionDate) {
      resText += ` del ${formatDate(data.tenant.resolutionDate)}`;
    }
    if (data.tenant.resolutionPrefix) {
      resText += `, Prefijo ${data.tenant.resolutionPrefix}`;
    }
    if (
      data.tenant.resolutionRangeFrom != null &&
      data.tenant.resolutionRangeTo != null
    ) {
      resText += `, del ${data.tenant.resolutionRangeFrom} al ${data.tenant.resolutionRangeTo}`;
    }
    content.push({
      text: resText,
      style: 'resolution',
      margin: [0, 5, 0, 0],
    });
  }

  // Divider
  content.push({
    canvas: [
      {
        type: 'line',
        x1: 0,
        y1: 10,
        x2: 515,
        y2: 10,
        lineWidth: 1,
        lineColor: '#cccccc',
      },
    ],
  });

  // Customer info
  if (data.customer) {
    content.push({
      margin: [0, 15, 0, 0],
      stack: [
        { text: 'CLIENTE', style: 'sectionTitle' },
        { text: data.customer.name, style: 'customerName' },
        {
          text: `${data.customer.documentType}: ${data.customer.documentNumber}`,
          style: 'customerInfo',
        },
        data.customer.email
          ? { text: data.customer.email, style: 'customerInfo' }
          : { text: '', style: 'customerInfo' },
        data.customer.phone
          ? { text: `Tel: ${data.customer.phone}`, style: 'customerInfo' }
          : { text: '', style: 'customerInfo' },
        data.customer.address
          ? { text: data.customer.address, style: 'customerInfo' }
          : { text: '', style: 'customerInfo' },
        data.customer.city
          ? { text: data.customer.city, style: 'customerInfo' }
          : { text: '', style: 'customerInfo' },
      ],
    });
  }

  // Items table
  const itemsTableBody: TableCell[][] = [
    // Header row
    [
      { text: 'Producto', style: 'tableHeader' },
      { text: 'SKU', style: 'tableHeader' },
      { text: 'Cant.', style: 'tableHeader', alignment: 'right' },
      { text: 'P. Unit.', style: 'tableHeader', alignment: 'right' },
      { text: 'IVA %', style: 'tableHeader', alignment: 'right' },
      { text: 'Desc.', style: 'tableHeader', alignment: 'right' },
      { text: 'Total', style: 'tableHeader', alignment: 'right' },
    ],
  ];

  // Item rows
  for (const item of data.items) {
    itemsTableBody.push([
      { text: item.productName, style: 'tableCell' },
      { text: item.productSku, style: 'tableCell' },
      {
        text: item.quantity.toString(),
        style: 'tableCell',
        alignment: 'right',
      },
      {
        text: formatCurrency(item.unitPrice),
        style: 'tableCell',
        alignment: 'right',
      },
      { text: `${item.taxRate}%`, style: 'tableCell', alignment: 'right' },
      {
        text: formatCurrency(item.discount),
        style: 'tableCell',
        alignment: 'right',
      },
      {
        text: formatCurrency(item.total),
        style: 'tableCell',
        alignment: 'right',
      },
    ]);
  }

  content.push({
    margin: [0, 20, 0, 0],
    table: {
      headerRows: 1,
      widths: ['*', 60, 40, 70, 40, 60, 70],
      body: itemsTableBody,
    },
    layout: {
      hLineWidth: (i: number, node: { table: { body: unknown[] } }) => {
        if (i === 0 || i === node.table.body.length) return 1;
        return i === 1 ? 1 : 0.5;
      },
      vLineWidth: () => 0,
      hLineColor: (i: number) => (i === 1 ? '#333333' : '#cccccc'),
      paddingLeft: () => 5,
      paddingRight: () => 5,
      paddingTop: () => 5,
      paddingBottom: () => 5,
    },
  });

  // Totals section
  content.push({
    margin: [0, 20, 0, 0],
    columns: [
      { width: '*', text: '' },
      {
        width: 'auto',
        table: {
          body: [
            [
              { text: 'Subtotal:', style: 'totalsLabel', alignment: 'right' },
              {
                text: formatCurrency(data.totals.subtotal),
                style: 'totalsValue',
                alignment: 'right',
              },
            ],
            [
              { text: 'IVA:', style: 'totalsLabel', alignment: 'right' },
              {
                text: formatCurrency(data.totals.tax),
                style: 'totalsValue',
                alignment: 'right',
              },
            ],
            [
              { text: 'Descuento:', style: 'totalsLabel', alignment: 'right' },
              {
                text: formatCurrency(data.totals.discount),
                style: 'totalsValue',
                alignment: 'right',
              },
            ],
            [
              { text: 'TOTAL:', style: 'totalLabel', alignment: 'right' },
              {
                text: formatCurrency(data.totals.total),
                style: 'totalValue',
                alignment: 'right',
              },
            ],
          ],
        },
        layout: 'noBorders',
      },
    ],
  });

  // Notes section
  if (data.invoice.notes) {
    content.push({
      margin: [0, 30, 0, 0],
      stack: [
        { text: 'NOTAS', style: 'sectionTitle' },
        { text: data.invoice.notes, style: 'notes' },
      ],
    });
  }

  // CUFE section (if electronic invoice)
  if (data.invoice.dianCufe) {
    content.push({
      margin: [0, 20, 0, 0],
      stack: [
        { text: 'CUFE', style: 'sectionTitle' },
        {
          text: data.invoice.dianCufe,
          fontSize: 7,
          color: '#666666',
          font: 'Courier',
        },
      ],
    });
  }

  // Footer
  content.push({
    margin: [0, 40, 0, 0],
    text: `Documento generado el ${formatDate(new Date())}`,
    style: 'footer',
    alignment: 'center',
  });

  return {
    pageSize: 'LETTER',
    pageMargins: [40, 40, 40, 40],
    content,
    styles: {
      companyName: {
        fontSize: 18,
        bold: true,
        color: '#333333',
      },
      companyInfo: {
        fontSize: 10,
        color: '#666666',
        margin: [0, 2, 0, 0],
      },
      invoiceTitle: {
        fontSize: 24,
        bold: true,
        color: '#2563eb',
      },
      invoiceNumber: {
        fontSize: 14,
        bold: true,
        color: '#333333',
        margin: [0, 5, 0, 5],
      },
      invoiceInfo: {
        fontSize: 10,
        color: '#666666',
        margin: [0, 2, 0, 0],
      },
      sectionTitle: {
        fontSize: 11,
        bold: true,
        color: '#333333',
        margin: [0, 0, 0, 5],
      },
      customerName: {
        fontSize: 12,
        bold: true,
        color: '#333333',
      },
      customerInfo: {
        fontSize: 10,
        color: '#666666',
        margin: [0, 2, 0, 0],
      },
      tableHeader: {
        fontSize: 10,
        bold: true,
        color: '#333333',
        fillColor: '#f3f4f6',
      },
      tableCell: {
        fontSize: 9,
        color: '#333333',
      },
      totalsLabel: {
        fontSize: 10,
        color: '#666666',
      },
      totalsValue: {
        fontSize: 10,
        color: '#333333',
      },
      totalLabel: {
        fontSize: 12,
        bold: true,
        color: '#333333',
      },
      totalValue: {
        fontSize: 12,
        bold: true,
        color: '#2563eb',
      },
      notes: {
        fontSize: 10,
        color: '#666666',
        italics: true,
      },
      resolution: {
        fontSize: 8,
        color: '#666666',
        italics: true,
      },
      footer: {
        fontSize: 8,
        color: '#999999',
      },
    },
  };
}
