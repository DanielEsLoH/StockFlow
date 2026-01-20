import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

/**
 * InvitationsModule provides functionality for managing user invitations.
 *
 * Features:
 * - Create invitations with secure tokens
 * - Send invitation emails via Brevo
 * - List, cancel, and resend invitations
 * - Automatic expiration via scheduled cron job
 * - Role-based access (ADMIN and SUPER_ADMIN only)
 *
 * Dependencies:
 * - PrismaModule (global) - Database access
 * - NotificationsModule - Email sending via Brevo
 * - AuthModule - JWT authentication and guards
 * - ScheduleModule - Cron job for expiring old invitations
 *
 * This module exports InvitationsService for use by other modules
 * that need to handle invitation acceptance (e.g., auth module for
 * accepting invitations and creating users).
 */
@Module({
  imports: [
    // Schedule module for the expiration cron job
    ScheduleModule.forRoot(),
    // Notifications module for sending invitation emails
    NotificationsModule,
    // Auth module for guards and authentication (use forwardRef to handle circular dependency)
    forwardRef(() => AuthModule),
  ],
  controllers: [InvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
