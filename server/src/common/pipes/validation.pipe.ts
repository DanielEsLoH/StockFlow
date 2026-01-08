import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';

/**
 * Structured validation error format
 * Provides detailed field-level error information for API consumers
 */
export interface ValidationErrorDetail {
  field: string;
  value: unknown;
  constraints: string[];
}

/**
 * Enhanced validation response format
 * Consistent with the ErrorResponse format used by exception filters
 */
export interface ValidationErrorResponse {
  message: string[];
  error: string;
  validationErrors: ValidationErrorDetail[];
}

/**
 * CustomValidationPipe
 *
 * An enhanced validation pipe that provides detailed, structured error messages
 * when validation fails. This pipe integrates with class-validator and class-transformer
 * to provide comprehensive validation with consistent error formatting.
 *
 * Features:
 * - Detailed field-level error messages
 * - Nested object validation support
 * - Automatic type transformation
 * - Whitelist unknown properties
 * - Consistent error format matching exception filters
 * - Debug logging for validation failures
 *
 * Options:
 * - whitelist: Strips properties not defined in the DTO (default: true)
 * - forbidNonWhitelisted: Throws error if unknown properties are sent (default: true)
 * - transform: Automatically transforms payloads to DTO instances (default: true)
 * - enableImplicitConversion: Converts query params to declared types (default: true)
 *
 * @example
 * ```typescript
 * // Global usage in main.ts
 * app.useGlobalPipes(new CustomValidationPipe());
 *
 * // Or with custom options
 * app.useGlobalPipes(new CustomValidationPipe({
 *   whitelist: true,
 *   forbidNonWhitelisted: false,
 * }));
 * ```
 *
 * @example
 * Error response format:
 * ```json
 * {
 *   "statusCode": 400,
 *   "message": ["email must be an email", "password must be at least 8 characters"],
 *   "error": "Validation Failed",
 *   "validationErrors": [
 *     {
 *       "field": "email",
 *       "value": "invalid-email",
 *       "constraints": ["email must be an email"]
 *     },
 *     {
 *       "field": "password",
 *       "value": "123",
 *       "constraints": ["password must be at least 8 characters"]
 *     }
 *   ],
 *   "timestamp": "2025-01-08T10:30:00.000Z",
 *   "path": "/api/users"
 * }
 * ```
 */
@Injectable()
export class CustomValidationPipe implements PipeTransform<unknown> {
  private readonly logger = new Logger(CustomValidationPipe.name);

  private readonly options: {
    whitelist: boolean;
    forbidNonWhitelisted: boolean;
    transform: boolean;
    enableImplicitConversion: boolean;
  };

  constructor(
    options: Partial<{
      whitelist: boolean;
      forbidNonWhitelisted: boolean;
      transform: boolean;
      enableImplicitConversion: boolean;
    }> = {},
  ) {
    this.options = {
      whitelist: options.whitelist ?? true,
      forbidNonWhitelisted: options.forbidNonWhitelisted ?? true,
      transform: options.transform ?? true,
      enableImplicitConversion: options.enableImplicitConversion ?? true,
    };
  }

  /**
   * Transforms and validates incoming data
   */
  async transform(
    value: unknown,
    metadata: ArgumentMetadata,
  ): Promise<unknown> {
    const { metatype } = metadata;

    // Skip validation for primitives and missing metatypes
    if (!metatype || !this.shouldValidate(metatype)) {
      return value;
    }

    // Transform plain object to class instance
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const object: object = plainToInstance(metatype, value, {
      enableImplicitConversion: this.options.enableImplicitConversion,
    });

    // Validate the object
    const errors = await validate(object, {
      whitelist: this.options.whitelist,
      forbidNonWhitelisted: this.options.forbidNonWhitelisted,
    });

    if (errors.length > 0) {
      const errorResponse = this.formatErrors(errors);

      this.logger.debug(
        `Validation failed: ${JSON.stringify({
          type: metatype.name,
          errors: errorResponse.validationErrors,
        })}`,
      );

      throw new BadRequestException(errorResponse);
    }

    // Return transformed object or original value based on options
    return this.options.transform ? object : value;
  }

  /**
   * Determines if the metatype should be validated
   * Skips primitive types and built-in types
   */
  private shouldValidate(
    metatype: new (...args: unknown[]) => unknown,
  ): boolean {
    const typesToSkip: (new (...args: unknown[]) => unknown)[] = [
      String,
      Boolean,
      Number,
      Array,
      Object,
    ];
    return !typesToSkip.includes(metatype);
  }

  /**
   * Formats validation errors into a structured response
   */
  private formatErrors(errors: ValidationError[]): ValidationErrorResponse {
    const validationErrors = this.flattenErrors(errors);

    const messages = validationErrors.map((error) =>
      error.constraints.join(', '),
    );

    return {
      message: messages,
      error: 'Validation Failed',
      validationErrors,
    };
  }

  /**
   * Flattens nested validation errors into a single array
   * Handles deeply nested object validation
   */
  private flattenErrors(
    errors: ValidationError[],
    parentField = '',
  ): ValidationErrorDetail[] {
    const result: ValidationErrorDetail[] = [];

    for (const error of errors) {
      const fieldName = parentField
        ? `${parentField}.${error.property}`
        : error.property;

      // Handle current level constraints
      if (error.constraints) {
        const constraints = Object.values(error.constraints);
        result.push({
          field: fieldName,
          value: error.value,
          constraints,
        });
      }

      // Recursively handle nested validation errors
      if (error.children && error.children.length > 0) {
        result.push(...this.flattenErrors(error.children, fieldName));
      }
    }

    return result;
  }
}
