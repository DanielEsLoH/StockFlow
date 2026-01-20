import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { InvitationsService, InvitationResponse } from './invitations.service';
import { CreateInvitationDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../common/decorators';
import type { RequestUser } from '../auth';
import { PrismaService } from '../prisma';

/**
 * InvitationsController handles all invitation-related HTTP endpoints.
 *
 * All endpoints require authentication and ADMIN or SUPER_ADMIN role.
 * Invitations are scoped to the current user's tenant.
 *
 * Endpoints:
 * - POST /invitations - Create a new invitation
 * - GET /invitations - List all invitations for the tenant
 * - DELETE /invitations/:id - Cancel a pending invitation
 * - POST /invitations/:id/resend - Resend invitation email
 */
@ApiTags('invitations')
@ApiBearerAuth('JWT-auth')
@Controller('invitations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class InvitationsController {
  private readonly logger = new Logger(InvitationsController.name);

  constructor(
    private readonly invitationsService: InvitationsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Creates a new invitation to join the tenant.
   *
   * The invitation will be sent to the specified email address.
   * Default role is EMPLOYEE if not specified.
   *
   * @param dto - Invitation creation data
   * @param currentUser - The authenticated admin user
   * @returns The created invitation
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create invitation',
    description:
      'Creates a new invitation to join the organization. Sends an email to the invitee with a link to accept.',
  })
  @ApiBody({ type: CreateInvitationDto })
  @ApiResponse({
    status: 201,
    description: 'Invitation created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires ADMIN role',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - user already exists or pending invitation exists',
  })
  async create(
    @Body() dto: CreateInvitationDto,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<InvitationResponse> {
    this.logger.log(
      `Create invitation request from ${currentUser.email} for ${dto.email}`,
    );

    // Fetch the full user entity for the service
    const adminUser = await this.prisma.user.findUnique({
      where: { id: currentUser.userId },
    });

    if (!adminUser) {
      throw new Error('Admin user not found');
    }

    return this.invitationsService.create(dto, adminUser);
  }

  /**
   * Lists all invitations for the current tenant.
   *
   * Returns invitations in all statuses (PENDING, ACCEPTED, EXPIRED, CANCELLED).
   *
   * @param currentUser - The authenticated admin user
   * @returns Array of invitations
   */
  @Get()
  @ApiOperation({
    summary: 'List invitations',
    description:
      'Lists all invitations for the organization, including pending, accepted, expired, and cancelled.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of invitations',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires ADMIN role',
  })
  async findAll(
    @CurrentUser() currentUser: RequestUser,
  ): Promise<InvitationResponse[]> {
    this.logger.log(
      `List invitations request from ${currentUser.email} for tenant ${currentUser.tenantId}`,
    );

    return this.invitationsService.findAllByTenant(currentUser.tenantId);
  }

  /**
   * Cancels a pending invitation.
   *
   * Only pending invitations can be cancelled.
   *
   * @param id - The invitation ID
   * @param currentUser - The authenticated admin user
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cancel invitation',
    description:
      'Cancels a pending invitation. Only pending invitations can be cancelled.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invitation ID',
    type: 'string',
  })
  @ApiResponse({
    status: 204,
    description: 'Invitation cancelled successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invitation is not pending',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires ADMIN role',
  })
  @ApiResponse({
    status: 404,
    description: 'Invitation not found',
  })
  async cancel(
    @Param('id') id: string,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<void> {
    this.logger.log(
      `Cancel invitation ${id} request from ${currentUser.email}`,
    );

    return this.invitationsService.cancel(id, currentUser.tenantId);
  }

  /**
   * Resends the invitation email for a pending invitation.
   *
   * Generates a new token and extends the expiration date.
   *
   * @param id - The invitation ID
   * @param currentUser - The authenticated admin user
   * @returns The updated invitation
   */
  @Post(':id/resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend invitation',
    description:
      'Resends the invitation email. Generates a new token and extends the expiration by 7 days.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invitation ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Invitation resent successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invitation is not pending',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires ADMIN role',
  })
  @ApiResponse({
    status: 404,
    description: 'Invitation not found',
  })
  async resend(
    @Param('id') id: string,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<InvitationResponse> {
    this.logger.log(
      `Resend invitation ${id} request from ${currentUser.email}`,
    );

    return this.invitationsService.resend(id, currentUser.tenantId);
  }
}
