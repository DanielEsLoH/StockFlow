import { api } from '~/lib/api';
import type {
  Invoice,
  InvoiceSummary,
  InvoiceItem,
  InvoiceFilters,
  InvoicesResponse,
  CreateInvoiceData,
  UpdateInvoiceData,
  CreateInvoiceItemData,
  UpdateInvoiceItemData,
  InvoiceStats,
  InvoiceStatus,
} from '~/types/invoice';
import type { Customer } from '~/types/customer';

// Mock customers (simplified)
const mockCustomers: Customer[] = [
  {
    id: '1',
    name: 'Juan Carlos Perez',
    email: 'jcperez@email.com',
    phone: '+57 300 123 4567',
    document: '1234567890',
    documentType: 'CC',
    type: 'INDIVIDUAL',
    address: 'Calle 80 #45-12',
    city: 'Bogota',
    isActive: true,
    createdAt: '2023-06-15T10:00:00Z',
    updatedAt: '2024-01-10T15:30:00Z',
  },
  {
    id: '2',
    name: 'Distribuidora ABC S.A.S',
    email: 'compras@distribuidoraabc.com',
    phone: '+57 1 234 5678',
    document: '900123456-7',
    documentType: 'NIT',
    type: 'BUSINESS',
    address: 'Zona Industrial, Bodega 15',
    city: 'Medellin',
    isActive: true,
    createdAt: '2023-03-01T09:00:00Z',
    updatedAt: '2024-01-09T12:00:00Z',
  },
  {
    id: '3',
    name: 'Maria Elena Garcia',
    email: 'mgarcia@gmail.com',
    phone: '+57 310 987 6543',
    document: '52345678',
    documentType: 'CC',
    type: 'INDIVIDUAL',
    address: 'Carrera 15 #98-45, Apto 301',
    city: 'Bogota',
    isActive: true,
    createdAt: '2023-09-20T14:00:00Z',
    updatedAt: '2024-01-05T17:00:00Z',
  },
  {
    id: '4',
    name: 'Tech Solutions Ltda',
    email: 'admin@techsolutions.co',
    phone: '+57 2 345 6789',
    document: '800456789-1',
    documentType: 'NIT',
    type: 'BUSINESS',
    address: 'Centro Empresarial, Oficina 502',
    city: 'Cali',
    isActive: true,
    createdAt: '2023-05-10T11:00:00Z',
    updatedAt: '2024-01-08T10:00:00Z',
  },
  {
    id: '5',
    name: 'Roberto Andres Martinez',
    email: 'rmartinez@hotmail.com',
    phone: '+57 315 555 1234',
    document: '80123456',
    documentType: 'CC',
    type: 'INDIVIDUAL',
    address: 'Avenida 68 #12-34',
    city: 'Bogota',
    isActive: true,
    createdAt: '2023-07-25T16:00:00Z',
    updatedAt: '2024-01-02T09:00:00Z',
  },
];

// Helper to create InvoiceItem
function createItem(
  id: string,
  invoiceId: string,
  productId: string,
  description: string,
  quantity: number,
  unitPrice: number,
  discount: number,
  tax: number,
  createdAt: string
): InvoiceItem {
  const subtotal = quantity * unitPrice * (1 - discount / 100);
  const total = subtotal * (1 + tax / 100);
  return {
    id,
    invoiceId,
    productId,
    description,
    quantity,
    unitPrice,
    discount,
    tax,
    subtotal,
    total,
    createdAt,
    updatedAt: createdAt,
  };
}

