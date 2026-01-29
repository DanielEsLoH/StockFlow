import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SubscriptionsController } from './subscriptions.controller';
import { WebhooksController } from './webhooks.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionManagementService } from './subscription-management.service';
import { SubscriptionExpiryService } from './subscription-expiry.service';
import { PrismaModule } from '../prisma';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * SubscriptionsModule provides subscription management capabilities.
 *
 * Features:
 * - Plan activation and management (EMPRENDEDOR, PYME, PRO, PLUS)
 * - Subscription periods (MONTHLY, QUARTERLY, ANNUAL)
 * - Subscription expiry handling via cron jobs
 * - Checkout session creation for plan upgrades (Stripe)
 * - Customer portal for subscription management
 * - Webhook handling for Stripe events
 * - Plan limit enforcement
 *
 * Environment variables required:
 * - STRIPE_SECRET_KEY: Your Stripe secret API key
 * - STRIPE_WEBHOOK_SECRET: Webhook signing secret from Stripe
 * - STRIPE_PRICE_BASIC: Price ID for BASIC plan
 * - STRIPE_PRICE_PRO: Price ID for PRO plan
 * - STRIPE_PRICE_ENTERPRISE: Price ID for ENTERPRISE plan
 * - FRONTEND_URL: URL for redirect after checkout/portal (already exists)
 *
 * @example
 * ```typescript
 * // Import in AppModule
 * @Module({
 *   imports: [SubscriptionsModule],
 * })
 * export class AppModule {}
 * ```
 */
@Module({
  imports: [ConfigModule, PrismaModule, NotificationsModule, ScheduleModule.forRoot()],
  controllers: [SubscriptionsController, WebhooksController],
  providers: [
    SubscriptionsService,
    SubscriptionManagementService,
    SubscriptionExpiryService,
  ],
  exports: [SubscriptionsService, SubscriptionManagementService],
})
export class SubscriptionsModule {}
