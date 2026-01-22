import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

/**
 * AppController handles basic application-level endpoints.
 *
 * This controller provides:
 * - Root endpoint for basic health verification
 *
 * Note: Detailed health checks are available in the HealthModule at /health
 */
@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Basic health check endpoint.
   *
   * Returns a simple message to verify the API is running.
   * For detailed health checks (database, redis, etc.), use /health endpoint.
   *
   * @returns Simple health check message
   */
  @Get()
  @ApiOperation({
    summary: 'Health check',
    description:
      'Returns a simple health check message to verify the API is running.',
  })
  @ApiResponse({
    status: 200,
    description: 'API is healthy',
    type: String,
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