// Mock data for development
// Exported for testing purposes
export const mockInvoices: Invoice[] = [
  {
    id: '1',
    invoiceNumber: 'FAC-2024-0001',
    customerId: '1',
    customer: mockCustomers[0],
    status: 'PAID',
    issueDate: '2024-01-05T10:00:00Z',
    dueDate: '2024-01-20T10:00:00Z',
    paidAt: '2024-01-18T14:30:00Z',
    items: [
      createItem('1-1', '1', 'prod-1', 'iPhone 15 Pro Max', 1, 5999000, 0, 19, '2024-01-05T10:00:00Z'),
      createItem('1-2', '1', 'prod-4', 'AirPods Pro 2', 1, 1099000, 0, 19, '2024-01-05T10:00:00Z'),
    ],
    subtotal: 7098000,
    taxAmount: 1348620,
    discountAmount: 0,
    total: 8446620,
    notes: 'Pago realizado por transferencia bancaria',
    createdAt: '2024-01-05T10:00:00Z',
    updatedAt: '2024-01-18T14:30:00Z',
  },
  {
    id: '2',
    invoiceNumber: 'FAC-2024-0002',
    customerId: '2',
    customer: mockCustomers[1],
    status: 'PENDING',
    issueDate: '2024-01-10T09:00:00Z',
    dueDate: '2024-02-10T09:00:00Z',
    items: [
      createItem('2-1', '2', 'prod-2', 'MacBook Air M3', 3, 4599000, 0, 19, '2024-01-10T09:00:00Z'),
      createItem('2-2', '2', 'prod-5', 'iPad Pro 12.9" M2', 2, 5299000, 0, 19, '2024-01-10T09:00:00Z'),
      createItem('2-3', '2', 'prod-6', 'Monitor Dell 27" 4K', 1, 2799000, 0, 19, '2024-01-10T09:00:00Z'),
    ],
    subtotal: 27595000,
    taxAmount: 5243050,
    discountAmount: 500000,
    total: 32338050,
    notes: 'Pedido mayorista - credito 30 dias',
    createdAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-01-10T09:00:00Z',
  },
  {
    id: '3',
    invoiceNumber: 'FAC-2024-0003',
    customerId: '3',
    customer: mockCustomers[2],
    status: 'OVERDUE',
    issueDate: '2023-12-15T14:00:00Z',
    dueDate: '2023-12-30T14:00:00Z',
    items: [
      createItem('3-1', '3', 'prod-11', 'Sony WH-1000XM5', 1, 1699000, 0, 19, '2023-12-15T14:00:00Z'),
    ],
    subtotal: 1699000,
    taxAmount: 322810,
    discountAmount: 0,
    total: 2021810,
    notes: 'URGENTE: Factura vencida, contactar cliente',
    createdAt: '2023-12-15T14:00:00Z',
    updatedAt: '2024-01-02T09:00:00Z',
  },
  {
    id: '4',
    invoiceNumber: 'FAC-2024-0004',
    customerId: '4',
    customer: mockCustomers[3],
    status: 'PAID',
    issueDate: '2024-01-08T11:00:00Z',
    dueDate: '2024-01-23T11:00:00Z',
    paidAt: '2024-01-12T16:45:00Z',
    items: [
      createItem('4-1', '4', 'prod-7', 'Teclado Logitech MX Keys', 5, 549000, 0, 19, '2024-01-08T11:00:00Z'),
      createItem('4-2', '4', 'prod-8', 'Mouse Logitech MX Master 3S', 4, 449000, 0, 19, '2024-01-08T11:00:00Z'),
    ],
    subtotal: 4541000,
    taxAmount: 862790,
    discountAmount: 100000,
    total: 5303790,
    notes: 'Equipos para oficina - pago anticipado',
    createdAt: '2024-01-08T11:00:00Z',
    updatedAt: '2024-01-12T16:45:00Z',
  },
  {
    id: '5',
    invoiceNumber: 'FAC-2024-0005',
    customerId: '5',
    customer: mockCustomers[4],
    status: 'CANCELLED',
    issueDate: '2024-01-02T10:00:00Z',
    dueDate: '2024-01-17T10:00:00Z',
    items: [
      createItem('5-1', '5', 'prod-10', 'Cafetera Nespresso Vertuo', 1, 899000, 0, 19, '2024-01-02T10:00:00Z'),
    ],
    subtotal: 899000,
    taxAmount: 170810,
    discountAmount: 0,
    total: 1069810,
    notes: 'Cancelada por solicitud del cliente',
    createdAt: '2024-01-02T10:00:00Z',
    updatedAt: '2024-01-03T09:15:00Z',
  },
  {
    id: '6',
    invoiceNumber: 'FAC-2024-0006',
    customerId: '1',
    customer: mockCustomers[0],
    status: 'DRAFT',
    issueDate: '2024-01-14T08:00:00Z',
    dueDate: '2024-01-29T08:00:00Z',
    items: [
      createItem('6-1', '6', 'prod-12', 'Nintendo Switch OLED', 2, 1799000, 0, 19, '2024-01-14T08:00:00Z'),
    ],
    subtotal: 3598000,
    taxAmount: 683620,
    discountAmount: 0,
    total: 4281620,
    notes: 'Borrador - pendiente confirmacion de cliente',
    createdAt: '2024-01-14T08:00:00Z',
    updatedAt: '2024-01-14T08:00:00Z',
  },
  {
    id: '7',
    invoiceNumber: 'FAC-2024-0007',
    customerId: '2',
    customer: mockCustomers[1],
    status: 'PAID',
    issueDate: '2023-12-20T15:00:00Z',
    dueDate: '2024-01-20T15:00:00Z',
    paidAt: '2024-01-15T10:00:00Z',
    items: [
      createItem('7-1', '7', 'prod-1', 'iPhone 15 Pro Max', 3, 5999000, 0, 19, '2023-12-20T15:00:00Z'),
    ],
    subtotal: 17997000,
    taxAmount: 3419430,
    discountAmount: 250000,
    total: 21166430,
    notes: 'Pedido navidad - pagado completo',
    createdAt: '2023-12-20T15:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '8',
    invoiceNumber: 'FAC-2024-0008',
    customerId: '4',
    customer: mockCustomers[3],
    status: 'PENDING',
    issueDate: '2024-01-12T14:00:00Z',
    dueDate: '2024-01-27T14:00:00Z',
    items: [
      createItem('8-1', '8', 'prod-3', 'Samsung Galaxy S24 Ultra', 2, 4999000, 0, 19, '2024-01-12T14:00:00Z'),
    ],
    subtotal: 9998000,
    taxAmount: 1899620,
    discountAmount: 0,
    total: 11897620,
    notes: 'Compra de smartphones para equipo de ventas',
    createdAt: '2024-01-12T14:00:00Z',
    updatedAt: '2024-01-12T14:00:00Z',
  },
  {
    id: '9',
    invoiceNumber: 'FAC-2024-0009',
    customerId: '3',
    customer: mockCustomers[2],
    status: 'PAID',
    issueDate: '2024-01-11T16:00:00Z',
    dueDate: '2024-01-26T16:00:00Z',
    paidAt: '2024-01-11T16:30:00Z',
    items: [
      createItem('9-1', '9', 'prod-7', 'Teclado Logitech MX Keys', 1, 549000, 0, 19, '2024-01-11T16:00:00Z'),
      createItem('9-2', '9', 'prod-8', 'Mouse Logitech MX Master 3S', 1, 449000, 0, 19, '2024-01-11T16:00:00Z'),
    ],
    subtotal: 998000,
    taxAmount: 189620,
    discountAmount: 50000,
    total: 1137620,
    notes: 'Pago en efectivo en tienda',
    createdAt: '2024-01-11T16:00:00Z',
    updatedAt: '2024-01-11T16:30:00Z',
  },
  {
    id: '10',
    invoiceNumber: 'FAC-2024-0010',
    customerId: '5',
    customer: mockCustomers[4],
    status: 'OVERDUE',
    issueDate: '2023-11-25T09:00:00Z',
    dueDate: '2023-12-10T09:00:00Z',
    items: [
      createItem('10-1', '10', 'prod-2', 'MacBook Air M3', 1, 4599000, 0, 19, '2023-11-25T09:00:00Z'),
    ],
    subtotal: 4599000,
    taxAmount: 873810,
    discountAmount: 0,
    total: 5472810,
    notes: 'VENCIDA - multiples intentos de contacto sin respuesta',
    createdAt: '2023-11-25T09:00:00Z',
    updatedAt: '2024-01-05T11:00:00Z',
  },
];

