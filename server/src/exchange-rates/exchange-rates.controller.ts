import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ExchangeRatesService } from './exchange-rates.service';
import {
  CreateExchangeRateDto,
  FilterExchangeRatesDto,
  ConvertAmountDto,
} from './dto';
import { JwtAuthGuard } from '../auth';
import { RequirePermissions, PermissionsGuard } from '../common';
import { Permission } from '../common/permissions/permission.enum';

/**
 * ExchangeRatesController — CRUD for exchange rates + conversion endpoint.
 *
 * nestjs-best-practices applied:
 * - security-use-guards: JWT + permissions guard on all routes
 * - security-validate-all-input: DTOs with class-validator
 * - api-use-dto-serialization: structured DTOs for input
 */
@ApiTags('exchange-rates')
@ApiBearerAuth('JWT-auth')
@Controller('exchange-rates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExchangeRatesController {
  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  @Get('currencies')
  @ApiOperation({ summary: 'Get supported currencies' })
  @ApiResponse({ status: 200, description: 'Supported currencies list' })
  getCurrencies() {
    return this.exchangeRatesService.getSupportedCurrencies();
  }

  @Get()
  @RequirePermissions(Permission.EXCHANGE_RATES_VIEW)
  @ApiOperation({ summary: 'List exchange rates' })
  @ApiQuery({ name: 'fromCurrency', required: false })
  @ApiQuery({ name: 'toCurrency', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Exchange rates listed' })
  findAll(@Query() filters: FilterExchangeRatesDto) {
    return this.exchangeRatesService.findAll(filters);
  }

  @Get('latest')
  @RequirePermissions(Permission.EXCHANGE_RATES_VIEW)
  @ApiOperation({ summary: 'Get latest rate for a currency pair' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  @ApiResponse({ status: 200, description: 'Latest exchange rate' })
  getLatestRate(@Query('from') from: string, @Query('to') to: string) {
    return this.exchangeRatesService.getLatestRate(from as any, to as any);
  }

  @Post()
  @RequirePermissions(Permission.EXCHANGE_RATES_MANAGE)
  @ApiOperation({ summary: 'Create a new exchange rate' })
  @ApiResponse({ status: 201, description: 'Exchange rate created' })
  create(@Body() dto: CreateExchangeRateDto) {
    return this.exchangeRatesService.create(dto);
  }

  @Post('convert')
  @RequirePermissions(Permission.EXCHANGE_RATES_VIEW)
  @ApiOperation({ summary: 'Convert amount between currencies' })
  @ApiResponse({ status: 200, description: 'Amount converted' })
  convert(@Body() dto: ConvertAmountDto) {
    return this.exchangeRatesService.convertAmount(dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.EXCHANGE_RATES_MANAGE)
  @ApiOperation({ summary: 'Delete an exchange rate' })
  @ApiResponse({ status: 200, description: 'Exchange rate deleted' })
  remove(@Param('id') id: string) {
    return this.exchangeRatesService.remove(id);
  }
}
