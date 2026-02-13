import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SubscriptionsController } from './subscriptions.controller';
import { WebhooksController } from './webhooks.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionManagementService } from './subscription-management.service';
import { SubscriptionExpiryService } from './subscription-expiry.service';
import { SubscriptionBillingService } from './subscription-billing.service';
import { WompiService } from './wompi.service';
import { PrismaModule } from '../prisma';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * SubscriptionsModule provides subscription management capabilities.
 *
 * Features:
 * - Plan activation and management (EMPRENDEDOR, PYME, PRO, PLUS)
 * - Subscription periods (MONTHLY, QUARTERLY, ANNUAL)
 * - Subscription expiry handling via cron jobs
 * - Wompi checkout widget configuration for plan upgrades
 * - Wompi payment verification and subscription activation
 * - Recurring billing via stored payment sources
 * - Webhook handling for Wompi events
 * - Plan limit enforcement
 *
 * Optional environment variables:
 * - WOMPI_PUBLIC_KEY: Wompi public API key (pub_test_... or pub_prod_...)
 * - WOMPI_PRIVATE_KEY: Wompi private API key (prv_test_... or prv_prod_...)
 * - WOMPI_EVENT_SECRET: Wompi webhook event signing secret
 * - WOMPI_INTEGRITY_SECRET: Wompi checkout widget integrity secret
 * - FRONTEND_URL: URL for redirect after checkout (already exists)
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    NotificationsModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [SubscriptionsController, WebhooksController],
  providers: [
    WompiService,
    SubscriptionsService,
    SubscriptionManagementService,
    SubscriptionExpiryService,
    SubscriptionBillingService,
  ],
  exports: [SubscriptionsService, SubscriptionManagementService],
})
export class SubscriptionsModule {}
