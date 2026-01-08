import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PaginatedResult, PaginationParams } from './types';
import { getTenantId } from '../common/context';

/**
 * Configuration options for the PrismaService
 */
interface PrismaServiceConfig {
  /**
   * Enable query logging in development mode
   * @default true in non-production environments
   */
  enableQueryLogging?: boolean;

  /**
   * Log slow queries that exceed this threshold (in milliseconds)
   * @default 1000
   */
  slowQueryThreshold?: number;
}

/**
 * PrismaService
 *
 * A NestJS-integrated Prisma client that provides:
 * - Automatic connection management via lifecycle hooks
 * - Development query logging for debugging
 * - Slow query detection and logging
 * - Helper methods for common operations (pagination, transactions)
 * - Multi-tenant query scoping utilities
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UsersService {
 *   constructor(private readonly prisma: PrismaService) {}
 *
 *   async findAll(tenantId: string) {
 *     return this.prisma.user.findMany({
 *       where: { tenantId },
 *     });
 *   }
 * }
 * ```
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly serviceConfig: Required<PrismaServiceConfig>;
  private readonly pool: Pool;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    const enableQueryLogging =
      process.env.PRISMA_QUERY_LOGGING === 'true' || !isProduction;
    const slowQueryThreshold = parseInt(
      process.env.PRISMA_SLOW_QUERY_THRESHOLD ?? '1000',
      10,
    );

    // Create the PostgreSQL connection pool
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Create the Prisma PostgreSQL adapter
    const adapter = new PrismaPg(pool);

    // Build Prisma client options
    const prismaOptions: Prisma.PrismaClientOptions = {
      adapter,
    };

    // Enable query logging in development
    if (enableQueryLogging) {
      prismaOptions.log = [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ];
    }

    super(prismaOptions);

    this.pool = pool;
    this.serviceConfig = {
      enableQueryLogging,
      slowQueryThreshold,
    };

    // Set up event listeners for query logging
    if (enableQueryLogging) {
      this.setupQueryLogging();
    }
  }

  /**
   * Sets up query logging event listeners for development debugging
   */
  private setupQueryLogging(): void {
    // Type assertion needed because Prisma's event typing is complex
    const client = this as PrismaClient<{
      log: [
        { emit: 'event'; level: 'query' },
        { emit: 'event'; level: 'info' },
        { emit: 'event'; level: 'warn' },
        { emit: 'event'; level: 'error' },
      ];
    }>;

    // Log all queries with their duration
    client.$on('query', (e: Prisma.QueryEvent) => {
      const duration = e.duration;
      const query = e.query;
      const params = e.params;

      // Warn about slow queries
      if (duration > this.serviceConfig.slowQueryThreshold) {
        this.logger.warn(
          `Slow query detected (${duration}ms): ${query}`,
          params,
        );
      } else {
        this.logger.debug(`Query (${duration}ms): ${query}`, params);
      }
    });

    // Log info messages
    client.$on('info', (e: Prisma.LogEvent) => {
      this.logger.log(e.message);
    });

    // Log warnings
    client.$on('warn', (e: Prisma.LogEvent) => {
      this.logger.warn(e.message);
    });

    // Log errors
    client.$on('error', (e: Prisma.LogEvent) => {
      this.logger.error(e.message);
    });
  }

  /**
   * Connects to the database when the module initializes
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to database');

      if (this.serviceConfig.enableQueryLogging) {
        this.logger.log('Query logging enabled (development mode)');
      }
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  /**
   * Disconnects from the database when the module is destroyed
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
    this.logger.log('Disconnected from database');
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Executes a callback within a database transaction
   *
   * @param fn - Callback function that receives a transaction client
   * @returns The result of the callback function
   *
   * @example
   * ```typescript
   * const result = await this.prisma.executeInTransaction(async (tx) => {
   *   const user = await tx.user.create({ data: userData });
   *   await tx.auditLog.create({ data: { action: 'USER_CREATED', userId: user.id } });
   *   return user;
   * });
   * ```
   */
  async executeInTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    },
  ): Promise<T> {
    return this.$transaction(fn, options);
  }

  /**
   * Creates a paginated result from a query
   *
   * @param model - The Prisma model delegate to query
   * @param params - Pagination parameters
   * @param where - Where clause for filtering
   * @param options - Additional query options
   * @returns Paginated result with metadata
   *
   * @example
   * ```typescript
   * const result = await this.prisma.paginate(
   *   this.prisma.user,
   *   { skip: 0, take: 10 },
   *   { tenantId: 'tenant-123', status: 'ACTIVE' },
   *   { orderBy: { createdAt: 'desc' }, include: { profile: true } }
   * );
   * ```
   */
  async paginate<T, TWhereInput>(
    model: {
      findMany: (args: {
        where?: TWhereInput;
        skip?: number;
        take?: number;
        orderBy?: unknown;
        include?: unknown;
      }) => Promise<T[]>;
      count: (args: { where?: TWhereInput }) => Promise<number>;
    },
    params: PaginationParams,
    where?: TWhereInput,
    options?: {
      orderBy?: unknown;
      include?: unknown;
    },
  ): Promise<PaginatedResult<T>> {
    const skip = params.skip ?? 0;
    const take = params.take ?? 10;
    const page = Math.floor(skip / take) + 1;

    const [data, total] = await Promise.all([
      model.findMany({
        where,
        skip,
        take,
        orderBy: options?.orderBy,
        include: options?.include,
      }),
      model.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize: take,
      totalPages: Math.ceil(total / take),
    };
  }

  /**
   * Checks if a record exists
   *
   * @param model - The Prisma model delegate to query
   * @param where - Where clause for filtering
   * @returns True if the record exists, false otherwise
   *
   * @example
   * ```typescript
   * const exists = await this.prisma.exists(
   *   this.prisma.user,
   *   { email: 'user@example.com', tenantId: 'tenant-123' }
   * );
   * ```
   */
  async exists<TWhereInput>(
    model: {
      count: (args: { where?: TWhereInput }) => Promise<number>;
    },
    where: TWhereInput,
  ): Promise<boolean> {
    const count = await model.count({ where });
    return count > 0;
  }

  /**
   * Soft deletes are not built into Prisma, but this helper can be used
   * to implement soft delete patterns consistently across models that have
   * a deletedAt field.
   *
   * Note: Requires models to have a deletedAt DateTime? field
   *
   * @example
   * ```typescript
   * await this.prisma.softDelete(this.prisma.user, { id: 'user-123' });
   * ```
   */
  async softDelete<TWhereUniqueInput, TUpdateInput>(
    model: {
      update: (args: {
        where: TWhereUniqueInput;
        data: TUpdateInput;
      }) => Promise<unknown>;
    },
    where: TWhereUniqueInput,
  ): Promise<void> {
    await model.update({
      where,
      data: { deletedAt: new Date() } as TUpdateInput,
    });
  }

  /**
   * Utility to check database health/connectivity
   * Useful for health check endpoints
   *
   * @returns Object with connected status and optional error
   */
  async healthCheck(): Promise<{ connected: boolean; error?: string }> {
    try {
      await this.$queryRaw`SELECT 1`;
      return { connected: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown database error';
      return { connected: false, error: message };
    }
  }

  // ============================================================================
  // MULTI-TENANT HELPERS
  // ============================================================================

  /**
   * List of Prisma model names that are tenant-scoped (have tenantId field).
   * These models require tenant filtering for data isolation.
   *
   * Models NOT in this list:
   * - Tenant: The tenant itself (no tenantId field)
   * - InvoiceItem: Linked through Invoice, inherits tenant scope
   */
  static readonly TENANT_SCOPED_MODELS = [
    'user',
    'product',
    'category',
    'customer',
    'warehouse',
    'warehouseStock',
    'invoice',
    'payment',
    'stockMovement',
  ] as const;

  /**
   * Type for tenant-scoped model names
   */
  static isTenantScopedModel(
    modelName: string,
  ): modelName is (typeof PrismaService.TENANT_SCOPED_MODELS)[number] {
    return (PrismaService.TENANT_SCOPED_MODELS as readonly string[]).includes(
      modelName.toLowerCase(),
    );
  }

  /**
   * Gets the current tenant ID from AsyncLocalStorage context.
   *
   * This is useful when you need to access the tenant ID in services
   * without explicitly passing it through method parameters.
   *
   * @returns The current tenant ID, or undefined if not in a tenant context
   *
   * @example
   * ```typescript
   * const tenantId = this.prisma.getCurrentTenantId();
   * if (!tenantId) {
   *   throw new UnauthorizedException('Tenant context required');
   * }
   * ```
   */
  getCurrentTenantId(): string | undefined {
    return getTenantId();
  }

  /**
   * Requires that a tenant context is present and returns the tenant ID.
   *
   * @throws Error if no tenant context is available
   * @returns The current tenant ID
   *
   * @example
   * ```typescript
   * const tenantId = this.prisma.requireTenantId();
   * // tenantId is guaranteed to be a string here
   * ```
   */
  requireTenantId(): string {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new Error(
        'Tenant context required but not found. Ensure TenantMiddleware is applied and user is authenticated.',
      );
    }
    return tenantId;
  }

  /**
   * Creates a where clause with automatic tenant filtering.
   *
   * This helper merges the provided where clause with the current tenant ID
   * from AsyncLocalStorage, ensuring all queries are properly scoped.
   *
   * @param where - The original where clause
   * @returns The where clause with tenantId added
   *
   * @example
   * ```typescript
   * // In a service
   * async findProducts(filters: ProductFilters) {
   *   return this.prisma.product.findMany({
   *     where: this.prisma.withTenantScope({
   *       status: filters.status,
   *       categoryId: filters.categoryId,
   *     }),
   *   });
   * }
   * ```
   */
  withTenantScope<T extends Record<string, unknown>>(
    where?: T,
  ): T & { tenantId: string } {
    const tenantId = this.requireTenantId();
    return {
      ...(where ?? ({} as T)),
      tenantId,
    };
  }

  /**
   * Creates data for insert operations with automatic tenant ID injection.
   *
   * This helper adds the current tenant ID to the data object,
   * ensuring new records are properly associated with the tenant.
   *
   * @param data - The data object to create
   * @returns The data object with tenantId added
   *
   * @example
   * ```typescript
   * // In a service
   * async createProduct(dto: CreateProductDto) {
   *   return this.prisma.product.create({
   *     data: this.prisma.withTenantData({
   *       name: dto.name,
   *       sku: dto.sku,
   *       price: dto.price,
   *     }),
   *   });
   * }
   * ```
   */
  withTenantData<T extends Record<string, unknown>>(
    data: T,
  ): T & { tenantId: string } {
    const tenantId = this.requireTenantId();
    return {
      ...data,
      tenantId,
    };
  }

  /**
   * Validates that a record belongs to the current tenant.
   *
   * This is useful for update/delete operations where you need to verify
   * ownership before making changes.
   *
   * @param record - The record to validate (must have tenantId property)
   * @throws Error if the record does not belong to the current tenant
   *
   * @example
   * ```typescript
   * // In a service
   * async updateProduct(id: string, dto: UpdateProductDto) {
   *   const product = await this.prisma.product.findUnique({ where: { id } });
   *   if (!product) throw new NotFoundException();
   *
   *   this.prisma.validateTenantOwnership(product);
   *
   *   return this.prisma.product.update({
   *     where: { id },
   *     data: dto,
   *   });
   * }
   * ```
   */
  validateTenantOwnership(record: { tenantId: string }): void {
    const currentTenantId = this.requireTenantId();
    if (record.tenantId !== currentTenantId) {
      throw new Error('Access denied: Record belongs to a different tenant.');
    }
  }
}