// Convert Invoice to InvoiceSummary for list responses
function toInvoiceSummary(invoice: Invoice): InvoiceSummary {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    customerId: invoice.customerId,
    customer: invoice.customer,
    status: invoice.status,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    paidAt: invoice.paidAt,
    itemCount: invoice.items?.length || 0,
    subtotal: invoice.subtotal,
    taxAmount: invoice.taxAmount,
    discountAmount: invoice.discountAmount,
    total: invoice.total,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
  };
}

// Helper function to filter invoices
function filterInvoices(
  invoices: Invoice[],
  filters: InvoiceFilters
): InvoicesResponse {
  let filtered = [...invoices];

  // Search filter (invoice number, customer name, customer email)
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(
      (invoice) =>
        invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
        invoice.customer?.name.toLowerCase().includes(searchLower) ||
        invoice.customer?.email?.toLowerCase().includes(searchLower) ||
        invoice.customer?.document?.toLowerCase().includes(searchLower)
    );
  }

  // Status filter
  if (filters.status) {
    filtered = filtered.filter((invoice) => invoice.status === filters.status);
  }

  // Customer ID filter
  if (filters.customerId) {
    filtered = filtered.filter(
      (invoice) => invoice.customerId === filters.customerId
    );
  }

  // Date range filter (issue date)
  if (filters.startDate) {
    const startDate = new Date(filters.startDate);
    filtered = filtered.filter(
      (invoice) => new Date(invoice.issueDate) >= startDate
    );
  }
  if (filters.endDate) {
    const endDate = new Date(filters.endDate);
    filtered = filtered.filter(
      (invoice) => new Date(invoice.issueDate) <= endDate
    );
  }

  // Amount range filter
  if (filters.minAmount !== undefined) {
    filtered = filtered.filter((invoice) => invoice.total >= filters.minAmount!);
  }
  if (filters.maxAmount !== undefined) {
    filtered = filtered.filter((invoice) => invoice.total <= filters.maxAmount!);
  }

  // Sorting
  const sortBy = filters.sortBy || 'issueDate';
  const sortOrder = filters.sortOrder || 'desc';
  filtered.sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortBy) {
      case 'invoiceNumber':
        aValue = a.invoiceNumber;
        bValue = b.invoiceNumber;
        break;
      case 'total':
        aValue = a.total;
        bValue = b.total;
        break;
      case 'issueDate':
        aValue = new Date(a.issueDate).getTime();
        bValue = new Date(b.issueDate).getTime();
        break;
      case 'dueDate':
        aValue = new Date(a.dueDate).getTime();
        bValue = new Date(b.dueDate).getTime();
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'customerName':
        aValue = a.customer?.name || '';
        bValue = b.customer?.name || '';
        break;
      default:
        aValue = new Date(a.issueDate).getTime();
        bValue = new Date(b.issueDate).getTime();
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
    const comparison = String(aValue).localeCompare(String(bValue));
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Pagination
  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedData = filtered.slice(startIndex, endIndex);

  return {
    data: paginatedData.map(toInvoiceSummary),
    meta: {
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
    },
  };
}

