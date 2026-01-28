import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { NotificationsService } from './notifications.service';
import { InAppNotificationsService } from './in-app-notifications.service';
import { NotificationsController } from './notifications.controller';
import { BrevoService } from './mail/brevo.service';

/**
 * NotificationsModule
 *
 * Provides notification functionality for the StockFlow application:
 *
 * 1. Email Notifications (via Brevo):
 *    - Transactional email sending via Brevo API
 *    - Professional HTML email templates with inline CSS
 *    - Scheduled cron jobs for automated notifications
 *    - Manual trigger endpoints for admin users
 *    - Graceful degradation when API key not configured
 *
 * 2. In-App Notifications:
 *    - CRUD operations for in-app notification management
 *    - Paginated listing with filtering by type, priority, and read status
 *    - Bulk operations for marking as read/deleting
 *    - Unread count with breakdown by type and priority
 *
 * Configuration:
 * The module reads email configuration from environment variables:
 * - BREVO_API_KEY: Brevo API key (required for sending emails)
 * - BREVO_SENDER_EMAIL: Default sender email address
 * - BREVO_SENDER_NAME: Default sender display name
 *
 * If BREVO_API_KEY is not configured, the module will still load but
 * email sending will be disabled (logs messages instead).
 *
 * Available Email Types:
 * - Welcome email for new users
 * - Invoice sent notification
 * - Overdue invoice reminder
 * - Payment received confirmation
 * - Low stock alert for admins
 * - Password reset email
 *
 * Scheduled Jobs:
 * - Daily low stock alert at 9:00 AM (America/New_York)
 * - Daily overdue invoice reminder at 10:00 AM (America/New_York)
 */
@Module({
  imports: [
    // Schedule module for cron jobs
    ScheduleModule.forRoot(),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, InAppNotificationsService, BrevoService],
  exports: [NotificationsService, InAppNotificationsService, BrevoService],
})
export class NotificationsModule {}
