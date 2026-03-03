import { Module } from '@nestjs/common';
import { ExchangeRatesController } from './exchange-rates.controller';
import { ExchangeRatesService } from './exchange-rates.service';

/**
 * ExchangeRatesModule — manages multi-currency exchange rates.
 *
 * Dependencies:
 * - PrismaModule: Database access (global)
 * - CommonModule: TenantContextService, guards (global)
 * - PermissionsModule: Permission-based access (global)
 */
@Module({
  controllers: [ExchangeRatesController],
  providers: [ExchangeRatesService],
  exports: [ExchangeRatesService],
})
export class ExchangeRatesModule {}
