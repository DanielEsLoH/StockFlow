import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap, catchError } from 'rxjs';
import { Request } from 'express';
import { AuditAction } from '@prisma/client';
import { AuditLogsService } from './audit-logs.service';
import { PrismaService } from '../prisma';
import { AUDIT_ENTITY_TYPE_KEY, SKIP_AUDIT_KEY } from './decorators';
import { RequestUser } from '../auth';

/**
 * Extended request interface with user and tenantId.
 */
interface AuditRequest extends Request {
  user?: RequestUser;
  tenantId?: string;
}

/**
 * AuditInterceptor automatically logs CREATE, UPDATE, and DELETE operations
 * on entities marked with the @Audit() decorator.
 *
 * Features:
 * - Automatically detects action type from HTTP method
 * - Captures old values before UPDATE/DELETE operations
 * - Captures new values from the response for CREATE/UPDATE
 * - Extracts entity ID from route params or response
 * - Captures IP address and user agent
 * - Respects @SkipAudit() decorator to skip logging
 * - Handles errors gracefully - audit failures don't break main operations
 *
 * Usage:
 * Apply globally in AppModule or per-controller/route.
 *
 * @example
 * ```TypeScript
 * // Controller with audit decorator
 * @Controller('products')
 * @UseInterceptors(AuditInterceptor)
 * export class ProductsController {
 *   @Post()
 *   @Audit('Product')
 *   async create(@Body() dto: CreateProductDto) {
 *     return this.productsService.create(dto);
 *   }
 *
 *   @Patch(':id')
 *   @Audit('Product')
 *   async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
 *     return this.productsService.update(id, dto);
 *   }
 *
 *   @Delete(':id')
 *   @Audit('Product')
 *   async delete(@Param('id') id: string) {
 *     return this.productsService.delete(id);
 *   }
 * }
 * ```
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogsService: AuditLogsService,
    private readonly prisma: PrismaService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    // Check if audit should be skipped
    const skipAudit = this.reflector.getAllAndOverride<boolean>(
      SKIP_AUDIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipAudit) {
      return next.handle();
    }

    // Get entity type from decorator
    const entityType = this.reflector.getAllAndOverride<string>(
      AUDIT_ENTITY_TYPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no audit decorator, skip
    if (!entityType) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuditRequest>();
    const method = request.method.toUpperCase();

    // Determine action type from HTTP method
    const action = this.getActionFromMethod(method);

    // If action type is not auditable, skip
    if (!action) {
      return next.handle();
    }

    // Get entity ID from params (for UPDATE/DELETE)
    const entityId = request.params?.id;

    // Get user and tenant info
    const user = request.user;
    const tenantId = user?.tenantId ?? request.tenantId;

    // If no tenant context, skip (shouldn't happen in normal operation)
    if (!tenantId) {
      this.logger.warn('No tenant context found for audit logging');
      return next.handle();
    }

    // Capture old values for UPDATE and DELETE operations
    let oldValues: Record<string, unknown> | null = null;

    if (
      (action === AuditAction.UPDATE || action === AuditAction.DELETE) &&
      entityId
    ) {
      try {
        oldValues = await this.fetchOldValues(entityType, entityId, tenantId);
      } catch (error) {
        this.logger.warn(
          `Failed to fetch old values for ${entityType} ${entityId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Extract request metadata
    const ipAddress = this.getClientIp(request);
    const userAgent = request.headers['user-agent'] ?? null;

    return next.handle().pipe(
      tap((response: unknown) => {
        // Use void to handle the async function without returning a Promise to tap
        void (async () => {
          try {
            // Extract entity ID from response for CREATE operations
            const finalEntityId =
              entityId ?? this.extractEntityIdFromResponse(response);

            if (!finalEntityId) {
              this.logger.warn(
                `Could not determine entity ID for ${action} ${entityType}`,
              );
              return;
            }

            // Prepare new values from response
            const newValues =
              action === AuditAction.DELETE
                ? null
                : this.extractValuesFromResponse(response);

            // Create audit log
            await this.auditLogsService.create({
              tenantId,
              userId: user?.userId ?? null,
              action,
              entityType,
              entityId: finalEntityId,
              oldValues,
              newValues,
              ipAddress,
              userAgent,
              metadata: {
                method,
                path: request.path,
              },
            });
          } catch (error) {
            // Log error but don't break the response
            this.logger.error(
              `Failed to create audit log: ${error instanceof Error ? error.message : 'Unknown error'}`,
              error instanceof Error ? error.stack : undefined,
            );
          }
        })();
      }),
      catchError((error) => {
        // Re-throw the error without logging audit (operation failed)
        throw error;
      }),
    );
  }

  /**
   * Maps HTTP method to audit action type.
   */
  private getActionFromMethod(method: string): AuditAction | null {
    switch (method) {
      case 'POST':
        return AuditAction.CREATE;
      case 'PUT':
      case 'PATCH':
        return AuditAction.UPDATE;
      case 'DELETE':
        return AuditAction.DELETE;
      default:
        return null;
    }
  }

  /**
   * Fetches old values from the database before update/delete.
   */
  private async fetchOldValues(
    entityType: string,
    entityId: string,
    tenantId: string,
  ): Promise<Record<string, unknown> | null> {
    // Map entity type to Prisma model name
    const modelName = this.getModelName(entityType);

    if (!modelName) {
      return null;
    }

    try {
      // Use dynamic model access - cast through unknown for type safety
      const model = (this.prisma as unknown as Record<string, unknown>)[
        modelName
      ] as
        | {
            findFirst?: (args: {
              where: { id: string; tenantId?: string };
            }) => Promise<Record<string, unknown> | null>;
          }
        | undefined;

      if (!model?.findFirst) {
        return null;
      }

      // Try with tenantId first (most models are tenant-scoped)
      let record = await model.findFirst({
        where: { id: entityId, tenantId },
      });

      // If not found with tenantId, try without (for non-tenant-scoped models)
      if (!record) {
        record = await model.findFirst({
          where: { id: entityId },
        });
      }

      if (!record) {
        return null;
      }

      // Sanitize sensitive fields
      return this.sanitizeValues(record);
    } catch {
      return null;
    }
  }

  /**
   * Maps entity type name to Prisma model name.
   */
  private getModelName(entityType: string): string | null {
    const modelMap: Record<string, string> = {
      User: 'user',
      Product: 'product',
      Category: 'category',
      Warehouse: 'warehouse',
      Customer: 'customer',
      Invoice: 'invoice',
      Payment: 'payment',
      StockMovement: 'stockMovement',
      WarehouseStock: 'warehouseStock',
      Tenant: 'tenant',
    };

    return modelMap[entityType] ?? null;
  }

  /**
   * Extracts entity ID from response object.
   */
  private extractEntityIdFromResponse(response: unknown): string | null {
    if (!response || typeof response !== 'object') {
      return null;
    }

    const responseObj = response as Record<string, unknown>;

    // Try common ID field names
    if (typeof responseObj.id === 'string') {
      return responseObj.id;
    }

    // Try nested data field (for wrapped responses)
    if (responseObj.data && typeof responseObj.data === 'object') {
      const data = responseObj.data as Record<string, unknown>;
      if (typeof data.id === 'string') {
        return data.id;
      }
    }

    return null;
  }

  /**
   * Extracts values from response to store as newValues.
   */
  private extractValuesFromResponse(
    response: unknown,
  ): Record<string, unknown> | null {
    if (!response || typeof response !== 'object') {
      return null;
    }

    const responseObj = response as Record<string, unknown>;

    // Handle wrapped response
    if (responseObj.data && typeof responseObj.data === 'object') {
      return this.sanitizeValues(responseObj.data as Record<string, unknown>);
    }

    return this.sanitizeValues(responseObj);
  }

  /**
   * Sanitizes values by removing sensitive fields.
   */
  private sanitizeValues(
    values: Record<string, unknown>,
  ): Record<string, unknown> {
    const sanitized = { ...values };

    // Remove sensitive fields
    const sensitiveFields = [
      'password',
      'refreshToken',
      'resetToken',
      'resetTokenExpiry',
      'wompiPaymentSourceId',
      'wompiCustomerEmail',
    ];

    sensitiveFields.forEach((field) => {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Extracts client IP address from request.
   */
  private getClientIp(request: AuditRequest): string | null {
    // Check various headers that may contain the real IP
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];
      return ips?.trim() ?? null;
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Fall back to connection IP
    return request.ip ?? request.socket?.remoteAddress ?? null;
  }
}
