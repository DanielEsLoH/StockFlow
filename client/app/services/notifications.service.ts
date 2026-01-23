import type {
  Notification,
  NotificationSummary,
  NotificationFilters,
  NotificationsResponse,
  UnreadCountResponse,
  CreateNotificationData,
  MarkAsReadResponse,
  NotificationType,
  NotificationPriority,
} from '~/types/notification';

// Helper to get dates relative to "today"
const today = new Date();
const getDateDaysAgo = (days: number, hours: number = 0, minutes: number = 0): string => {
  const date = new Date(today);
  date.setDate(date.getDate() - days);
  date.setHours(date.getHours() - hours, date.getMinutes() - minutes, 0, 0);
  return date.toISOString();
};

// Mock data for development
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'LOW_STOCK',
    title: 'Stock bajo',
    message: 'El producto "Laptop HP Pavilion 15" tiene stock bajo (5 unidades)',
    priority: 'HIGH',
    read: false,
    link: '/products/1',
    metadata: { productId: '1', currentStock: 5, minStock: 10 },
    createdAt: getDateDaysAgo(0, 0, 30),
    updatedAt: getDateDaysAgo(0, 0, 30),
  },
  {
    id: '2',
    type: 'NEW_INVOICE',
    title: 'Nueva factura creada',
    message: 'Se ha creado la factura FAC-2024-0125 para Distribuidora ABC S.A.S',
    priority: 'MEDIUM',
    read: false,
    link: '/invoices/125',
    metadata: { invoiceId: '125', invoiceNumber: 'FAC-2024-0125', customerId: '2' },
    createdAt: getDateDaysAgo(0, 2, 0),
    updatedAt: getDateDaysAgo(0, 2, 0),
  },
  {
    id: '3',
    type: 'PAYMENT_RECEIVED',
    title: 'Pago recibido',
    message: 'Se ha registrado un pago de $1,500,000 COP para la factura FAC-2024-0120',
    priority: 'MEDIUM',
    read: false,
    link: '/payments/15',
    metadata: { paymentId: '15', amount: 1500000, invoiceId: '120' },
    createdAt: getDateDaysAgo(0, 5, 0),
    updatedAt: getDateDaysAgo(0, 5, 0),
  },
  {
    id: '4',
    type: 'OUT_OF_STOCK',
    title: 'Producto agotado',
    message: 'El producto "Mouse Logitech MX Master 3" se ha agotado',
    priority: 'URGENT',
    read: false,
    link: '/products/8',
    metadata: { productId: '8', productName: 'Mouse Logitech MX Master 3' },
    createdAt: getDateDaysAgo(0, 8, 0),
    updatedAt: getDateDaysAgo(0, 8, 0),
  },
  {
    id: '5',
    type: 'INVOICE_OVERDUE',
    title: 'Factura vencida',
    message: 'La factura FAC-2024-0098 de Tech Solutions Ltda esta vencida hace 5 dias',
    priority: 'HIGH',
    read: false,
    link: '/invoices/98',
    metadata: { invoiceId: '98', daysOverdue: 5, customerId: '4' },
    createdAt: getDateDaysAgo(0, 12, 0),
    updatedAt: getDateDaysAgo(0, 12, 0),
  },
  {
    id: '6',
    type: 'INVOICE_PAID',
    title: 'Factura pagada',
    message: 'La factura FAC-2024-0115 ha sido pagada completamente',
    priority: 'LOW',
    read: true,
    readAt: getDateDaysAgo(0, 20, 0),
    link: '/invoices/115',
    metadata: { invoiceId: '115', total: 2500000 },
    createdAt: getDateDaysAgo(1, 0, 0),
    updatedAt: getDateDaysAgo(0, 20, 0),
  },
  {
    id: '7',
    type: 'NEW_CUSTOMER',
    title: 'Nuevo cliente registrado',
    message: 'Se ha registrado el cliente "Comercializadora XYZ S.A.S"',
    priority: 'LOW',
    read: true,
    readAt: getDateDaysAgo(1, 5, 0),
    link: '/customers/12',
    metadata: { customerId: '12', customerName: 'Comercializadora XYZ S.A.S' },
    createdAt: getDateDaysAgo(1, 3, 0),
    updatedAt: getDateDaysAgo(1, 5, 0),
  },
  {
    id: '8',
    type: 'REPORT_READY',
    title: 'Reporte generado',
    message: 'El reporte de ventas del mes de Enero 2024 esta listo para descargar',
    priority: 'LOW',
    read: true,
    readAt: getDateDaysAgo(2, 0, 0),
    link: '/reports',
    metadata: { reportType: 'sales', period: '2024-01' },
    createdAt: getDateDaysAgo(2, 0, 0),
    updatedAt: getDateDaysAgo(2, 0, 0),
  },
  {
    id: '9',
    type: 'PAYMENT_FAILED',
    title: 'Pago fallido',
    message: 'El pago con tarjeta de credito para la factura FAC-2024-0122 fue rechazado',
    priority: 'HIGH',
    read: true,
    readAt: getDateDaysAgo(2, 10, 0),
    link: '/payments/18',
    metadata: { paymentId: '18', invoiceId: '122', reason: 'Fondos insuficientes' },
    createdAt: getDateDaysAgo(2, 12, 0),
    updatedAt: getDateDaysAgo(2, 10, 0),
  },
  {
    id: '10',
    type: 'LOW_STOCK',
    title: 'Stock bajo',
    message: 'El producto "Teclado Mecanico Keychron K2" tiene stock bajo (3 unidades)',
    priority: 'MEDIUM',
    read: true,
    readAt: getDateDaysAgo(3, 0, 0),
    link: '/products/15',
    metadata: { productId: '15', currentStock: 3, minStock: 5 },
    createdAt: getDateDaysAgo(3, 5, 0),
    updatedAt: getDateDaysAgo(3, 0, 0),
  },
  {
    id: '11',
    type: 'SYSTEM',
    title: 'Mantenimiento programado',
    message: 'El sistema estara en mantenimiento el proximo sabado de 2:00 AM a 4:00 AM',
    priority: 'MEDIUM',
    read: true,
    readAt: getDateDaysAgo(4, 0, 0),
    metadata: { maintenanceDate: '2024-01-27', startTime: '02:00', endTime: '04:00' },
    createdAt: getDateDaysAgo(5, 0, 0),
    updatedAt: getDateDaysAgo(4, 0, 0),
  },
  {
    id: '12',
    type: 'INFO',
    title: 'Actualizacion de terminos',
    message: 'Hemos actualizado nuestros terminos y condiciones de servicio',
    priority: 'LOW',
    read: true,
    readAt: getDateDaysAgo(6, 0, 0),
    link: '/terms',
    createdAt: getDateDaysAgo(7, 0, 0),
    updatedAt: getDateDaysAgo(6, 0, 0),
  },
];

