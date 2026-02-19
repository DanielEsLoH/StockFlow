import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { BankAccountType } from '@prisma/client';

export class CreateBankAccountDto {
  @ApiProperty({
    description: 'Account display name',
    example: 'Bancolombia Corriente',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'El nombre es requerido' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  name: string;

  @ApiProperty({
    description: 'Bank name',
    example: 'Bancolombia',
  })
  @IsString({ message: 'El nombre del banco es requerido' })
  @MinLength(2, { message: 'El nombre del banco debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre del banco no puede exceder 100 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  bankName: string;

  @ApiProperty({
    description: 'Bank account number',
    example: '123-456789-00',
  })
  @IsString({ message: 'El numero de cuenta es requerido' })
  @MinLength(5, { message: 'El numero de cuenta debe tener al menos 5 caracteres' })
  @MaxLength(30, { message: 'El numero de cuenta no puede exceder 30 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  accountNumber: string;

  @ApiProperty({
    description: 'Account type',
    enum: BankAccountType,
    example: 'CHECKING',
  })
  @IsEnum(BankAccountType, {
    message: 'El tipo de cuenta debe ser CHECKING o SAVINGS',
  })
  accountType: BankAccountType;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'COP',
    default: 'COP',
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Initial balance',
    example: 5000000,
    default: 0,
  })
  @IsNumber({}, { message: 'El saldo inicial debe ser un numero' })
  @Min(0, { message: 'El saldo inicial no puede ser negativo' })
  @IsOptional()
  initialBalance?: number;
}
