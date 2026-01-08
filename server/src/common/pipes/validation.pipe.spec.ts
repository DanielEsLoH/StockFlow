import { ArgumentMetadata, BadRequestException, Logger } from '@nestjs/common';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  IsInt,
  Min,
  Max,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CustomValidationPipe,
  ValidationErrorResponse,
} from './validation.pipe';

// Test DTOs
class SimpleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;
}

class DtoWithMinLength {
  @IsString()
  @MinLength(8)
  password: string;
}

class DtoWithNumberConstraints {
  @IsInt()
  @Min(1)
  @Max(100)
  value: number;
}

class DtoWithOptionalField {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

class NestedAddressDto {
  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  city: string;
}

class DtoWithNestedObject {
  @IsString()
  @IsNotEmpty()
  name: string;

  @ValidateNested()
  @Type(() => NestedAddressDto)
  address: NestedAddressDto;
}

describe('CustomValidationPipe', () => {
  let pipe: CustomValidationPipe;

  beforeEach(() => {
    pipe = new CustomValidationPipe();

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(pipe).toBeDefined();
    });

    it('should accept custom options', () => {
      const customPipe = new CustomValidationPipe({
        whitelist: false,
        forbidNonWhitelisted: false,
        transform: false,
        enableImplicitConversion: false,
      });
      expect(customPipe).toBeDefined();
    });
  });

  describe('transform - successful validation', () => {
    it('should pass validation for valid SimpleDto', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: SimpleDto,
        data: '',
      };

      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const result = await pipe.transform(validData, metadata);

      expect(result).toBeInstanceOf(SimpleDto);
      expect((result as SimpleDto).name).toBe('John Doe');
      expect((result as SimpleDto).email).toBe('john@example.com');
    });

    it('should pass validation with optional field provided', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: DtoWithOptionalField,
        data: '',
      };

      const validData = {
        name: 'John',
        description: 'A description',
      };

      const result = await pipe.transform(validData, metadata);