// Helper to generate next invoice number
// Exported for testing purposes
export function generateInvoiceNumber(invoices: { invoiceNumber: string }[] = mockInvoices): string {
  const year = new Date().getFullYear();
  const maxNumber = invoices.reduce((max, invoice) => {
    const match = invoice.invoiceNumber.match(/FAC-\d{4}-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > max ? num : max;
    }
    return max;
  }, 0);
  return `FAC-${year}-${String(maxNumber + 1).padStart(4, '0')}`;
}

// Helper to calculate invoice totals from items
function calculateInvoiceTotals(
  items: InvoiceItem[],
  discountAmount: number = 0
): { subtotal: number; taxAmount: number; total: number } {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const taxAmount = items.reduce((sum, item) => sum + (item.total - item.subtotal), 0);
  const total = subtotal + taxAmount - discountAmount;
  return { subtotal, taxAmount, total };
}

// Service
export const invoicesService = {
  // Get paginated invoices with filters
  async getInvoices(filters: InvoiceFilters = {}): Promise<InvoicesResponse> {
    // In production, uncomment this:
    // const params = new URLSearchParams();
    // Object.entries(filters).forEach(([key, value]) => {
    //   if (value !== undefined && value !== null) {
    //     params.append(key, String(value));
    //   }
    // });
    // const { data } = await api.get<InvoicesResponse>(`/invoices?${params.toString()}`);
    // return data;

    // Mock data for development
    await new Promise((resolve) => setTimeout(resolve, 400));
    return filterInvoices(mockInvoices, filters);
  },

  // Get single invoice by ID
  async getInvoice(id: string): Promise<Invoice> {
    // In production, uncomment this:
    // const { data } = await api.get<Invoice>(`/invoices/${id}`);
    // return data;

    // Mock data for development
    await new Promise((resolve) => setTimeout(resolve, 300));
    const invoice = mockInvoices.find((inv) => inv.id === id);
    if (!invoice) {
      throw new Error('Factura no encontrada');
    }
    return invoice;
  },

  // Get invoices by customer ID
  async getInvoicesByCustomer(customerId: string): Promise<Invoice[]> {
    // In production, uncomment this:
    // const { data } = await api.get<Invoice[]>(`/invoices/customer/${customerId}`);
    // return data;

    // Mock data for development
    await new Promise((resolve) => setTimeout(resolve, 350));
    return mockInvoices.filter((inv) => inv.customerId === customerId);
  },

  // Get recent invoices for dashboard
  async getRecentInvoices(limit: number = 5): Promise<Invoice[]> {
    // In production, uncomment this:
    // const { data } = await api.get<Invoice[]>(`/invoices/recent?limit=${limit}`);
    // return data;

    // Mock data for development
    await new Promise((resolve) => setTimeout(resolve, 300));
    return [...mockInvoices]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, limit);
  },

  // Create new invoice
  async createInvoice(data: CreateInvoiceData): Promise<Invoice> {
    // In production, uncomment this:
    // const { data: newInvoice } = await api.post<Invoice>('/invoices', data);
    // return newInvoice;

    // Mock data for development
    await new Promise((resolve) => setTimeout(resolve, 500));

    const invoiceNumber = generateInvoiceNumber();
    const now = new Date().toISOString();
    const newId = Math.random().toString(36).substring(2, 9);

    // Create items with proper calculations
    const items: InvoiceItem[] = data.items.map((item, index) => {
      const discount = item.discount || 0;
      const tax = item.tax || 19;
      const subtotal = item.quantity * item.unitPrice * (1 - discount / 100);
      const total = subtotal * (1 + tax / 100);
      return {
        id: `${newId}-${index + 1}`,
        invoiceId: newId,
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount,
        tax,
        subtotal,
        total,
        createdAt: now,
        updatedAt: now,
      };
    });

    const { subtotal, taxAmount, total } = calculateInvoiceTotals(items, 0);

    // Find customer
    const customer = mockCustomers.find((c) => c.id === data.customerId);

    const newInvoice: Invoice = {
      id: newId,
      invoiceNumber,
      customerId: data.customerId,
      customer,
      status: data.status || 'DRAFT',
      issueDate: data.issueDate || now,
      dueDate: data.dueDate,
      items,
      subtotal,
      taxAmount,
      discountAmount: 0,
      total,
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
    };

    mockInvoices.unshift(newInvoice);
    return newInvoice;
  },

  // Update invoice
  async updateInvoice(id: string, data: UpdateInvoiceData): Promise<Invoice> {
    // In production, uncomment this:
    // const { data: updated } = await api.patch<Invoice>(`/invoices/${id}`, data);
    // return updated;

    // Mock data for development
    await new Promise((resolve) => setTimeout(resolve, 400));

    const index = mockInvoices.findIndex((inv) => inv.id === id);
    if (index === -1) {
      throw new Error('Factura no encontrada');
    }

    const currentInvoice = mockInvoices[index];

    // Don't allow updates to paid or cancelled invoices
    if (currentInvoice.status === 'PAID' || currentInvoice.status === 'CANCELLED') {
      throw new Error('No se puede modificar una factura pagada o cancelada');
    }

    // Update customer if customerId changed
    let customer = currentInvoice.customer;
    if (data.customerId && data.customerId !== currentInvoice.customerId) {
      customer = mockCustomers.find((c) => c.id === data.customerId);
    }

    // Recalculate items if provided
    let items = currentInvoice.items;
    let totals = {
      subtotal: currentInvoice.subtotal,
      taxAmount: currentInvoice.taxAmount,
      total: currentInvoice.total,
    };

    if (data.items) {
      const now = new Date().toISOString();
      items = data.items.map((item, idx) => {
        const existing = currentInvoice.items.find((i) => i.id === item.id);
        const discount = item.discount ?? existing?.discount ?? 0;
        const tax = item.tax ?? existing?.tax ?? 19;
        const quantity = item.quantity ?? existing?.quantity ?? 1;
        const unitPrice = item.unitPrice ?? existing?.unitPrice ?? 0;
        const subtotal = quantity * unitPrice * (1 - discount / 100);
        const itemTotal = subtotal * (1 + tax / 100);

        return {
          id: item.id || `${id}-${idx + 1}`,
          invoiceId: id,
          productId: item.productId || existing?.productId || '',
          description: item.description || existing?.description || '',
          quantity,
          unitPrice,
          discount,
          tax,
          subtotal,
          total: itemTotal,
          createdAt: existing?.createdAt || now,
          updatedAt: now,
        };
      });

      totals = calculateInvoiceTotals(items, currentInvoice.discountAmount);
    }

    mockInvoices[index] = {
      ...currentInvoice,
      customerId: data.customerId ?? currentInvoice.customerId,
      customer,
      status: data.status ?? currentInvoice.status,
      issueDate: data.issueDate ?? currentInvoice.issueDate,
      dueDate: data.dueDate ?? currentInvoice.dueDate,
      paidAt: data.paidAt ?? currentInvoice.paidAt,
      items,
      ...totals,
      notes: data.notes ?? currentInvoice.notes,
      updatedAt: new Date().toISOString(),
    };

    return mockInvoices[index];
  },

  // Update invoice status only
  async updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
    // In production, uncomment this:
    // const { data } = await api.patch<Invoice>(`/invoices/${id}/status`, { status });
    // return data;

    // Mock data for development
    await new Promise((resolve) => setTimeout(resolve, 300));

    const index = mockInvoices.findIndex((inv) => inv.id === id);
    if (index === -1) {
      throw new Error('Factura no encontrada');
    }

    const currentStatus = mockInvoices[index].status;

    // Validate status transitions
    if (currentStatus === 'CANCELLED') {
      throw new Error('No se puede cambiar el estado de una factura cancelada');
    }
    if (currentStatus === 'PAID' && status !== 'CANCELLED') {
      throw new Error('Una factura pagada solo puede ser cancelada');
    }

    mockInvoices[index] = {
      ...mockInvoices[index],
      status,
      paidAt: status === 'PAID' ? new Date().toISOString() : mockInvoices[index].paidAt,
      updatedAt: new Date().toISOString(),
    };

    return mockInvoices[index];
  },

  // Delete invoice
  async deleteInvoice(id: string): Promise<void> {
    // In production, uncomment this:
    // await api.delete(`/invoices/${id}`);

    // Mock data for development
    await new Promise((resolve) => setTimeout(resolve, 300));

    const index = mockInvoices.findIndex((inv) => inv.id === id);
    if (index === -1) {
      throw new Error('Factura no encontrada');
    }

    // Only allow deletion of draft invoices
    if (mockInvoices[index].status !== 'DRAFT') {
      throw new Error('Solo se pueden eliminar facturas en borrador');
    }

    mockInvoices.splice(index, 1);
  },

  // Add line item to invoice
  async addInvoiceItem(
    invoiceId: string,
    item: CreateInvoiceItemData
  ): Promise<Invoice> {
    // In production, uncomment this:
    // const { data } = await api.post<Invoice>(`/invoices/${invoiceId}/items`, item);
    // return data;

    // Mock data for development
    await new Promise((resolve) => setTimeout(resolve, 350));

    const index = mockInvoices.findIndex((inv) => inv.id === invoiceId);
    if (index === -1) {
      throw new Error('Factura no encontrada');
    }

    const invoice = mockInvoices[index];

    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
      throw new Error('No se puede modificar una factura pagada o cancelada');
    }

    const now = new Date().toISOString();
    const discount = item.discount || 0;
    const tax = item.tax || 19;
    const subtotal = item.quantity * item.unitPrice * (1 - discount / 100);
    const total = subtotal * (1 + tax / 100);

    const newItem: InvoiceItem = {
      id: `${invoiceId}-${(invoice.items?.length || 0) + 1}`,
      invoiceId,
      productId: item.productId,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount,
      tax,
      subtotal,
      total,
      createdAt: now,
      updatedAt: now,
    };

    const updatedItems = [...(invoice.items || []), newItem];
    const totals = calculateInvoiceTotals(updatedItems, invoice.discountAmount);

    mockInvoices[index] = {
      ...invoice,
      items: updatedItems,
      ...totals,
      updatedAt: now,
    };

    return mockInvoices[index];
  },

  // Update line item
  async updateInvoiceItem(
    invoiceId: string,
    itemId: string,
    data: UpdateInvoiceItemData
  ): Promise<Invoice> {
    // In production, uncomment this:
    // const { data: updated } = await api.patch<Invoice>(
    //   `/invoices/${invoiceId}/items/${itemId}`,
    //   data
    // );
    // return updated;

    // Mock data for development
    await new Promise((resolve) => setTimeout(resolve, 350));

    const invoiceIndex = mockInvoices.findIndex((inv) => inv.id === invoiceId);
    if (invoiceIndex === -1) {
      throw new Error('Factura no encontrada');
    }

    const invoice = mockInvoices[invoiceIndex];

    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
      throw new Error('No se puede modificar una factura pagada o cancelada');
    }

    const itemIndex = invoice.items?.findIndex((item) => item.id === itemId);
    if (itemIndex === undefined || itemIndex === -1) {
      throw new Error('Item no encontrado');
    }

    const now = new Date().toISOString();
    const existing = invoice.items[itemIndex];
    const discount = data.discount ?? existing.discount;
    const tax = data.tax ?? existing.tax;
    const quantity = data.quantity ?? existing.quantity;
    const unitPrice = data.unitPrice ?? existing.unitPrice;
    const subtotal = quantity * unitPrice * (1 - discount / 100);
    const total = subtotal * (1 + tax / 100);

    const updatedItems = [...invoice.items];
    updatedItems[itemIndex] = {
      ...existing,
      productId: data.productId ?? existing.productId,
      description: data.description ?? existing.description,
      quantity,
      unitPrice,
      discount,
      tax,
      subtotal,
      total,
      updatedAt: now,
    };

    const totals = calculateInvoiceTotals(updatedItems, invoice.discountAmount);

    mockInvoices[invoiceIndex] = {
      ...invoice,
      items: updatedItems,
      ...totals,
      updatedAt: now,
    };

    return mockInvoices[invoiceIndex];
  },

  // Remove line item
  async removeInvoiceItem(invoiceId: string, itemId: string): Promise<Invoice> {
    // In production, uncomment this:
    // const { data } = await api.delete<Invoice>(`/invoices/${invoiceId}/items/${itemId}`);
    // return data;

    // Mock data for development
    await new Promise((resolve) => setTimeout(resolve, 300));

    const invoiceIndex = mockInvoices.findIndex((inv) => inv.id === invoiceId);
    if (invoiceIndex === -1) {
      throw new Error('Factura no encontrada');
    }

    const invoice = mockInvoices[invoiceIndex];

    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
      throw new Error('No se puede modificar una factura pagada o cancelada');
    }

    const updatedItems = (invoice.items || []).filter(
      (item) => item.id !== itemId
    );

    if (updatedItems.length === 0) {
      throw new Error('La factura debe tener al menos un item');
    }

    const totals = calculateInvoiceTotals(updatedItems, invoice.discountAmount);

    mockInvoices[invoiceIndex] = {
      ...invoice,
      items: updatedItems,
      ...totals,
      updatedAt: new Date().toISOString(),
    };

    return mockInvoices[invoiceIndex];
  },

  // Get invoice statistics
  async getInvoiceStats(): Promise<InvoiceStats> {
    // In production, uncomment this:
    // const { data } = await api.get<InvoiceStats>('/invoices/stats');
    // return data;

    // Mock data for development
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Calculate stats
    const pendingAmount = mockInvoices
      .filter((inv) => inv.status === 'PENDING')
      .reduce((sum, inv) => sum + inv.total, 0);

    const overdueAmount = mockInvoices
      .filter((inv) => inv.status === 'OVERDUE')
      .reduce((sum, inv) => sum + inv.total, 0);

    const totalRevenue = mockInvoices
      .filter((inv) => inv.status === 'PAID')
      .reduce((sum, inv) => sum + inv.total, 0);

    const totalInvoices = mockInvoices.length;

    const averageInvoiceValue = totalInvoices > 0
      ? Math.round(mockInvoices.reduce((sum, inv) => sum + inv.total, 0) / totalInvoices)
      : 0;

    const invoicesByStatus: Record<InvoiceStatus, number> = {
      DRAFT: mockInvoices.filter((inv) => inv.status === 'DRAFT').length,
      PENDING: mockInvoices.filter((inv) => inv.status === 'PENDING').length,
      PAID: mockInvoices.filter((inv) => inv.status === 'PAID').length,
      OVERDUE: mockInvoices.filter((inv) => inv.status === 'OVERDUE').length,
      CANCELLED: mockInvoices.filter((inv) => inv.status === 'CANCELLED').length,
    };

    return {
      totalInvoices,
      totalRevenue,
      pendingAmount,
      overdueAmount,
      averageInvoiceValue,
      invoicesByStatus,
    };
  },
};