// Convert Notification to NotificationSummary for list responses
function toNotificationSummary(notification: Notification): NotificationSummary {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    priority: notification.priority,
    read: notification.read,
    link: notification.link,
    createdAt: notification.createdAt,
  };
}

// Helper function to filter notifications
function filterNotifications(
  notifications: Notification[],
  filters: NotificationFilters
): NotificationsResponse {
  let filtered = [...notifications];

  // Search filter (title, message)
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(
      (notification) =>
        notification.title.toLowerCase().includes(searchLower) ||
        notification.message.toLowerCase().includes(searchLower)
    );
  }

  // Type filter
  if (filters.type) {
    filtered = filtered.filter((notification) => notification.type === filters.type);
  }

  // Priority filter
  if (filters.priority) {
    filtered = filtered.filter((notification) => notification.priority === filters.priority);
  }

  // Read status filter
  if (filters.read !== undefined) {
    filtered = filtered.filter((notification) => notification.read === filters.read);
  }

  // Date range filter
  if (filters.startDate) {
    const startDate = new Date(filters.startDate);
    filtered = filtered.filter(
      (notification) => new Date(notification.createdAt) >= startDate
    );
  }
  if (filters.endDate) {
    const endDate = new Date(filters.endDate);
    filtered = filtered.filter(
      (notification) => new Date(notification.createdAt) <= endDate
    );
  }

  // Sorting
  const sortBy = filters.sortBy || 'createdAt';
  const sortOrder = filters.sortOrder || 'desc';
  filtered.sort((a, b) => {
    let aValue: string | number | boolean;
    let bValue: string | number | boolean;

    switch (sortBy) {
      case 'title':
        aValue = a.title;
        bValue = b.title;
        break;
      case 'type':
        aValue = a.type;
        bValue = b.type;
        break;
      case 'priority': {
        // Custom priority ordering
        const priorityOrder: Record<NotificationPriority, number> = {
          URGENT: 4,
          HIGH: 3,
          MEDIUM: 2,
          LOW: 1,
        };
        aValue = priorityOrder[a.priority];
        bValue = priorityOrder[b.priority];
        break;
      }
      case 'read':
        aValue = a.read ? 1 : 0;
        bValue = b.read ? 1 : 0;
        break;
      case 'createdAt':
      default:
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
    const comparison = String(aValue).localeCompare(String(bValue));
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Calculate unread count before pagination
  const unreadCount = filtered.filter((n) => !n.read).length;

  // Pagination
  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedData = filtered.slice(startIndex, endIndex);

  return {
    data: paginatedData.map(toNotificationSummary),
    meta: {
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
      unreadCount,
    },
  };
}

// Helper to generate next notification ID
function generateNotificationId(): string {
  const maxId = mockNotifications.reduce((max, notification) => {
    const id = parseInt(notification.id, 10);
    return id > max ? id : max;
  }, 0);
  return String(maxId + 1);
}

// Service
export const notificationsService = {
  // Get paginated notifications with filters
  async getNotifications(filters: NotificationFilters = {}): Promise<NotificationsResponse> {
    // In production, uncomment this:
    // const params = new URLSearchParams();
    // Object.entries(filters).forEach(([key, value]) => {
    //   if (value !== undefined && value !== null) {
    //     params.append(key, String(value));
    //   }
    // });
    // const { data } = await api.get<NotificationsResponse>(`/notifications?${params.toString()}`);
    // return data;

    // Mock data for development
    await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 100));
    return filterNotifications(mockNotifications, filters);
  },

  // Get single notification by ID
  async getNotification(id: string): Promise<Notification> {
    // In production, uncomment this:
    // const { data } = await api.get<Notification>(`/notifications/${id}`);
    // return data;

    // Mock data for development
    await new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 50));
    const notification = mockNotifications.find((n) => n.id === id);
    if (!notification) {
      throw new Error('Notificacion no encontrada');
    }
    return notification;
  },

  // Get unread notifications count
  async getUnreadCount(): Promise<UnreadCountResponse> {
    // In production, uncomment this:
    // const { data } = await api.get<UnreadCountResponse>('/notifications/unread/count');
    // return data;

    // Mock data for development
    await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 50));

    const unread = mockNotifications.filter((n) => !n.read);

    const byType: Partial<Record<NotificationType, number>> = {};
    const byPriority: Partial<Record<NotificationPriority, number>> = {};

    unread.forEach((notification) => {
      byType[notification.type] = (byType[notification.type] || 0) + 1;
      byPriority[notification.priority] = (byPriority[notification.priority] || 0) + 1;
    });

    return {
      count: unread.length,
      byType,
      byPriority,
    };
  },

  // Get recent notifications (for dropdown)
  async getRecentNotifications(limit: number = 5): Promise<NotificationSummary[]> {
    // In production, uncomment this:
    // const { data } = await api.get<NotificationSummary[]>(`/notifications/recent?limit=${limit}`);
    // return data;

    // Mock data for development
    await new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 50));
    return [...mockNotifications]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, limit)
      .map(toNotificationSummary);
  },

  // Mark single notification as read
  async markAsRead(id: string): Promise<Notification> {
    // In production, uncomment this:
    // const { data } = await api.patch<Notification>(`/notifications/${id}/read`);
    // return data;

    // Mock data for development
    await new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 50));

    const index = mockNotifications.findIndex((n) => n.id === id);
    if (index === -1) {
      throw new Error('Notificacion no encontrada');
    }

    const now = new Date().toISOString();
    mockNotifications[index] = {
      ...mockNotifications[index],
      read: true,
      readAt: now,
      updatedAt: now,
    };

    return mockNotifications[index];
  },

  // Mark multiple notifications as read
  async markMultipleAsRead(ids: string[]): Promise<MarkAsReadResponse> {
    // In production, uncomment this:
    // const { data } = await api.patch<MarkAsReadResponse>('/notifications/read', { ids });
    // return data;

    // Mock data for development
    await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 100));

    const now = new Date().toISOString();
    let updatedCount = 0;

    ids.forEach((id) => {
      const index = mockNotifications.findIndex((n) => n.id === id);
      if (index !== -1 && !mockNotifications[index].read) {
        mockNotifications[index] = {
          ...mockNotifications[index],
          read: true,
          readAt: now,
          updatedAt: now,
        };
        updatedCount++;
      }
    });

    return {
      success: true,
      updatedCount,
    };
  },

  // Mark all notifications as read
  async markAllAsRead(): Promise<MarkAsReadResponse> {
    // In production, uncomment this:
    // const { data } = await api.patch<MarkAsReadResponse>('/notifications/read-all');
    // return data;

    // Mock data for development
    await new Promise((resolve) => setTimeout(resolve, 250 + Math.random() * 100));

    const now = new Date().toISOString();
    let updatedCount = 0;

    mockNotifications.forEach((notification, index) => {
      if (!notification.read) {
        mockNotifications[index] = {
          ...notification,
          read: true,
          readAt: now,
          updatedAt: now,
        };
        updatedCount++;
      }
    });

    return {
      success: true,
      updatedCount,
    };
  },

  // Mark single notification as unread
  async markAsUnread(id: string): Promise<Notification> {
    // In production, uncomment this:
    // const { data } = await api.patch<Notification>(`/notifications/${id}/unread`);
    // return data;

    // Mock data for development
    await new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 50));

    const index = mockNotifications.findIndex((n) => n.id === id);
    if (index === -1) {
      throw new Error('Notificacion no encontrada');
    }

    const now = new Date().toISOString();
    mockNotifications[index] = {
      ...mockNotifications[index],
      read: false,
      readAt: undefined,
      updatedAt: now,
    };

    return mockNotifications[index];
  },

  // Delete notification
  async deleteNotification(id: string): Promise<void> {
    // In production, uncomment this:
    // await api.delete(`/notifications/${id}`);

    // Mock data for development
    await new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 50));

    const index = mockNotifications.findIndex((n) => n.id === id);
    if (index === -1) {
      throw new Error('Notificacion no encontrada');
    }

    mockNotifications.splice(index, 1);
  },

  // Delete multiple notifications
  async deleteMultipleNotifications(ids: string[]): Promise<{ deletedCount: number }> {
    // In production, uncomment this:
    // const { data } = await api.delete('/notifications', { data: { ids } });
    // return data;

    // Mock data for development
    await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 100));

    let deletedCount = 0;

    ids.forEach((id) => {
      const index = mockNotifications.findIndex((n) => n.id === id);
      if (index !== -1) {
        mockNotifications.splice(index, 1);
        deletedCount++;
      }
    });

    return { deletedCount };
  },

  // Clear all read notifications
  async clearReadNotifications(): Promise<{ deletedCount: number }> {
    // In production, uncomment this:
    // const { data } = await api.delete('/notifications/clear-read');
    // return data;

    // Mock data for development
    await new Promise((resolve) => setTimeout(resolve, 250 + Math.random() * 100));

    const initialLength = mockNotifications.length;
    const remaining = mockNotifications.filter((n) => !n.read);
    mockNotifications.length = 0;
    mockNotifications.push(...remaining);

    return {
      deletedCount: initialLength - remaining.length,
    };
  },

  // Create notification (for system/testing purposes)
  async createNotification(data: CreateNotificationData): Promise<Notification> {
    // In production, uncomment this:
    // const { data: newNotification } = await api.post<Notification>('/notifications', data);
    // return newNotification;

    // Mock data for development
    await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 100));

    const now = new Date().toISOString();
    const newNotification: Notification = {
      id: generateNotificationId(),
      type: data.type,
      title: data.title,
      message: data.message,
      priority: data.priority || 'MEDIUM',
      read: false,
      link: data.link,
      metadata: data.metadata,
      createdAt: now,
      updatedAt: now,
    };

    mockNotifications.unshift(newNotification);
    return newNotification;
  },
};