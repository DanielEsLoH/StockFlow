import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { AppService } from './app.service';
import { PaginationDto, TestValidationDto } from './common/dto';

/**
 * Health check response entity
 */
class HealthCheckResponse {
  @ApiProperty({
    description: 'Health check message',
    example: 'Hello World!',
  })
  message: string;
}

/**
 * Pagination test response entity
 */
class PaginationTestResponse {
  @ApiProperty({
    description: 'Success message',
    example: 'Pagination validation successful',
  })
  message: string;

  @ApiProperty({
    description: 'Received pagination parameters',
    type: PaginationDto,
  })
  received: PaginationDto;
}

/**
 * Validation test response entity
 */
class ValidationTestResponse {
  @ApiProperty({
    description: 'Success message',
    example: 'Body validation successful',
  })
  message: string;

  @ApiProperty({
    description: 'Received and validated data',
    type: TestValidationDto,
  })
  received: TestValidationDto;
}

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Returns a simple health check message to verify the API is running.',
  })
  @ApiResponse({
    status: 200,
    description: 'API is healthy',
    type: String,
  })
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Test endpoint for validating PaginationDto via query parameters
   *
   * Tests:
   * - Query parameter transformation (string to number)
   * - Default values (page=1, limit=10)
   * - Min/max constraints
   *
   * @example
   * GET /test-pagination?page=1&limit=20
   * GET /test-pagination (uses defaults)
   * GET /test-pagination?page=0 (should fail - min is 1)
   * GET /test-pagination?limit=200 (should fail - max is 100)
   */
  @Get('test-pagination')
  @ApiOperation({
    summary: 'Test pagination validation',
    description: 'Test endpoint for validating PaginationDto. Tests query parameter transformation, default values, and min/max constraints.',
  })
  @ApiResponse({
    status: 200,
    description: 'Pagination validation successful',
    type: PaginationTestResponse,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid pagination parameters' })
  testPagination(@Query() pagination: PaginationDto): {
    message: string;
    received: PaginationDto;
  } {
    return {
      message: 'Pagination validation successful',
      received: pagination,
    };
  }

  /**
   * Test endpoint for validating request body with TestValidationDto
   *
   * Tests:
   * - Required field validation
   * - Email format validation
   * - String length constraints
   * - Optional fields
   * - Nested object validation
   * - Whitelist behavior (unknown properties stripped/rejected)
   *
   * @example
   * POST /test-validation
   * {
   *   "name": "John Doe",
   *   "email": "john@example.com",
   *   "password": "securePassword123"
   * }
   */
  @Post('test-validation')
  @ApiOperation({
    summary: 'Test body validation',
    description: 'Test endpoint for validating request body with TestValidationDto. Tests required fields, email format, string length constraints, and nested objects.',
  })
  @ApiResponse({
    status: 200,
    description: 'Body validation successful',
    type: ValidationTestResponse,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid request body' })
  testValidation(@Body() dto: TestValidationDto): {
    message: string;
    received: TestValidationDto;
  } {
    return {
      message: 'Body validation successful',
      received: dto,
    };
  }
}