import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common';
import { UsersModule } from './users';
import { CategoriesModule } from './categories';
import { ProductsModule } from './products';
import { WarehousesModule } from './warehouses';
import { CustomersModule } from './customers';
import { InvoicesModule } from './invoices';
import { PaymentsModule } from './payments';
import { StockMovementsModule } from './stock-movements';
import { DashboardModule } from './dashboard';
import { configuration, validateEnv } from './config';
import { TenantMiddleware } from './common/middleware';

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
