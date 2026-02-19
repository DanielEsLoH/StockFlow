import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { AccountType, AccountNature } from '@prisma/client';

export class CreateAccountDto {
  @ApiProperty({
    description: 'Account code (PUC format)',
    example: '110505',
    minLength: 1,
    maxLength: 10,
  })
  @IsString({ message: 'El codigo debe ser una cadena de texto' })
  @MinLength(1, { message: 'El codigo es requerido' })
  @MaxLength(10, { message: 'El codigo no puede exceder 10 caracteres' })
  @Matches(/^\d+$/, { message: 'El codigo debe contener solo numeros' })
  @Transform(({ value }: { value: string }) => value?.trim())
  code: string;

  @ApiProperty({
    description: 'Account name',
    example: 'Caja General',
    minLength: 2,
    maxLength: 150,
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(150, { message: 'El nombre no puede exceder 150 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  name: string;

  @ApiPropertyOptional({ description: 'Account description' })
  @IsString({ message: 'La descripcion debe ser una cadena de texto' })
  @IsOptional()
  @Transform(({ value }: { value: string }) => value?.trim())
  description?: string;

  @ApiProperty({
    description: 'Account type',
    enum: AccountType,
    example: 'ASSET',
  })
  @IsEnum(AccountType, {
    message: 'El tipo de cuenta debe ser ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE o COGS',
  })
  type: AccountType;

  @ApiProperty({
    description: 'Account nature (debit or credit)',
    enum: AccountNature,
    example: 'DEBIT',
  })
  @IsEnum(AccountNature, {
    message: 'La naturaleza debe ser DEBIT o CREDIT',
  })
  nature: AccountNature;

  @ApiPropertyOptional({
    description: 'Parent account ID for hierarchy',
  })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Whether this is a bank account',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isBankAccount?: boolean;
}
