import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { CacheService } from '../cache';

describe('DashboardService', () => {
  let service: DashboardService;
  let prismaService: jest.Mocked<PrismaService>;
  let tenantContextService: jest.Mocked<TenantContextService>;
  let cacheService: jest.Mocked<CacheService>;

  // Test data
  const mockTenantId = 'tenant-123';

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create mock implementations
    const mockPrismaService = {
      invoice: {
        aggregate: jest.fn(),
        count: jest.fn(),
      },
      product: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      customer: {
        count: jest.fn(),
      },
      invoiceItem: {
        groupBy: jest.fn(),
        findMany: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    const mockTenantContextService = {
      getTenantId: jest.fn().mockReturnValue(mockTenantId),
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const mockCacheService = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      generateKey: jest
        .fn()
        .mockImplementation((prefix, tenantId, suffix) =>
          suffix ? `${prefix}:${tenantId}:${suffix}` : `${prefix}:${tenantId}`,
        ),
      invalidate: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    prismaService = module.get(PrismaService);
    tenantContextService = module.get(TenantContextService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('getDashboard', () => {
    beforeEach(() => {
      // Setup default mocks for all metrics
      (prismaService.invoice.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: 0 },
      });
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(0);
      (prismaService.product.count as jest.Mock).mockResolvedValue(0);
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.customer.count as jest.Mock).mockResolvedValue(0);
      (prismaService.invoiceItem.groupBy as jest.Mock).mockResolvedValue([]);
      (prismaService.invoiceItem.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([]);
    });

    it('should return complete dashboard data', async () => {
      const result = await service.getDashboard();

      expect(result).toHaveProperty('sales');
      expect(result).toHaveProperty('products');
      expect(result).toHaveProperty('invoices');
      expect(result).toHaveProperty('customers');
      expect(result).toHaveProperty('charts');
    });

    it('should require tenant context', async () => {
      await service.getDashboard();

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should return sales metrics structure', async () => {
      const result = await service.getDashboard();

      expect(result.sales).toHaveProperty('today');
      expect(result.sales).toHaveProperty('thisWeek');
      expect(result.sales).toHaveProperty('thisMonth');
      expect(result.sales).toHaveProperty('growth');
    });

    it('should return products metrics structure', async () => {
      const result = await service.getDashboard();

      expect(result.products).toHaveProperty('total');
      expect(result.products).toHaveProperty('lowStock');
      expect(result.products).toHaveProperty('outOfStock');
      expect(result.products).toHaveProperty('topSelling');
    });

    it('should return invoices metrics structure', async () => {
      const result = await service.getDashboard();

      expect(result.invoices).toHaveProperty('pending');
      expect(result.invoices).toHaveProperty('overdue');
      expect(result.invoices).toHaveProperty('paid');
      expect(result.invoices).toHaveProperty('draft');
    });

    it('should return customers metrics structure', async () => {
      const result = await service.getDashboard();

      expect(result.customers).toHaveProperty('total');
      expect(result.customers).toHaveProperty('newThisMonth');
    });

    it('should return charts data structure', async () => {
      const result = await service.getDashboard();

      expect(result.charts).toHaveProperty('salesByDay');
      expect(result.charts).toHaveProperty('topProducts');
      expect(result.charts).toHaveProperty('salesByCategory');
    });
  });

  describe('getSalesMetrics', () => {
    it('should return sales metrics with correct values', async () => {
      (prismaService.invoice.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { total: 1000 } }) // today
        .mockResolvedValueOnce({ _sum: { total: 5000 } }) // thisWeek
        .mockResolvedValueOnce({ _sum: { total: 20000 } }) // thisMonth
        .mockResolvedValueOnce({ _sum: { total: 15000 } }); // lastMonth

      const result = await service.getSalesMetrics(mockTenantId);

      expect(result.today).toBe(1000);
      expect(result.thisWeek).toBe(5000);
      expect(result.thisMonth).toBe(20000);
    });

    it('should calculate positive growth correctly', async () => {
      (prismaService.invoice.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { total: 0 } }) // today
        .mockResolvedValueOnce({ _sum: { total: 0 } }) // thisWeek
        .mockResolvedValueOnce({ _sum: { total: 20000 } }) // thisMonth
        .mockResolvedValueOnce({ _sum: { total: 10000 } }); // lastMonth

      const result = await service.getSalesMetrics(mockTenantId);

      // Growth should be 100% (doubled from 10000 to 20000)
      expect(result.growth).toBe(100);
    });

    it('should calculate negative growth correctly', async () => {
      (prismaService.invoice.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { total: 0 } }) // today
        .mockResolvedValueOnce({ _sum: { total: 0 } }) // thisWeek
        .mockResolvedValueOnce({ _sum: { total: 5000 } }) // thisMonth
        .mockResolvedValueOnce({ _sum: { total: 10000 } }); // lastMonth

      const result = await service.getSalesMetrics(mockTenantId);

      // Growth should be -50% (halved from 10000 to 5000)
      expect(result.growth).toBe(-50);
    });

    it('should return 100% growth when last month was zero', async () => {
      (prismaService.invoice.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { total: 0 } }) // today
        .mockResolvedValueOnce({ _sum: { total: 0 } }) // thisWeek
        .mockResolvedValueOnce({ _sum: { total: 5000 } }) // thisMonth
        .mockResolvedValueOnce({ _sum: { total: 0 } }); // lastMonth

      const result = await service.getSalesMetrics(mockTenantId);

      expect(result.growth).toBe(100);
    });

    it('should return 0% growth when both months are zero', async () => {
      (prismaService.invoice.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { total: 0 } }) // today
        .mockResolvedValueOnce({ _sum: { total: 0 } }) // thisWeek
        .mockResolvedValueOnce({ _sum: { total: 0 } }) // thisMonth
        .mockResolvedValueOnce({ _sum: { total: 0 } }); // lastMonth

      const result = await service.getSalesMetrics(mockTenantId);

      expect(result.growth).toBe(0);
    });

    it('should handle null sum values', async () => {
      (prismaService.invoice.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: null },
      });

      const result = await service.getSalesMetrics(mockTenantId);

      expect(result.today).toBe(0);
      expect(result.thisWeek).toBe(0);
      expect(result.thisMonth).toBe(0);
      expect(result.growth).toBe(0);
    });

    it('should exclude cancelled invoices', async () => {
      (prismaService.invoice.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: 1000 },
      });

      await service.getSalesMetrics(mockTenantId);

      expect(prismaService.invoice.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
            status: { not: InvoiceStatus.CANCELLED },
          }),
        }),
      );
    });
  });

  describe('getProductMetrics', () => {
    beforeEach(() => {
      (prismaService.product.count as jest.Mock).mockResolvedValue(3);
      (prismaService.invoiceItem.groupBy as jest.Mock).mockResolvedValue([]);
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([]);
    });

    it('should return total product count', async () => {
      (prismaService.product.count as jest.Mock)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(5); // outOfStock

      (prismaService.product.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getProductMetrics(mockTenantId);

      expect(result.total).toBe(100);
    });

    it('should return out of stock count', async () => {
      (prismaService.product.count as jest.Mock)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(5); // outOfStock

      (prismaService.product.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getProductMetrics(mockTenantId);

      expect(result.outOfStock).toBe(5);
    });

    it('should calculate low stock products correctly', async () => {
      (prismaService.product.count as jest.Mock)
        .mockResolvedValueOnce(3) // total
        .mockResolvedValueOnce(1); // outOfStock

      (prismaService.product.findMany as jest.Mock).mockResolvedValue([
        { stock: 50, minStock: 10 }, // Not low stock
        { stock: 5, minStock: 20 }, // Low stock
        { stock: 15, minStock: 10 }, // Not low stock
      ]);

      const result = await service.getProductMetrics(mockTenantId);

      expect(result.lowStock).toBe(1);
    });

    it('should return empty top selling when no sales', async () => {
      (prismaService.product.count as jest.Mock).mockResolvedValue(0);
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.invoiceItem.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await service.getProductMetrics(mockTenantId);

      expect(result.topSelling).toEqual([]);
    });
  });

  describe('getTopSellingProducts', () => {
    it('should return top selling products with correct data', async () => {
      (prismaService.invoiceItem.groupBy as jest.Mock).mockResolvedValue([
        { productId: 'product-1', _sum: { quantity: 100, total: 10000 } },
        { productId: 'product-2', _sum: { quantity: 50, total: 5000 } },
      ]);

      (prismaService.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'product-1', name: 'Product One', sku: 'SKU-001' },
        { id: 'product-2', name: 'Product Two', sku: 'SKU-002' },
      ]);

      const result = await service.getTopSellingProducts(mockTenantId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'product-1',
        name: 'Product One',
        sku: 'SKU-001',
        quantitySold: 100,
        revenue: 10000,
      });
    });

    it('should return empty array when no products sold', async () => {
      (prismaService.invoiceItem.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await service.getTopSellingProducts(mockTenantId);

      expect(result).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      (prismaService.invoiceItem.groupBy as jest.Mock).mockResolvedValue([
        { productId: 'product-1', _sum: { quantity: 100, total: 10000 } },
      ]);

      (prismaService.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'product-1', name: 'Product One', sku: 'SKU-001' },
      ]);

      await service.getTopSellingProducts(mockTenantId, 3);

      expect(prismaService.invoiceItem.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 3,
        }),
      );
    });

    it('should exclude cancelled invoices', async () => {
      (prismaService.invoiceItem.groupBy as jest.Mock).mockResolvedValue([]);

      await service.getTopSellingProducts(mockTenantId);

      expect(prismaService.invoiceItem.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            invoice: expect.objectContaining({
              status: { not: InvoiceStatus.CANCELLED },
            }),
          }),
        }),
      );
    });

    it('should filter out products not found in database', async () => {
      // groupBy returns products, but findMany doesn't return one of them
      (prismaService.invoiceItem.groupBy as jest.Mock).mockResolvedValue([
        { productId: 'product-1', _sum: { quantity: 100, total: 10000 } },
        { productId: 'product-2', _sum: { quantity: 50, total: 5000 } },
        { productId: 'product-deleted', _sum: { quantity: 25, total: 2500 } },
      ]);

      // Only return 2 of the 3 products (product-deleted not found)
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'product-1', name: 'Product One', sku: 'SKU-001' },
        { id: 'product-2', name: 'Product Two', sku: 'SKU-002' },
      ]);

      const result = await service.getTopSellingProducts(mockTenantId);

      // Should only return 2 products, filtering out the deleted one
      expect(result).toHaveLength(2);
      expect(result.find((p) => p.id === 'product-deleted')).toBeUndefined();
    });

    it('should handle null quantity in sum', async () => {
      (prismaService.invoiceItem.groupBy as jest.Mock).mockResolvedValue([
        { productId: 'product-1', _sum: { quantity: null, total: 10000 } },
      ]);

      (prismaService.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'product-1', name: 'Product One', sku: 'SKU-001' },
      ]);

      const result = await service.getTopSellingProducts(mockTenantId);

      expect(result[0].quantitySold).toBe(0);
    });

    it('should handle null total in sum', async () => {
      (prismaService.invoiceItem.groupBy as jest.Mock).mockResolvedValue([
        { productId: 'product-1', _sum: { quantity: 100, total: null } },
      ]);

      (prismaService.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'product-1', name: 'Product One', sku: 'SKU-001' },
      ]);

      const result = await service.getTopSellingProducts(mockTenantId);

      expect(result[0].revenue).toBe(0);
    });
  });

  describe('getInvoiceMetrics', () => {
    it('should return invoice counts by status', async () => {
      (prismaService.invoice.count as jest.Mock)
        .mockResolvedValueOnce(15) // pending
        .mockResolvedValueOnce(3) // overdue
        .mockResolvedValueOnce(145) // paid
        .mockResolvedValueOnce(5); // draft

      const result = await service.getInvoiceMetrics(mockTenantId);

      expect(result).toEqual({
        pending: 15,
        overdue: 3,
        paid: 145,
        draft: 5,
      });
    });

    it('should return zero counts when no invoices', async () => {
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getInvoiceMetrics(mockTenantId);

      expect(result).toEqual({
        pending: 0,
        overdue: 0,
        paid: 0,
        draft: 0,
      });
    });

    it('should query pending status correctly', async () => {
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(0);

      await service.getInvoiceMetrics(mockTenantId);

      expect(prismaService.invoice.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: mockTenantId,
            status: InvoiceStatus.PENDING,
          },
        }),
      );
    });

    it('should query overdue status correctly', async () => {
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(0);

      await service.getInvoiceMetrics(mockTenantId);

      expect(prismaService.invoice.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: mockTenantId,
            status: InvoiceStatus.OVERDUE,
          },
        }),
      );
    });

    it('should query paid payment status correctly', async () => {
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(0);

      await service.getInvoiceMetrics(mockTenantId);

      expect(prismaService.invoice.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: mockTenantId,
            paymentStatus: 'PAID',
          },
        }),
      );
    });

    it('should query draft status correctly', async () => {
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(0);

      await service.getInvoiceMetrics(mockTenantId);

      expect(prismaService.invoice.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: mockTenantId,
            status: InvoiceStatus.DRAFT,
          },
        }),
      );
    });
  });

  describe('getCustomerMetrics', () => {
    it('should return customer counts', async () => {
      (prismaService.customer.count as jest.Mock)
        .mockResolvedValueOnce(89) // total
        .mockResolvedValueOnce(12); // newThisMonth

      const result = await service.getCustomerMetrics(mockTenantId);

      expect(result).toEqual({
        total: 89,
        newThisMonth: 12,
      });
    });

    it('should return zero counts when no customers', async () => {
      (prismaService.customer.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getCustomerMetrics(mockTenantId);

      expect(result).toEqual({
        total: 0,
        newThisMonth: 0,
      });
    });

    it('should filter new customers by start of month', async () => {
      (prismaService.customer.count as jest.Mock).mockResolvedValue(0);

      await service.getCustomerMetrics(mockTenantId);

      // Second call should have createdAt filter
      expect(prismaService.customer.count).toHaveBeenCalledTimes(2);
      expect(prismaService.customer.count).toHaveBeenNthCalledWith(2, {
        where: expect.objectContaining({
          tenantId: mockTenantId,
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
          }),
        }),
      });
    });
  });

  describe('getChartData', () => {
    beforeEach(() => {
      (prismaService.invoice.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: 0 },
      });
      (prismaService.invoiceItem.groupBy as jest.Mock).mockResolvedValue([]);
      (prismaService.invoiceItem.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([]);
    });

    it('should return chart data structure', async () => {
      const result = await service.getChartData(mockTenantId);

      expect(result).toHaveProperty('salesByDay');
      expect(result).toHaveProperty('topProducts');
      expect(result).toHaveProperty('salesByCategory');
    });
  });

  describe('getSalesByDay', () => {
    beforeEach(() => {
      // Mock $queryRaw to return empty array by default
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([]);
    });

    it('should return sales for last 7 days by default', async () => {
      const result = await service.getSalesByDay(mockTenantId);

      expect(result).toHaveLength(7);
    });

    it('should return correct date format', async () => {
      const result = await service.getSalesByDay(mockTenantId);

      // Check that all dates are in YYYY-MM-DD format
      result.forEach((day) => {
        expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    it('should return amounts for each day', async () => {
      // Mock dates for the last 7 days
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);

      const mockResults: Array<{ date: Date; total: bigint }> = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        mockResults.push({
          date: date,
          total: BigInt((i + 1) * 1000),
        });
      }

      (prismaService.$queryRaw as jest.Mock).mockResolvedValue(mockResults);

      const result = await service.getSalesByDay(mockTenantId);

      expect(result[0].amount).toBe(1000);
      expect(result[6].amount).toBe(7000);
    });

    it('should respect days parameter', async () => {
      const result = await service.getSalesByDay(mockTenantId, 3);

      expect(result).toHaveLength(3);
    });

    it('should use $queryRaw for single batched query', async () => {
      await service.getSalesByDay(mockTenantId);

      // Should call $queryRaw exactly once (instead of 7 aggregate calls)
      expect(prismaService.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should fill missing days with zero amount', async () => {
      // Only return data for one day out of 7
      const now = new Date();
      const middleDate = new Date(now);
      middleDate.setDate(middleDate.getDate() - 3);
      middleDate.setHours(0, 0, 0, 0);

      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([
        { date: middleDate, total: BigInt(5000) },
      ]);

      const result = await service.getSalesByDay(mockTenantId);

      // Should still have 7 entries
      expect(result).toHaveLength(7);

      // Days without sales should have 0 amount
      const daysWithZero = result.filter((day) => day.amount === 0);
      expect(daysWithZero.length).toBe(6);

      // The day with data should have the correct amount
      const dayWithData = result.find((day) => day.amount === 5000);
      expect(dayWithData).toBeDefined();
    });
  });

  describe('getTopProductsChart', () => {
    it('should return top products for charts', async () => {
      (prismaService.invoiceItem.groupBy as jest.Mock).mockResolvedValue([
        { productId: 'product-1', _sum: { quantity: 100, total: 10000 } },
      ]);

      (prismaService.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'product-1', name: 'Product One' },
      ]);

      const result = await service.getTopProductsChart(mockTenantId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'product-1',
        name: 'Product One',
        quantity: 100,
        revenue: 10000,
      });
    });

    it('should return empty array when no products', async () => {
      (prismaService.invoiceItem.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await service.getTopProductsChart(mockTenantId);

      expect(result).toEqual([]);
    });

    it('should order by total revenue descending', async () => {
      (prismaService.invoiceItem.groupBy as jest.Mock).mockResolvedValue([]);

      await service.getTopProductsChart(mockTenantId);

      expect(prismaService.invoiceItem.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            _sum: {
              total: 'desc',
            },
          },
        }),
      );
    });

    it('should filter out products not found in database', async () => {
      // groupBy returns products, but findMany doesn't return one of them
      (prismaService.invoiceItem.groupBy as jest.Mock).mockResolvedValue([
        { productId: 'product-1', _sum: { quantity: 100, total: 10000 } },
        { productId: 'product-2', _sum: { quantity: 50, total: 5000 } },
        { productId: 'product-deleted', _sum: { quantity: 25, total: 2500 } },
      ]);

      // Only return 2 of the 3 products (product-deleted not found)
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'product-1', name: 'Product One' },
        { id: 'product-2', name: 'Product Two' },
      ]);

      const result = await service.getTopProductsChart(mockTenantId);

      // Should only return 2 products, filtering out the deleted one
      expect(result).toHaveLength(2);
      expect(result.find((p) => p.id === 'product-deleted')).toBeUndefined();
    });

    it('should handle null quantity in sum for chart', async () => {
      (prismaService.invoiceItem.groupBy as jest.Mock).mockResolvedValue([
        { productId: 'product-1', _sum: { quantity: null, total: 10000 } },
      ]);

      (prismaService.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'product-1', name: 'Product One' },
      ]);

      const result = await service.getTopProductsChart(mockTenantId);

      expect(result[0].quantity).toBe(0);
    });

    it('should handle null total in sum for chart', async () => {
      (prismaService.invoiceItem.groupBy as jest.Mock).mockResolvedValue([
        { productId: 'product-1', _sum: { quantity: 100, total: null } },
      ]);

      (prismaService.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'product-1', name: 'Product One' },
      ]);

      const result = await service.getTopProductsChart(mockTenantId);

      expect(result[0].revenue).toBe(0);
    });
  });

  describe('getSalesByCategory', () => {
    it('should return sales grouped by category', async () => {
      (prismaService.invoice.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: 10000 },
      });

      (prismaService.invoiceItem.findMany as jest.Mock).mockResolvedValue([
        {
          total: 5000,
          product: {
            categoryId: 'category-1',
            category: { id: 'category-1', name: 'Electronics' },
          },
        },
        {
          total: 3000,
          product: {
            categoryId: 'category-2',
            category: { id: 'category-2', name: 'Clothing' },
          },
        },
        {
          total: 2000,
          product: {
            categoryId: null,
            category: null,
          },
        },
      ]);

      const result = await service.getSalesByCategory(mockTenantId);

      expect(result).toHaveLength(3);
    });

    it('should calculate percentages correctly', async () => {
      (prismaService.invoice.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: 10000 },
      });

      (prismaService.invoiceItem.findMany as jest.Mock).mockResolvedValue([
        {
          total: 5000,
          product: {
            categoryId: 'category-1',
            category: { id: 'category-1', name: 'Electronics' },
          },
        },
      ]);

      const result = await service.getSalesByCategory(mockTenantId);

      expect(result[0].percentage).toBe(50);
    });

    it('should handle uncategorized products', async () => {
      (prismaService.invoice.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: 1000 },
      });

      (prismaService.invoiceItem.findMany as jest.Mock).mockResolvedValue([
        {
          total: 1000,
          product: {
            categoryId: null,
            category: null,
          },
        },
      ]);

      const result = await service.getSalesByCategory(mockTenantId);

      expect(result).toHaveLength(1);
      expect(result[0].categoryId).toBeNull();
      expect(result[0].categoryName).toBe('Sin categoria');
    });

    it('should return empty array when no sales', async () => {
      (prismaService.invoice.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: 0 },
      });

      (prismaService.invoiceItem.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getSalesByCategory(mockTenantId);

      expect(result).toEqual([]);
    });

    it('should sort by amount descending', async () => {
      (prismaService.invoice.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: 10000 },
      });

      (prismaService.invoiceItem.findMany as jest.Mock).mockResolvedValue([
        {
          total: 2000,
          product: {
            categoryId: 'category-1',
            category: { id: 'category-1', name: 'Small' },
          },
        },
        {
          total: 5000,
          product: {
            categoryId: 'category-2',
            category: { id: 'category-2', name: 'Large' },
          },
        },
      ]);

      const result = await service.getSalesByCategory(mockTenantId);

      expect(result[0].categoryName).toBe('Large');
      expect(result[1].categoryName).toBe('Small');
    });

    it('should aggregate multiple items from the same category', async () => {
      (prismaService.invoice.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: 10000 },
      });

      // Multiple items from the SAME category to cover line 627: existing.amount += itemTotal
      (prismaService.invoiceItem.findMany as jest.Mock).mockResolvedValue([
        {
          total: 3000,
          product: {
            categoryId: 'category-1',
            category: { id: 'category-1', name: 'Electronics' },
          },
        },
        {
          total: 2000,
          product: {
            categoryId: 'category-1',
            category: { id: 'category-1', name: 'Electronics' },
          },
        },
        {
          total: 5000,
          product: {
            categoryId: 'category-1',
            category: { id: 'category-1', name: 'Electronics' },
          },
        },
      ]);

      const result = await service.getSalesByCategory(mockTenantId);

      // All three items should be aggregated into a single category entry
      expect(result).toHaveLength(1);
      expect(result[0].categoryId).toBe('category-1');
      expect(result[0].categoryName).toBe('Electronics');
      expect(result[0].amount).toBe(10000); // 3000 + 2000 + 5000
      expect(result[0].percentage).toBe(100);
    });

    it('should aggregate items from same category while keeping different categories separate', async () => {
      (prismaService.invoice.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: 15000 },
      });

      // Mix of items from same category and different categories
      (prismaService.invoiceItem.findMany as jest.Mock).mockResolvedValue([
        {
          total: 3000,
          product: {
            categoryId: 'category-1',
            category: { id: 'category-1', name: 'Electronics' },
          },
        },
        {
          total: 2000,
          product: {
            categoryId: 'category-2',
            category: { id: 'category-2', name: 'Clothing' },
          },
        },
        {
          total: 5000,
          product: {
            categoryId: 'category-1',
            category: { id: 'category-1', name: 'Electronics' },
          },
        },
        {
          total: 5000,
          product: {
            categoryId: 'category-2',
            category: { id: 'category-2', name: 'Clothing' },
          },
        },
      ]);

      const result = await service.getSalesByCategory(mockTenantId);

      // Should have 2 categories
      expect(result).toHaveLength(2);

      // Electronics: 3000 + 5000 = 8000
      const electronics = result.find((r) => r.categoryId === 'category-1');
      expect(electronics).toBeDefined();
      expect(electronics!.amount).toBe(8000);
      expect(electronics!.percentage).toBeCloseTo(53.33, 1);

      // Clothing: 2000 + 5000 = 7000
      const clothing = result.find((r) => r.categoryId === 'category-2');
      expect(clothing).toBeDefined();
      expect(clothing!.amount).toBe(7000);
      expect(clothing!.percentage).toBeCloseTo(46.67, 1);
    });

    it('should aggregate multiple uncategorized items', async () => {
      (prismaService.invoice.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: 6000 },
      });

      // Multiple items without category to test aggregation with null categoryId
      (prismaService.invoiceItem.findMany as jest.Mock).mockResolvedValue([
        {
          total: 1000,
          product: {
            categoryId: null,
            category: null,
          },
        },
        {
          total: 2000,
          product: {
            categoryId: null,
            category: null,
          },
        },
        {
          total: 3000,
          product: {
            categoryId: null,
            category: null,
          },
        },
      ]);

      const result = await service.getSalesByCategory(mockTenantId);

      expect(result).toHaveLength(1);
      expect(result[0].categoryId).toBeNull();
      expect(result[0].categoryName).toBe('Sin categoria');
      expect(result[0].amount).toBe(6000); // 1000 + 2000 + 3000
      expect(result[0].percentage).toBe(100);
    });
  });

  describe('edge cases', () => {
    it('should handle decimal values in sales', async () => {
      (prismaService.invoice.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: 1234.56 },
      });

      (prismaService.invoice.count as jest.Mock).mockResolvedValue(0);
      (prismaService.product.count as jest.Mock).mockResolvedValue(0);
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.customer.count as jest.Mock).mockResolvedValue(0);
      (prismaService.invoiceItem.groupBy as jest.Mock).mockResolvedValue([]);
      (prismaService.invoiceItem.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([]);

      const result = await service.getDashboard();

      expect(typeof result.sales.today).toBe('number');
    });

    it('should handle large numbers', async () => {
      (prismaService.invoice.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: 999999999.99 },
      });

      (prismaService.invoice.count as jest.Mock).mockResolvedValue(0);
      (prismaService.product.count as jest.Mock).mockResolvedValue(0);
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.customer.count as jest.Mock).mockResolvedValue(0);
      (prismaService.invoiceItem.groupBy as jest.Mock).mockResolvedValue([]);
      (prismaService.invoiceItem.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([]);

      const result = await service.getDashboard();

      expect(result.sales.today).toBe(999999999.99);
    });

    it('should handle products without category in top selling', async () => {
      (prismaService.invoiceItem.groupBy as jest.Mock).mockResolvedValue([
        { productId: 'product-no-cat', _sum: { quantity: 50, total: 5000 } },
      ]);

      (prismaService.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'product-no-cat', name: 'No Category Product', sku: 'SKU-NC' },
      ]);

      (prismaService.product.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getTopSellingProducts(mockTenantId);

      expect(result[0].name).toBe('No Category Product');
    });
  });
});
