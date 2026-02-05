import { Injectable, Logger } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Permission } from './permission.enum';
import { DEFAULT_ROLE_PERMISSIONS, roleHasPermission } from './role-permissions';

export interface UserPermissions {
  role: UserRole;
  permissions: Permission[];
  overrides: {
    granted: Permission[];
    revoked: Permission[];
  };
}

export interface PermissionOverrideDto {
  permission: Permission;
  granted: boolean;
  reason?: string;
}

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  // In-memory cache for permission overrides (keyed by tenantId:userId)
  // Cache entries expire after 5 minutes
  private overrideCache = new Map<string, { data: Map<string, boolean>; expiry: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gets all effective permissions for a user.
   * Combines role defaults with any custom overrides from the database.
   */
  async getUserPermissions(
    userId: string,
    role: UserRole,
    tenantId: string,
  ): Promise<Permission[]> {
    // SUPER_ADMIN always has all permissions
    if (role === UserRole.SUPER_ADMIN) {
      return Object.values(Permission);
    }

    // Get default permissions for role
    const defaultPermissions = new Set(DEFAULT_ROLE_PERMISSIONS[role] || []);

    // Fetch overrides from DB (with caching)
    const overrides = await this.getOverrides(userId, tenantId);

    // Apply overrides
    for (const [permission, granted] of overrides) {
      if (granted) {
        defaultPermissions.add(permission as Permission);
      } else {
        defaultPermissions.delete(permission as Permission);
      }
    }

    return Array.from(defaultPermissions);
  }

  /**
   * Gets detailed permissions info including overrides.
   * Useful for admin UI to show what's default vs customized.
   */
  async getUserPermissionsDetail(
    userId: string,
    role: UserRole,
    tenantId: string,
  ): Promise<UserPermissions> {
    const overrides = await this.getOverrides(userId, tenantId);

    const granted: Permission[] = [];
    const revoked: Permission[] = [];

    for (const [permission, isGranted] of overrides) {
      if (isGranted) {
        granted.push(permission as Permission);
      } else {
        revoked.push(permission as Permission);
      }
    }

    return {
      role,
      permissions: await this.getUserPermissions(userId, role, tenantId),
      overrides: { granted, revoked },
    };
  }

  /**
   * Checks if a user has a specific permission.
   * Optimized for single permission checks (no full permission list).
   */
  async hasPermission(
    userId: string,
    role: UserRole,
    tenantId: string,
    permission: Permission,
  ): Promise<boolean> {
    // SUPER_ADMIN always has all permissions
    if (role === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Check for override first (cached)
    const overrides = await this.getOverrides(userId, tenantId);
    if (overrides.has(permission)) {
      return overrides.get(permission)!;
    }

    // Fall back to role default
    return roleHasPermission(role, permission);
  }

  /**
   * Checks if user has ALL of the specified permissions.
   */
  async hasAllPermissions(
    userId: string,
    role: UserRole,
    tenantId: string,
    permissions: Permission[],
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (!(await this.hasPermission(userId, role, tenantId, permission))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Checks if user has ANY of the specified permissions.
   */
  async hasAnyPermission(
    userId: string,
    role: UserRole,
    tenantId: string,
    permissions: Permission[],
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (await this.hasPermission(userId, role, tenantId, permission)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Grants a permission override to a user.
   * This allows granting permissions beyond what their role provides.
   */
  async grantPermission(
    userId: string,
    tenantId: string,
    permission: Permission,
    grantedBy: string,
    reason?: string,
  ): Promise<void> {
    this.logger.log(
      `Granting permission ${permission} to user ${userId} by ${grantedBy}`,
    );

    await this.prisma.userPermissionOverride.upsert({
      where: { userId_permission: { userId, permission } },
      create: {
        userId,
        tenantId,
        permission,
        granted: true,
        grantedBy,
        reason,
      },
      update: {
        granted: true,
        grantedBy,
        reason,
        updatedAt: new Date(),
      },
    });

    // Invalidate cache
    this.invalidateCache(userId, tenantId);
  }

  /**
   * Revokes a permission from a user.
   * This allows removing permissions that their role would normally grant.
   */
  async revokePermission(
    userId: string,
    tenantId: string,
    permission: Permission,
    grantedBy: string,
    reason?: string,
  ): Promise<void> {
    this.logger.log(
      `Revoking permission ${permission} from user ${userId} by ${grantedBy}`,
    );

    await this.prisma.userPermissionOverride.upsert({
      where: { userId_permission: { userId, permission } },
      create: {
        userId,
        tenantId,
        permission,
        granted: false,
        grantedBy,
        reason,
      },
      update: {
        granted: false,
        grantedBy,
        reason,
        updatedAt: new Date(),
      },
    });

    // Invalidate cache
    this.invalidateCache(userId, tenantId);
  }

  /**
   * Removes a permission override, reverting to role default behavior.
   */
  async removeOverride(
    userId: string,
    tenantId: string,
    permission: Permission,
  ): Promise<void> {
    this.logger.log(
      `Removing permission override ${permission} from user ${userId}`,
    );

    await this.prisma.userPermissionOverride.deleteMany({
      where: { userId, permission },
    });

    // Invalidate cache
    this.invalidateCache(userId, tenantId);
  }

  /**
   * Removes all permission overrides for a user.
   * Useful when resetting a user to role defaults.
   */
  async removeAllOverrides(userId: string, tenantId: string): Promise<void> {
    this.logger.log(`Removing all permission overrides for user ${userId}`);

    await this.prisma.userPermissionOverride.deleteMany({
      where: { userId, tenantId },
    });

    // Invalidate cache
    this.invalidateCache(userId, tenantId);
  }

  /**
   * Sets multiple permission overrides at once.
   * Useful for bulk updates from admin UI.
   */
  async setPermissionOverrides(
    userId: string,
    tenantId: string,
    overrides: PermissionOverrideDto[],
    grantedBy: string,
  ): Promise<void> {
    this.logger.log(
      `Setting ${overrides.length} permission overrides for user ${userId}`,
    );

    // Use transaction for atomicity
    await this.prisma.$transaction(async (tx) => {
      for (const override of overrides) {
        await tx.userPermissionOverride.upsert({
          where: { userId_permission: { userId, permission: override.permission } },
          create: {
            userId,
            tenantId,
            permission: override.permission,
            granted: override.granted,
            grantedBy,
            reason: override.reason,
          },
          update: {
            granted: override.granted,
            grantedBy,
            reason: override.reason,
            updatedAt: new Date(),
          },
        });
      }
    });

    // Invalidate cache
    this.invalidateCache(userId, tenantId);
  }

  /**
   * Gets all permission overrides for a user from the database.
   */
  async getPermissionOverrides(
    userId: string,
    tenantId: string,
  ): Promise<
    Array<{
      permission: string;
      granted: boolean;
      grantedBy: string | null;
      reason: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
    return this.prisma.userPermissionOverride.findMany({
      where: { userId, tenantId },
      select: {
        permission: true,
        granted: true,
        grantedBy: true,
        reason: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Gets all overrides for a user (cached).
   * Returns a Map of permission -> granted.
   */
  private async getOverrides(
    userId: string,
    tenantId: string,
  ): Promise<Map<string, boolean>> {
    const cacheKey = `${tenantId}:${userId}`;

    // Check cache
    const cached = this.overrideCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    // Fetch from DB
    const overrides = await this.prisma.userPermissionOverride.findMany({
      where: { userId, tenantId },
      select: { permission: true, granted: true },
    });

    // Build map
    const overrideMap = new Map<string, boolean>();
    for (const override of overrides) {
      overrideMap.set(override.permission, override.granted);
    }

    // Cache with TTL
    this.overrideCache.set(cacheKey, {
      data: overrideMap,
      expiry: Date.now() + this.CACHE_TTL_MS,
    });

    return overrideMap;
  }

  /**
   * Invalidates cache for a specific user.
   */
  private invalidateCache(userId: string, tenantId: string): void {
    const cacheKey = `${tenantId}:${userId}`;
    this.overrideCache.delete(cacheKey);
  }

  /**
   * Clears the entire cache.
   * Useful for testing or after bulk operations.
   */
  clearCache(): void {
    this.overrideCache.clear();
  }
}
