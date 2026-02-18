import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common';
import { ArcjetModule } from './arcjet';
import { ThrottlerModule } from './throttler';
import { CacheModule } from './cache';
import { UsersModule } from './users';
import { CategoriesModule } from './categories';
import { ProductsModule } from './products';
import { WarehousesModule } from './warehouses';
import { CustomersModule } from './customers';
import { InvoicesModule } from './invoices';
import { PaymentsModule } from './payments';
import { StockMovementsModule } from './stock-movements';
import { DashboardModule } from './dashboard';
import { ReportsModule } from './reports';
import { NotificationsModule } from './notifications';
import { UploadModule } from './upload';
import { SubscriptionsModule } from './subscriptions';
import { AuditLogsModule } from './audit-logs';
import { HealthModule } from './health';
import { SystemAdminModule } from './system-admin';
import { InvitationsModule } from './invitations';
import { CashRegistersModule } from './cash-registers';
import { POSSessionsModule } from './pos-sessions';
import { POSSalesModule } from './pos-sales';
import { DianModule } from './dian';
import { QuotationsModule } from './quotations';
import { configuration, validateEnv } from './config';
import { TenantMiddleware } from './common/middleware';
import { PermissionsModule } from './common/permissions';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
      validate: validateEnv,
    }),
    PrismaModule,
    CommonModule,
    PermissionsModule,
    CacheModule,
    ThrottlerModule,
    ArcjetModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    WarehousesModule,
    CustomersModule,
    InvoicesModule,
    PaymentsModule,
    StockMovementsModule,
    DashboardModule,
    ReportsModule,
    NotificationsModule,
    UploadModule,
    SubscriptionsModule,
    AuditLogsModule,
    HealthModule,
    SystemAdminModule,
    InvitationsModule,
    CashRegistersModule,
    POSSessionsModule,
    POSSalesModule,
    DianModule,
    QuotationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  /**
   * Configure middleware for the application.
   *
   * TenantMiddleware is applied to all routes ('*') to:
   * 1. Extract tenant context from authenticated requests
   * 2. Store tenant context in AsyncLocalStorage for access throughout the request
   * 3. Attach tenantId directly to the request object for controller access
   *
   * Note: For authenticated routes, this middleware works in conjunction with
   * JwtAuthGuard which must be applied at the controller/route level to
   * populate the user object on the request.
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
