import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SystemAdminController } from './system-admin.controller';
import { SystemAdminService } from './system-admin.service';
import {
  SystemAdminJwtStrategy,
  SystemAdminJwtRefreshStrategy,
} from './strategies';
import { SystemAdminAuthGuard, SystemAdminRoleGuard } from './guards';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * SystemAdminModule provides system administration functionality including:
 * - System admin authentication (separate from tenant user auth)
 * - User management across all tenants (approve, suspend, delete)
 * - Tenant management (subscription plan changes)
 *
 * Security considerations:
 * - Uses separate JWT secrets (SYSTEM_ADMIN_JWT_SECRET) from tenant users
 * - Implements role-based access control for sensitive operations
 * - All actions are audit logged
 *
 * This module is completely isolated from tenant-specific operations
 * and provides platform-wide administrative capabilities.
 */
@Module({
  imports: [
    // PrismaModule is @Global(), so PrismaService is available without importing
    PassportModule.register({ defaultStrategy: 'system-admin-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const expiration =
          configService.get<string>('SYSTEM_ADMIN_JWT_EXPIRATION') ?? '15m';
        return {
          secret: configService.get<string>('SYSTEM_ADMIN_JWT_SECRET'),
          signOptions: {
            expiresIn: expiration as JwtModuleOptions['signOptions'] extends {
              expiresIn?: infer T;
            }
              ? T
              : never,
          },
        };
      },
    }),
    ConfigModule,
    NotificationsModule,
  ],
  controllers: [SystemAdminController],
  providers: [
    SystemAdminService,
    SystemAdminJwtStrategy,
    SystemAdminJwtRefreshStrategy,
    SystemAdminAuthGuard,
    SystemAdminRoleGuard,
  ],
  exports: [SystemAdminService],
})
export class SystemAdminModule {}
