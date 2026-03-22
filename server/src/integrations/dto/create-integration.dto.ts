import {
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IntegrationPlatform, SyncDirection } from '@prisma/client';

/**
 * DTO for creating a new e-commerce integration.
 *
 * nestjs-best-practices applied:
 * - security-validate-all-input: all fields validated with class-validator
 * - api-use-dto-serialization: proper DTO with Swagger decorators
 */
export class CreateIntegrationDto {
  @ApiProperty({
    description: 'E-commerce platform to integrate with',
    enum: IntegrationPlatform,
    example: 'SHOPIFY',
  })
  @IsEnum(IntegrationPlatform, {
    message: 'La plataforma debe ser SHOPIFY, MERCADOLIBRE, o WOOCOMMERCE',
  })
  platform: IntegrationPlatform;

  @ApiProperty({
    description: 'User-friendly name for this integration',
    example: 'Mi Tienda Shopify',
  })
  @IsString({ message: 'El nombre debe ser texto' })
  name: string;

  @ApiPropertyOptional({
    description: 'Shop URL (required for Shopify and WooCommerce)',
    example: 'https://mitienda.myshopify.com',
  })
  @IsUrl({}, { message: 'La URL de la tienda debe ser una URL válida' })
  @IsOptional()
  shopUrl?: string;

  @ApiPropertyOptional({
    description: 'OAuth access token (from OAuth flow)',
  })
  @IsString()
  @IsOptional()
  accessToken?: string;

  @ApiPropertyOptional({
    description: 'OAuth refresh token',
  })
  @IsString()
  @IsOptional()
  refreshToken?: string;

  @ApiPropertyOptional({
    description: 'Sync direction',
    enum: SyncDirection,
    default: 'BOTH',
  })
  @IsEnum(SyncDirection)
  @IsOptional()
  syncDirection?: SyncDirection;

  @ApiPropertyOptional({
    description: 'Whether to sync products',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  syncProducts?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to sync orders',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  syncOrders?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to sync inventory levels',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  syncInventory?: boolean;
}