      expect(result).toBeInstanceOf(DtoWithOptionalField);
      expect((result as DtoWithOptionalField).description).toBe(
        'A description',
      );
    });

    it('should pass validation with optional field omitted', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: DtoWithOptionalField,
        data: '',
      };

      const validData = {
        name: 'John',
      };

      const result = await pipe.transform(validData, metadata);

      expect(result).toBeInstanceOf(DtoWithOptionalField);
      expect((result as DtoWithOptionalField).description).toBeUndefined();
    });

    it('should pass validation with nested objects', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: DtoWithNestedObject,
        data: '',
      };

      const validData = {
        name: 'John',
        address: {
          street: '123 Main St',
          city: 'Springfield',
        },
      };

      const result = await pipe.transform(validData, metadata);

      expect(result).toBeInstanceOf(DtoWithNestedObject);
      expect((result as DtoWithNestedObject).address).toBeInstanceOf(
        NestedAddressDto,
      );
    });
  });

  describe('transform - skip validation', () => {
    it('should skip validation for primitive string type', async () => {
      const metadata: ArgumentMetadata = {
        type: 'param',
        metatype: String,
        data: 'id',
      };

      const result = await pipe.transform('test-value', metadata);

      expect(result).toBe('test-value');
    });

    it('should skip validation for primitive number type', async () => {
      const metadata: ArgumentMetadata = {
        type: 'param',
        metatype: Number,
        data: 'id',
      };

      const result = await pipe.transform(123, metadata);

      expect(result).toBe(123);
    });

    it('should skip validation for primitive boolean type', async () => {
      const metadata: ArgumentMetadata = {
        type: 'query',
        metatype: Boolean,
        data: 'active',
      };

      const result = await pipe.transform(true, metadata);

      expect(result).toBe(true);
    });

    it('should skip validation when no metatype is provided', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        data: '',
      };

      const data = { anything: 'goes' };
      const result = await pipe.transform(data, metadata);

      expect(result).toEqual(data);
    });

    it('should skip validation for Array type', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: Array,
        data: '',
      };

      const data = [1, 2, 3];
      const result = await pipe.transform(data, metadata);

      expect(result).toEqual(data);
    });

    it('should skip validation for Object type', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: Object,
        data: '',
      };

      const data = { key: 'value' };
      const result = await pipe.transform(data, metadata);

      expect(result).toEqual(data);
    });
  });

  describe('transform - validation failures', () => {
    it('should throw BadRequestException for missing required field', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: SimpleDto,
        data: '',
      };

      const invalidData = {
        name: 'John',
        // email is missing
      };

      await expect(pipe.transform(invalidData, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid email format', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: SimpleDto,
        data: '',
      };

      const invalidData = {
        name: 'John',
        email: 'not-an-email',
      };

      await expect(pipe.transform(invalidData, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when string is too short', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: DtoWithMinLength,
        data: '',
      };

      const invalidData = {
        password: '123', // Less than 8 characters
      };

      await expect(pipe.transform(invalidData, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when number is below minimum', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: DtoWithNumberConstraints,
        data: '',
      };

      const invalidData = {
        value: 0, // Min is 1
      };

      await expect(pipe.transform(invalidData, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when number exceeds maximum', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: DtoWithNumberConstraints,
        data: '',
      };

      const invalidData = {
        value: 150, // Max is 100
      };

      await expect(pipe.transform(invalidData, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for empty required field', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: SimpleDto,
        data: '',
      };

      const invalidData = {
        name: '', // Empty string
        email: 'john@example.com',
      };

      await expect(pipe.transform(invalidData, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('error response format', () => {
    /**
     * Helper to extract error response from BadRequestException
     */
    async function getErrorResponse(
      invalidData: unknown,
      metatype: new () => unknown,
    ): Promise<ValidationErrorResponse> {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype,
        data: '',
      };

      try {
        await pipe.transform(invalidData, metadata);
        throw new Error('Expected BadRequestException to be thrown');
      } catch (error) {
        if (error instanceof BadRequestException) {
          return error.getResponse() as ValidationErrorResponse;
        }
        throw error;
      }
    }

    it('should include "Validation Failed" as error type', async () => {
      const errorResponse = await getErrorResponse(
        { name: 'John' }, // missing email
        SimpleDto,
      );

      expect(errorResponse.error).toBe('Validation Failed');
    });

    it('should include message array with all validation errors', async () => {
      const errorResponse = await getErrorResponse(
        { name: '', email: 'invalid' },
        SimpleDto,
      );

      expect(Array.isArray(errorResponse.message)).toBe(true);
      expect(errorResponse.message.length).toBeGreaterThan(0);
    });

    it('should include validationErrors array with field details', async () => {
      const errorResponse = await getErrorResponse(
        { name: 'John', email: 'invalid-email' },
        SimpleDto,
      );

      expect(Array.isArray(errorResponse.validationErrors)).toBe(true);
      expect(errorResponse.validationErrors.length).toBeGreaterThan(0);
    });

    it('should include field name in validationErrors', async () => {
      const errorResponse = await getErrorResponse(
        { name: 'John', email: 'invalid' },
        SimpleDto,
      );

      const emailError = errorResponse.validationErrors.find(
        (e) => e.field === 'email',
      );
      expect(emailError).toBeDefined();
      expect(emailError?.field).toBe('email');
    });

    it('should include field value in validationErrors', async () => {
      const errorResponse = await getErrorResponse(
        { name: 'John', email: 'invalid-email' },
        SimpleDto,
      );

      const emailError = errorResponse.validationErrors.find(
        (e) => e.field === 'email',
      );
      expect(emailError?.value).toBe('invalid-email');
    });

    it('should include constraints array in validationErrors', async () => {
      const errorResponse = await getErrorResponse(
        { name: 'John', email: 'invalid' },
        SimpleDto,
      );

      const emailError = errorResponse.validationErrors.find(
        (e) => e.field === 'email',
      );
      expect(Array.isArray(emailError?.constraints)).toBe(true);
      expect(emailError?.constraints.length).toBeGreaterThan(0);
    });

    it('should handle multiple validation errors on same object', async () => {
      const errorResponse = await getErrorResponse(
        { name: '', email: 'invalid' },
        SimpleDto,
      );

      expect(errorResponse.validationErrors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('nested object validation errors', () => {
    it('should include nested field path in error', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: DtoWithNestedObject,
        data: '',
      };

      const invalidData = {
        name: 'John',
        address: {
          street: '', // Invalid - empty
          city: 'Springfield',
        },
      };

      try {
        await pipe.transform(invalidData, metadata);
        fail('Expected BadRequestException');
      } catch (error) {
        if (error instanceof BadRequestException) {
          const response = error.getResponse() as ValidationErrorResponse;
          const streetError = response.validationErrors.find((e) =>
            e.field.includes('street'),
          );
          expect(streetError).toBeDefined();
          expect(streetError?.field).toBe('address.street');
        } else {
          throw error;
        }
      }
    });

    it('should handle multiple nested validation errors', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: DtoWithNestedObject,
        data: '',
      };

      const invalidData = {
        name: 'John',
        address: {
          street: '', // Invalid
          city: '', // Invalid
        },
      };

      try {
        await pipe.transform(invalidData, metadata);
        fail('Expected BadRequestException');
      } catch (error) {
        if (error instanceof BadRequestException) {
          const response = error.getResponse() as ValidationErrorResponse;
          const addressErrors = response.validationErrors.filter((e) =>
            e.field.startsWith('address.'),
          );
          expect(addressErrors.length).toBeGreaterThanOrEqual(2);
        } else {
          throw error;
        }
      }
    });
  });

  describe('transform option', () => {
    it('should return transformed class instance when transform is true', async () => {
      const transformPipe = new CustomValidationPipe({ transform: true });
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: SimpleDto,
        data: '',
      };

      const result = await transformPipe.transform(
        { name: 'John', email: 'john@example.com' },
        metadata,
      );

      expect(result).toBeInstanceOf(SimpleDto);
    });

    it('should return original value when transform is false', async () => {
      const noTransformPipe = new CustomValidationPipe({ transform: false });
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: SimpleDto,
        data: '',
      };

      const originalData = { name: 'John', email: 'john@example.com' };
      const result = await noTransformPipe.transform(originalData, metadata);

      expect(result).toBe(originalData);
      expect(result).not.toBeInstanceOf(SimpleDto);
    });
  });

  describe('logging', () => {
    it('should log debug message when validation fails', async () => {
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: SimpleDto,
        data: '',
      };

      try {
        await pipe.transform({ name: 'John', email: 'invalid' }, metadata);
      } catch {
        // Expected to throw
      }

      expect(debugSpy).toHaveBeenCalled();
    });
  });
});
