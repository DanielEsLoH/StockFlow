import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Nested address DTO for testing nested validation
 */
export class AddressDto {
  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @MinLength(2)
  @MaxLength(2)
  state: string;

  @IsString()
  @MinLength(5)
  @MaxLength(10)
  zipCode: string;
}

/**
 * Test DTO for validating the ValidationPipe implementation
 * Used by the test endpoint in AppController
 *
 * This DTO demonstrates various validation scenarios:
 * - Required fields with different validators
 * - Optional fields with defaults
 * - Nested object validation
 * - Min/max constraints
 *
 * @example
 * Valid request body:
 * ```json
 * {
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "password": "securePassword123",
 *   "age": 25,
 *   "address": {
 *     "street": "123 Main St",
 *     "city": "Springfield",
 *     "state": "IL",
 *     "zipCode": "62701"
 *   }
 * }
 * ```
 */
export class TestValidationDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(150)
  age?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;
}
