// Module
export { NotificationsModule } from './notifications.module';

// Services - Email Notifications
export { NotificationsService } from './notifications.service';
export type {
  WelcomeEmailUser,
  InvoiceEmailData,
  PaymentEmailData,
  LowStockProduct,
} from './notifications.service';

// Services - In-App Notifications
export { InAppNotificationsService } from './in-app-notifications.service';
export type {
  NotificationResponse,
  PaginatedNotificationsResponse,
  UnreadCountResponse,
  BulkOperationResult,
} from './in-app-notifications.service';

// Mail Service
export { MailService } from './mail/mail.service';
export type {
  EmailContext,
  SendMailOptions,
  SendMailResult,
} from './mail/mail.service';

// DTOs
export {
  FilterNotificationsDto,
  CreateNotificationDto,
  BulkNotificationIdsDto,
} from './dto';

// Entities
export {
  NotificationEntity,
  PaginatedNotificationsEntity,
  UnreadCountEntity,
  BulkOperationResultEntity,
  NotificationPaginationMeta,
} from './entities/notification.entity';
