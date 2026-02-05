import { Global, Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsGuard } from '../guards/permissions.guard';

/**
 * Global module for permissions management.
 * Provides PermissionsService and PermissionsGuard to all modules.
 */
@Global()
@Module({
  providers: [PermissionsService, PermissionsGuard],
  exports: [PermissionsService, PermissionsGuard],
})
export class PermissionsModule {}
