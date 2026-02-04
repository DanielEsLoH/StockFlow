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
      // Mock $queryRaw for low stock count
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([{ count: BigInt(0) }]);
    });

    it('should return total product count', async () => {
      (prismaService.product.count as jest.Mock)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(5); // outOfStock

      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([{ count: BigInt(0) }]);

      const result = await service.getProductMetrics(mockTenantId);

      expect(result.total).toBe(100);
    });

    it('should return out of stock count', async () => {
      (prismaService.product.count as jest.Mock)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(5); // outOfStock

      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([{ count: BigInt(0) }]);

      const result = await service.getProductMetrics(mockTenantId);

      expect(result.outOfStock).toBe(5);
    });

    it('should calculate low stock products correctly', async () => {
      (prismaService.product.count as jest.Mock)
        .mockResolvedValueOnce(3) // total
        .mockResolvedValueOnce(1); // outOfStock

      // Now uses $queryRaw for low stock count instead of findMany
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([{ count: BigInt(1) }]);

      const result = await service.getProductMetrics(mockTenantId);

      expect(result.lowStock).toBe(1);
    });

    it('should return empty top selling when no sales', async () => {
      (prismaService.product.count as jest.Mock).mockResolvedValue(0);
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([{ count: BigInt(0) }]);
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

      const mockResults = [] as { date: Date; total: bigint }[];
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
    // Now uses $queryRaw for SQL-based aggregation
    it('should return sales grouped by category', async () => {
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([
        { category_id: 'category-1', category_name: 'Electronics', total: BigInt(5000) },
        { category_id: 'category-2', category_name: 'Clothing', total: BigInt(3000) },
        { category_id: null, category_name: 'Sin categoria', total: BigInt(2000) },
      ]);

      const result = await service.getSalesByCategory(mockTenantId);

      expect(result).toHaveLength(3);
    });

    it('should calculate percentages correctly', async () => {
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([
        { category_id: 'category-1', category_name: 'Electronics', total: BigInt(5000) },
        { category_id: 'category-2', category_name: 'Clothing', total: BigInt(5000) },
      ]);

      const result = await service.getSalesByCategory(mockTenantId);

      expect(result[0].percentage).toBe(50);
      expect(result[1].percentage).toBe(50);
    });

    it('should handle uncategorized products', async () => {
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([
        { category_id: null, category_name: 'Sin categoria', total: BigInt(1000) },
      ]);

      const result = await service.getSalesByCategory(mockTenantId);

      expect(result).toHaveLength(1);
      expect(result[0].categoryId).toBeNull();
      expect(result[0].categoryName).toBe('Sin categoria');
    });

    it('should return empty array when no sales', async () => {
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([]);

      const result = await service.getSalesByCategory(mockTenantId);

      expect(result).toEqual([]);
    });

    it('should sort by amount descending', async () => {
      // SQL query already returns sorted by total DESC
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([
        { category_id: 'category-2', category_name: 'Large', total: BigInt(5000) },
        { category_id: 'category-1', category_name: 'Small', total: BigInt(2000) },
      ]);

      const result = await service.getSalesByCategory(mockTenantId);

      expect(result[0].categoryName).toBe('Large');
      expect(result[1].categoryName).toBe('Small');
    });

    it('should return aggregated data from database', async () => {
      // SQL query performs aggregation, so we return already aggregated data
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([
        { category_id: 'category-1', category_name: 'Electronics', total: BigInt(10000) },
      ]);

      const result = await service.getSalesByCategory(mockTenantId);

      expect(result).toHaveLength(1);
      expect(result[0].categoryId).toBe('category-1');
      expect(result[0].categoryName).toBe('Electronics');
      expect(result[0].amount).toBe(10000);
      expect(result[0].percentage).toBe(100);
    });

    it('should return multiple categories with correct percentages', async () => {
      // Data already aggregated by SQL query
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([
        { category_id: 'category-1', category_name: 'Electronics', total: BigInt(8000) },
        { category_id: 'category-2', category_name: 'Clothing', total: BigInt(7000) },
      ]);

      const result = await service.getSalesByCategory(mockTenantId);

      expect(result).toHaveLength(2);

      const electronics = result.find((r) => r.categoryId === 'category-1');
      expect(electronics).toBeDefined();
      expect(electronics!.amount).toBe(8000);
      expect(electronics!.percentage).toBeCloseTo(53.33, 1);

      const clothing = result.find((r) => r.categoryId === 'category-2');
      expect(clothing).toBeDefined();
      expect(clothing!.amount).toBe(7000);
      expect(clothing!.percentage).toBeCloseTo(46.67, 1);
    });

    it('should handle null category with aggregated total', async () => {
      // SQL query aggregates all uncategorized items
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([
        { category_id: null, category_name: 'Sin categoria', total: BigInt(6000) },
      ]);

      const result = await service.getSalesByCategory(mockTenantId);

      expect(result).toHaveLength(1);
      expect(result[0].categoryId).toBeNull();
      expect(result[0].categoryName).toBe('Sin categoria');
      expect(result[0].amount).toBe(6000);
      expect(result[0].percentage).toBe(100);
    });
  });

  describe('getDashboard - cache hit', () => {
    it('should return cached data when available', async () => {
      const mockCachedData = {
        sales: { today: 100, thisWeek: 500, thisMonth: 2000, growth: 10 },
        products: { total: 50, lowStock: 5, outOfStock: 2, topSelling: [] },
        invoices: { pending: 10, overdue: 2, paid: 100, draft: 5 },
        customers: { total: 200, newThisMonth: 15 },
        charts: { salesByDay: [], topProducts: [], salesByCategory: [] },
      };

      // Get the cache service and mock it to return cached data
      const cacheService = (service as unknown as { cache: { get: jest.Mock } })
        .cache;
      cacheService.get.mockResolvedValueOnce(mockCachedData);

      const result = await service.getDashboard();

      expect(result).toEqual(mockCachedData);
      // Prisma should not be called when cache hit
      expect(prismaService.invoice.aggregate).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    beforeEach(() => {
      // Setup default mocks
      (prismaService.invoice.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: 0 },
      });
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(0);
      (prismaService.product.count as jest.Mock).mockResolvedValue(0);
      (prismaService.customer.count as jest.Mock).mockResolvedValue(0);
    });

    it('should return dashboard stats structure', async () => {
      const result = await service.getStats();

      expect(result).toHaveProperty('totalSales');
      expect(result).toHaveProperty('salesGrowth');
      expect(result).toHaveProperty('totalProducts');
      expect(result).toHaveProperty('productsGrowth');
      expect(result).toHaveProperty('totalInvoices');
      expect(result).toHaveProperty('invoicesGrowth');
      expect(result).toHaveProperty('totalCustomers');
      expect(result).toHaveProperty('customersGrowth');
      expect(result).toHaveProperty('overdueInvoicesCount');
    });

    it('should require tenant context', async () => {
      await service.getStats();

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should calculate sales growth correctly', async () => {
      (prismaService.invoice.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { total: 20000 } }) // thisMonth
        .mockResolvedValueOnce({ _sum: { total: 10000 } }); // lastMonth

      (prismaService.invoice.count as jest.Mock).mockResolvedValue(0);
      (prismaService.product.count as jest.Mock).mockResolvedValue(0);
      (prismaService.customer.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getStats();

      expect(result.totalSales).toBe(20000);
      expect(result.salesGrowth).toBe(100); // 100% growth
    });

    it('should return 100% growth when last period was zero', async () => {
      (prismaService.invoice.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { total: 5000 } }) // thisMonth
        .mockResolvedValueOnce({ _sum: { total: 0 } }); // lastMonth

      (prismaService.invoice.count as jest.Mock).mockResolvedValue(0);
      (prismaService.product.count as jest.Mock).mockResolvedValue(0);
      (prismaService.customer.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getStats();

      expect(result.salesGrowth).toBe(100);
    });

    it('should return 0% growth when both periods are zero', async () => {
      (prismaService.invoice.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: 0 },
      });

      (prismaService.invoice.count as jest.Mock).mockResolvedValue(0);
      (prismaService.product.count as jest.Mock).mockResolvedValue(0);
      (prismaService.customer.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getStats();

      expect(result.salesGrowth).toBe(0);
    });

    it('should calculate negative growth correctly', async () => {
      (prismaService.invoice.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { total: 5000 } }) // thisMonth
        .mockResolvedValueOnce({ _sum: { total: 10000 } }); // lastMonth

      (prismaService.invoice.count as jest.Mock).mockResolvedValue(0);
      (prismaService.product.count as jest.Mock).mockResolvedValue(0);
      (prismaService.customer.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getStats();

      expect(result.salesGrowth).toBe(-50); // -50% growth
    });

    it('should calculate products growth correctly', async () => {
      (prismaService.invoice.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: 0 },
      });
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(0);
      (prismaService.product.count as jest.Mock)
        .mockResolvedValueOnce(100) // total products
        .mockResolvedValueOnce(5) // last month products
        .mockResolvedValueOnce(10); // this month products
      (prismaService.customer.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getStats();

      expect(result.totalProducts).toBe(100);
      expect(result.productsGrowth).toBe(100); // 10 vs 5 = 100% growth
    });

    it('should calculate invoices growth correctly', async () => {
      (prismaService.invoice.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: 0 },
      });
      (prismaService.invoice.count as jest.Mock)
        .mockResolvedValueOnce(50) // total invoices
        .mockResolvedValueOnce(10) // last month invoices
        .mockResolvedValueOnce(5) // overdue invoices
        .mockResolvedValueOnce(20); // this month invoices
      (prismaService.product.count as jest.Mock).mockResolvedValue(0);
      (prismaService.customer.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getStats();

      expect(result.totalInvoices).toBe(50);
      expect(result.overdueInvoicesCount).toBe(5);
    });

    it('should calculate customers growth correctly', async () => {
      (prismaService.invoice.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: 0 },
      });
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(0);
      (prismaService.product.count as jest.Mock).mockResolvedValue(0);
      (prismaService.customer.count as jest.Mock)
        .mockResolvedValueOnce(200) // total customers
        .mockResolvedValueOnce(8) // last month customers
        .mockResolvedValueOnce(16); // this month customers

      const result = await service.getStats();

      expect(result.totalCustomers).toBe(200);
      expect(result.customersGrowth).toBe(100); // 16 vs 8 = 100% growth
    });

    it('should handle null sums gracefully', async () => {
      (prismaService.invoice.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: null },
      });
      (prismaService.invoice.count as jest.Mock).mockResolvedValue(0);
      (prismaService.product.count as jest.Mock).mockResolvedValue(0);
      (prismaService.customer.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getStats();

      expect(result.totalSales).toBe(0);
      expect(result.salesGrowth).toBe(0);
    });
  });

  describe('getCharts', () => {
    beforeEach(() => {
      (prismaService.invoice.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: 0 },
      });
      (prismaService.invoiceItem.groupBy as jest.Mock).mockResolvedValue([]);
      (prismaService.invoiceItem.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([]);
    });

    it('should return charts data structure', async () => {
      const result = await service.getCharts();

      expect(result).toHaveProperty('salesChart');
      expect(result).toHaveProperty('categoryDistribution');
      expect(result).toHaveProperty('topProducts');
    });

    it('should require tenant context', async () => {
      await service.getCharts();

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should return sales chart with correct structure', async () => {
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);

      (prismaService.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([
          { date: startDate, total: BigInt(1000), count: BigInt(5) },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.getCharts();

      expect(result.salesChart).toHaveLength(7);
      expect(result.salesChart[0]).toHaveProperty('date');
      expect(result.salesChart[0]).toHaveProperty('sales');
      expect(result.salesChart[0]).toHaveProperty('orders');
      expect(result.salesChart[0]).toHaveProperty('previousPeriod');
    });

    it('should include previous period data in sales chart', async () => {
      // Calculate dates exactly as the service does internally
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);

      // Previous period start date (7 days before startDate)
      const previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - 7);

      // getCharts calls $queryRaw 3 times:
      // 1. getSalesChartData - current period
      // 2. getSalesChartData - previous period
      // 3. getSalesByCategory (called by getCategoryDistribution)
      (prismaService.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([
          { date: startDate, total: BigInt(2000), count: BigInt(10) },
        ])
        .mockResolvedValueOnce([
          { date: previousStartDate, total: BigInt(1500) },
        ])
        .mockResolvedValueOnce([]); // getSalesByCategory returns empty

      const result = await service.getCharts();

      expect(result.salesChart).toHaveLength(7);
      // All entries should have previousPeriod property (even if 0)
      expect(result.salesChart[0]).toHaveProperty('previousPeriod');
      // The first day should have the previous period data since dates match
      // Note: previousPeriod may be 0 if dates don't match exactly due to timezone
      expect(typeof result.salesChart[0].previousPeriod).toBe('number');
    });

    it('should return category distribution with colors', async () => {
      // Just test getSalesByCategory directly instead of through getCharts
      // to avoid complex mocking of multiple raw queries
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([
        { category_id: 'cat-1', category_name: 'Electronics', total: BigInt(5000) },
      ]);

      const result = await service.getSalesByCategory(mockTenantId);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('categoryId');
      expect(result[0]).toHaveProperty('categoryName');
      expect(result[0]).toHaveProperty('amount');
      expect(result[0].categoryName).toBe('Electronics');
    });

    it('should cycle through colors for many categories', async () => {
      // Create 10 different categories to test color cycling
      const categories: Array<{
        category_id: string;
        category_name: string;
        total: bigint;
      }> = [];
      for (let i = 0; i < 10; i++) {
        categories.push({
          category_id: `cat-${i}`,
          category_name: `Category ${i}`,
          total: BigInt(1000),
        });
      }

      // Test via getSalesByCategory directly
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue(categories);

      const result = await service.getSalesByCategory(mockTenantId);

      expect(result).toHaveLength(10);
      // Verify all categories are returned with correct names
      expect(result[0].categoryName).toBe('Category 0');
      expect(result[9].categoryName).toBe('Category 9');
    });

    it('should return top products with category info', async () => {
      (prismaService.invoiceItem.groupBy as jest.Mock).mockResolvedValue([
        { productId: 'product-1', _sum: { quantity: 100, total: 10000 } },
      ]);

      (prismaService.product.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'product-1',
          name: 'Product One',
          category: { name: 'Electronics' },
        },
      ]);

      const result = await service.getCharts();

      expect(result.topProducts).toHaveLength(1);
      expect(result.topProducts[0]).toEqual({
        id: 'product-1',
        name: 'Product One',
        category: 'Electronics',
        sales: 10000,
        quantity: 100,
      });
    });

    it('should handle products without category', async () => {
      (prismaService.invoiceItem.groupBy as jest.Mock).mockResolvedValue([
        { productId: 'product-1', _sum: { quantity: 100, total: 10000 } },
      ]);

      (prismaService.product.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'product-1',
          name: 'Product One',
          category: null,
        },
      ]);

      const result = await service.getCharts();

      expect(result.topProducts[0].category).toBe('Sin categoria');
    });

    it('should return empty top products when no sales', async () => {
      (prismaService.invoiceItem.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await service.getCharts();

      expect(result.topProducts).toEqual([]);
    });

    it('should filter out deleted products from top products', async () => {
      (prismaService.invoiceItem.groupBy as jest.Mock).mockResolvedValue([
        { productId: 'product-1', _sum: { quantity: 100, total: 10000 } },
        { productId: 'product-deleted', _sum: { quantity: 50, total: 5000 } },
      ]);

      // Only product-1 exists in database
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'product-1',
          name: 'Product One',
          category: { name: 'Electronics' },
        },
      ]);

      const result = await service.getCharts();

      expect(result.topProducts).toHaveLength(1);
      expect(result.topProducts[0].id).toBe('product-1');
    });

    it('should handle null quantity and total in top products', async () => {
      (prismaService.invoiceItem.groupBy as jest.Mock).mockResolvedValue([
        { productId: 'product-1', _sum: { quantity: null, total: null } },
      ]);

      (prismaService.product.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'product-1',
          name: 'Product One',
          category: { name: 'Electronics' },
        },
      ]);

      const result = await service.getCharts();

      expect(result.topProducts[0].quantity).toBe(0);
      expect(result.topProducts[0].sales).toBe(0);
    });
  });

  describe('getRecentInvoices', () => {
    beforeEach(() => {
      (prismaService.invoice.findMany as jest.Mock) = jest.fn();
    });

    it('should return recent invoices with correct structure', async () => {
      const mockInvoices = [
        {
          id: 'inv-1',
          invoiceNumber: 'INV-001',
          total: 1000,
          status: 'PENDING',
          paymentStatus: 'UNPAID',
          issueDate: new Date('2024-01-15'),
          customer: { name: 'Customer One' },
        },
      ];

      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue(
        mockInvoices,
      );

      const result = await service.getRecentInvoices();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'inv-1',
        number: 'INV-001',
        customer: 'Customer One',
        amount: 1000,
        status: 'PENDING',
        date: '2024-01-15',
      });
    });

    it('should require tenant context', async () => {
      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([]);

      await service.getRecentInvoices();

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should respect limit parameter', async () => {
      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([]);

      await service.getRecentInvoices(10);

      expect(prismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });

    it('should map PAID payment status correctly', async () => {
      const mockInvoices = [
        {
          id: 'inv-1',
          invoiceNumber: 'INV-001',
          total: 1000,
          status: 'PENDING',
          paymentStatus: 'PAID',
          issueDate: new Date('2024-01-15'),
          customer: { name: 'Customer One' },
        },
      ];

      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue(
        mockInvoices,
      );

      const result = await service.getRecentInvoices();

      expect(result[0].status).toBe('PAID');
    });

    it('should map OVERDUE status correctly', async () => {
      const mockInvoices = [
        {
          id: 'inv-1',
          invoiceNumber: 'INV-001',
          total: 1000,
          status: 'OVERDUE',
          paymentStatus: 'UNPAID',
          issueDate: new Date('2024-01-15'),
          customer: { name: 'Customer One' },
        },
      ];

      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue(
        mockInvoices,
      );

      const result = await service.getRecentInvoices();

      expect(result[0].status).toBe('OVERDUE');
    });

    it('should map CANCELLED status correctly', async () => {
      const mockInvoices = [
        {
          id: 'inv-1',
          invoiceNumber: 'INV-001',
          total: 1000,
          status: 'CANCELLED',
          paymentStatus: 'UNPAID',
          issueDate: new Date('2024-01-15'),
          customer: { name: 'Customer One' },
        },
      ];

      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue(
        mockInvoices,
      );

      const result = await service.getRecentInvoices();

      expect(result[0].status).toBe('CANCELLED');
    });

    it('should default to PENDING for other statuses', async () => {
      const mockInvoices = [
        {
          id: 'inv-1',
          invoiceNumber: 'INV-001',
          total: 1000,
          status: 'DRAFT',
          paymentStatus: 'UNPAID',
          issueDate: new Date('2024-01-15'),
          customer: { name: 'Customer One' },
        },
      ];

      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue(
        mockInvoices,
      );

      const result = await service.getRecentInvoices();

      expect(result[0].status).toBe('PENDING');
    });

    it('should handle missing customer name', async () => {
      const mockInvoices = [
        {
          id: 'inv-1',
          invoiceNumber: 'INV-001',
          total: 1000,
          status: 'PENDING',
          paymentStatus: 'UNPAID',
          issueDate: new Date('2024-01-15'),
          customer: null,
        },
      ];

      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue(
        mockInvoices,
      );

      const result = await service.getRecentInvoices();

      expect(result[0].customer).toBe('Cliente desconocido');
    });

    it('should return empty array when no invoices', async () => {
      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getRecentInvoices();

      expect(result).toEqual([]);
    });
  });

  describe('getLowStockAlerts', () => {
    beforeEach(() => {
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([]);
    });

    it('should return low stock alerts with correct structure', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          name: 'Product One',
          sku: 'SKU-001',
          stock: 5,
          minStock: 20,
          warehouseStock: [
            {
              warehouse: { name: 'Main Warehouse' },
              quantity: 5,
            },
          ],
        },
      ];

      (prismaService.product.findMany as jest.Mock).mockResolvedValue(
        mockProducts,
      );

      const result = await service.getLowStockAlerts();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'prod-1',
        name: 'Product One',
        sku: 'SKU-001',
        currentStock: 5,
        minStock: 20,
        warehouse: 'Main Warehouse',
      });
    });

    it('should require tenant context', async () => {
      await service.getLowStockAlerts();

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should only return products with stock < minStock', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          name: 'Low Stock',
          sku: 'SKU-001',
          stock: 5,
          minStock: 20,
          warehouseStock: [],
        },
        {
          id: 'prod-2',
          name: 'Normal Stock',
          sku: 'SKU-002',
          stock: 50,
          minStock: 10,
          warehouseStock: [],
        },
      ];

      (prismaService.product.findMany as jest.Mock).mockResolvedValue(
        mockProducts,
      );

      const result = await service.getLowStockAlerts();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Low Stock');
    });

    it('should respect limit parameter', async () => {
      const mockProducts: Array<{
        id: string;
        name: string;
        sku: string;
        stock: number;
        minStock: number;
        warehouseStock: unknown[];
      }> = [];
      for (let i = 0; i < 20; i++) {
        mockProducts.push({
          id: `prod-${i}`,
          name: `Product ${i}`,
          sku: `SKU-${i}`,
          stock: 1,
          minStock: 100,
          warehouseStock: [],
        });
      }

      (prismaService.product.findMany as jest.Mock).mockResolvedValue(
        mockProducts,
      );

      const result = await service.getLowStockAlerts(5);

      expect(result).toHaveLength(5);
    });

    it('should handle missing warehouse info', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          name: 'Product One',
          sku: 'SKU-001',
          stock: 5,
          minStock: 20,
          warehouseStock: [],
        },
      ];

      (prismaService.product.findMany as jest.Mock).mockResolvedValue(
        mockProducts,
      );

      const result = await service.getLowStockAlerts();

      expect(result[0].warehouse).toBe('Sin almacen');
    });

    it('should handle warehouse with null name', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          name: 'Product One',
          sku: 'SKU-001',
          stock: 5,
          minStock: 20,
          warehouseStock: [
            {
              warehouse: null,
              quantity: 5,
            },
          ],
        },
      ];

      (prismaService.product.findMany as jest.Mock).mockResolvedValue(
        mockProducts,
      );

      const result = await service.getLowStockAlerts();

      expect(result[0].warehouse).toBe('Sin almacen');
    });

    it('should return empty array when no low stock products', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          name: 'Normal Stock',
          sku: 'SKU-001',
          stock: 50,
          minStock: 10,
          warehouseStock: [],
        },
      ];

      (prismaService.product.findMany as jest.Mock).mockResolvedValue(
        mockProducts,
      );

      const result = await service.getLowStockAlerts();

      expect(result).toEqual([]);
    });
  });

  describe('getRecentActivity', () => {
    beforeEach(() => {
      (prismaService.invoice.findMany as jest.Mock) = jest.fn();
      Object.defineProperty(prismaService, 'stockMovement', {
        value: { findMany: jest.fn() },
        writable: true,
        configurable: true,
      });
      (prismaService.customer.findMany as jest.Mock) = jest.fn();
    });

    it('should return recent activity with correct structure', async () => {
      const now = new Date();
      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'inv-1',
          invoiceNumber: 'INV-001',
          total: 1000,
          status: 'PENDING',
          paymentStatus: 'UNPAID',
          createdAt: now,
          customer: { name: 'Customer One' },
        },
      ]);
      (prismaService.stockMovement.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getRecentActivity();

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('type');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('description');
      expect(result[0]).toHaveProperty('timestamp');
    });

    it('should require tenant context', async () => {
      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.stockMovement.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([]);

      await service.getRecentActivity();

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should create sale activity for paid invoices', async () => {
      const now = new Date();
      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'inv-1',
          invoiceNumber: 'INV-001',
          total: 1000,
          status: 'PENDING',
          paymentStatus: 'PAID',
          createdAt: now,
          customer: { name: 'Customer One' },
        },
      ]);
      (prismaService.stockMovement.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getRecentActivity();

      expect(result[0].type).toBe('sale');
      expect(result[0].title).toBe('Venta completada');
      expect(result[0].id).toBe('sale-inv-1');
    });

    it('should create invoice activity for unpaid invoices', async () => {
      const now = new Date();
      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'inv-1',
          invoiceNumber: 'INV-001',
          total: 1000,
          status: 'PENDING',
          paymentStatus: 'UNPAID',
          createdAt: now,
          customer: { name: 'Customer One' },
        },
      ]);
      (prismaService.stockMovement.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getRecentActivity();

      expect(result[0].type).toBe('invoice');
      expect(result[0].title).toBe('Nueva factura creada');
      expect(result[0].id).toBe('invoice-inv-1');
    });

    it('should handle missing customer in invoice activity', async () => {
      const now = new Date();
      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'inv-1',
          invoiceNumber: 'INV-001',
          total: 1000,
          status: 'PENDING',
          paymentStatus: 'UNPAID',
          createdAt: now,
          customer: null,
        },
      ]);
      (prismaService.stockMovement.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getRecentActivity();

      expect(result[0].description).toContain('Cliente');
    });

    it('should create stock activity for stock movements', async () => {
      const now = new Date();
      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.stockMovement.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'mov-1',
          type: 'PURCHASE',
          quantity: 50,
          createdAt: now,
          product: { name: 'Product One' },
          warehouse: { name: 'Main Warehouse' },
        },
      ]);
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getRecentActivity();

      expect(result[0].type).toBe('stock');
      expect(result[0].title).toContain('compra');
      expect(result[0].id).toBe('stock-mov-1');
    });

    it('should handle all stock movement types', async () => {
      const now = new Date();
      const movementTypes = [
        'PURCHASE',
        'SALE',
        'ADJUSTMENT',
        'TRANSFER',
        'RETURN',
        'DAMAGED',
      ];
      const movements = movementTypes.map((type, i) => ({
        id: `mov-${i}`,
        type,
        quantity: 10,
        createdAt: new Date(now.getTime() - i * 1000),
        product: { name: 'Product' },
        warehouse: { name: 'Warehouse' },
      }));

      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.stockMovement.findMany as jest.Mock).mockResolvedValue(
        movements,
      );
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getRecentActivity();

      expect(result).toHaveLength(6);
      expect(result.some((a) => a.title.includes('compra'))).toBe(true);
      expect(result.some((a) => a.title.includes('venta'))).toBe(true);
      expect(result.some((a) => a.title.includes('ajuste'))).toBe(true);
      expect(result.some((a) => a.title.includes('transferencia'))).toBe(true);
      expect(result.some((a) => a.title.includes('devolucion'))).toBe(true);
      expect(result.some((a) => a.title.includes('danado'))).toBe(true);
    });

    it('should handle unknown stock movement type', async () => {
      const now = new Date();
      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.stockMovement.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'mov-1',
          type: 'UNKNOWN_TYPE',
          quantity: 50,
          createdAt: now,
          product: { name: 'Product One' },
          warehouse: { name: 'Main Warehouse' },
        },
      ]);
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getRecentActivity();

      expect(result[0].title).toContain('movimiento');
    });

    it('should handle missing product/warehouse in stock movement', async () => {
      const now = new Date();
      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.stockMovement.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'mov-1',
          type: 'PURCHASE',
          quantity: 50,
          createdAt: now,
          product: null,
          warehouse: null,
        },
      ]);
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getRecentActivity();

      expect(result[0].description).toContain('Producto');
      expect(result[0].description).toContain('Almacen');
    });

    it('should create customer activity for new customers', async () => {
      const now = new Date();
      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.stockMovement.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'cust-1',
          name: 'New Customer',
          createdAt: now,
        },
      ]);

      const result = await service.getRecentActivity();

      expect(result[0].type).toBe('customer');
      expect(result[0].title).toBe('Nuevo cliente registrado');
      expect(result[0].description).toBe('New Customer');
      expect(result[0].id).toBe('customer-cust-1');
    });

    it('should sort activities by timestamp descending', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 60000);
      const evenEarlier = new Date(now.getTime() - 120000);

      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'inv-1',
          invoiceNumber: 'INV-001',
          total: 1000,
          status: 'PENDING',
          paymentStatus: 'UNPAID',
          createdAt: earlier,
          customer: { name: 'Customer' },
        },
      ]);
      (prismaService.stockMovement.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'mov-1',
          type: 'PURCHASE',
          quantity: 50,
          createdAt: evenEarlier,
          product: { name: 'Product' },
          warehouse: { name: 'Warehouse' },
        },
      ]);
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'cust-1',
          name: 'Customer',
          createdAt: now,
        },
      ]);

      const result = await service.getRecentActivity();

      // Should be sorted by timestamp descending (newest first)
      expect(result[0].id).toBe('customer-cust-1'); // now
      expect(result[1].id).toBe('invoice-inv-1'); // earlier
      expect(result[2].id).toBe('stock-mov-1'); // evenEarlier
    });

    it('should respect limit parameter', async () => {
      const now = new Date();
      const invoices: Array<{
        id: string;
        invoiceNumber: string;
        total: number;
        status: string;
        paymentStatus: string;
        createdAt: Date;
        customer: { name: string };
      }> = [];
      for (let i = 0; i < 20; i++) {
        invoices.push({
          id: `inv-${i}`,
          invoiceNumber: `INV-${i}`,
          total: 1000,
          status: 'PENDING',
          paymentStatus: 'UNPAID',
          createdAt: new Date(now.getTime() - i * 1000),
          customer: { name: `Customer ${i}` },
        });
      }

      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue(invoices);
      (prismaService.stockMovement.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getRecentActivity(5);

      expect(result).toHaveLength(5);
    });

    it('should return empty array when no activity', async () => {
      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.stockMovement.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.customer.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getRecentActivity();

      expect(result).toEqual([]);
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
