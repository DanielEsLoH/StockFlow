import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma';
import { BrevoService } from '../notifications/mail/brevo.service';
import { CreateInvitationDto } from './dto';
import { User, UserRole, Invitation, InvitationStatus } from '@prisma/client';

/**
 * Response structure for invitation data
 */
export interface InvitationResponse {
  id: string;
  email: string;
  role: UserRole;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
  invitedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

/**
 * InvitationsService handles all invitation-related operations including
 * creating, listing, cancelling, resending, and expiring invitations.
 *
 * Key features:
 * - Create invitations with unique tokens (32-byte hex)
 * - 7-day expiration period
 * - Automatic expiration via cron job
 * - Email notifications via Brevo
 * - Tenant-scoped operations
 */
@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);
  private readonly tokenBytes = 32;
  private readonly expirationDays = 7;

  constructor(
    private readonly prisma: PrismaService,
    private readonly brevoService: BrevoService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Creates a new invitation for a user to join the tenant.
   *
   * @param dto - Invitation creation data
   * @param adminUser - The admin user creating the invitation
   * @returns The created invitation
   * @throws ConflictException if user already exists in tenant or has pending invitation
   */
  async create(
    dto: CreateInvitationDto,
    adminUser: User,
  ): Promise<InvitationResponse> {
    const normalizedEmail = dto.email.toLowerCase();
    const tenantId = adminUser.tenantId;
    const role = dto.role ?? UserRole.EMPLOYEE;

    this.logger.debug(
      `Creating invitation for ${normalizedEmail} to tenant ${tenantId}`,
    );

    // Validate role - SUPER_ADMIN cannot be invited
    if (role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException(
        'No se puede invitar a un usuario con rol SUPER_ADMIN',
      );
    }

    // Check if user already exists in this tenant
    const existingUser = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: normalizedEmail,
        },
      },
    });

    if (existingUser) {
      this.logger.warn(
        `User already exists in tenant: ${normalizedEmail} (tenant: ${tenantId})`,
      );
      throw new ConflictException(
        'Ya existe un usuario con este email en tu organizacion',
      );
    }

    // Check for existing pending invitation
    const existingInvitation = await this.prisma.invitation.findUnique({
      where: {
        email_tenantId: {
          email: normalizedEmail,
          tenantId,
        },
      },
    });

    if (existingInvitation) {
      if (existingInvitation.status === InvitationStatus.PENDING) {
        this.logger.warn(
          `Pending invitation already exists for ${normalizedEmail} (tenant: ${tenantId})`,
        );
        throw new ConflictException(
          'Ya existe una invitacion pendiente para este email',
        );
      }

      // If invitation exists but is not pending (expired/cancelled), delete it to create a new one
      await this.prisma.invitation.delete({
        where: { id: existingInvitation.id },
      });
    }

    // Generate secure token
    const token = crypto.randomBytes(this.tokenBytes).toString('hex');

    // Calculate expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.expirationDays);

    // Create the invitation
    const invitation = await this.prisma.invitation.create({
      data: {
        email: normalizedEmail,
        tenantId,
        role,
        token,
        expiresAt,
        invitedById: adminUser.id,
        status: InvitationStatus.PENDING,
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        tenant: {
          select: {
            name: true,
          },
        },
      },
    });

    this.logger.log(
      `Invitation created for ${normalizedEmail} (tenant: ${tenantId}, role: ${role})`,
    );

    // Send invitation email asynchronously
    this.sendInvitationEmail(
      normalizedEmail,
      token,
      invitation.tenant.name,
      `${adminUser.firstName} ${adminUser.lastName}`,
    ).catch((error) => {
      this.logger.error(
        `Failed to send invitation email to ${normalizedEmail}`,
        error instanceof Error ? error.stack : undefined,
      );
    });

    return this.mapToInvitationResponse(invitation);
  }

  /**
   * Lists all invitations for a tenant.
   *
   * @param tenantId - The tenant ID
   * @returns Array of invitations
   */
  async findAllByTenant(tenantId: string): Promise<InvitationResponse[]> {
    this.logger.debug(`Listing invitations for tenant ${tenantId}`);

    const invitations = await this.prisma.invitation.findMany({
      where: { tenantId },
      include: {
        invitedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map((inv) => this.mapToInvitationResponse(inv));
  }

  /**
   * Finds an invitation by its token.
   * This is used for public access when accepting an invitation.
   *
   * @param token - The invitation token
   * @returns The invitation if found and valid
   * @throws NotFoundException if invitation not found
   * @throws BadRequestException if invitation is expired or cancelled
   */
  async findByToken(token: string): Promise<
    Invitation & {
      tenant: { id: string; name: string; slug: string };
      invitedBy: { firstName: string; lastName: string };
    }
  > {
    this.logger.debug(`Finding invitation by token`);

    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        invitedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!invitation) {
      this.logger.warn('Invitation not found for token');
      throw new NotFoundException('Invitacion no encontrada o invalida');
    }

    // Check if invitation is expired
    if (invitation.status === InvitationStatus.EXPIRED) {
      throw new BadRequestException('Esta invitacion ha expirado');
    }

    // Check if invitation is cancelled
    if (invitation.status === InvitationStatus.CANCELLED) {
      throw new BadRequestException('Esta invitacion ha sido cancelada');
    }

    // Check if invitation is already accepted
    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new BadRequestException('Esta invitacion ya ha sido aceptada');
    }

    // Check if expiration date has passed (in case cron hasn't run)
    if (new Date() > invitation.expiresAt) {
      // Update status to expired
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new BadRequestException('Esta invitacion ha expirado');
    }

    return invitation;
  }

  /**
   * Cancels a pending invitation.
   *
   * @param id - The invitation ID
   * @param tenantId - The tenant ID (for authorization)
   * @throws NotFoundException if invitation not found
   * @throws BadRequestException if invitation is not pending
   */
  async cancel(id: string, tenantId: string): Promise<void> {
    this.logger.debug(`Cancelling invitation ${id} for tenant ${tenantId}`);

    const invitation = await this.prisma.invitation.findFirst({
      where: { id, tenantId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitacion no encontrada');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        `No se puede cancelar una invitacion con estado ${invitation.status}`,
      );
    }

    await this.prisma.invitation.update({
      where: { id },
      data: { status: InvitationStatus.CANCELLED },
    });

    this.logger.log(`Invitation ${id} cancelled`);
  }

  /**
   * Resends the invitation email for a pending invitation.
   *
   * @param id - The invitation ID
   * @param tenantId - The tenant ID (for authorization)
   * @returns The updated invitation
   * @throws NotFoundException if invitation not found
   * @throws BadRequestException if invitation is not pending
   */
  async resend(id: string, tenantId: string): Promise<InvitationResponse> {
    this.logger.debug(`Resending invitation ${id} for tenant ${tenantId}`);

    const invitation = await this.prisma.invitation.findFirst({
      where: { id, tenantId },
      include: {
        invitedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        tenant: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitacion no encontrada');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        `No se puede reenviar una invitacion con estado ${invitation.status}`,
      );
    }

    // Generate new token and extend expiration
    const newToken = crypto.randomBytes(this.tokenBytes).toString('hex');
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + this.expirationDays);

    const updatedInvitation = await this.prisma.invitation.update({
      where: { id },
      data: {
        token: newToken,
        expiresAt: newExpiresAt,
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Send invitation email asynchronously
    this.sendInvitationEmail(
      invitation.email,
      newToken,
      invitation.tenant.name,
      `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`,
    ).catch((error) => {
      this.logger.error(
        `Failed to resend invitation email to ${invitation.email}`,
        error instanceof Error ? error.stack : undefined,
      );
    });

    this.logger.log(`Invitation ${id} resent to ${invitation.email}`);

    return this.mapToInvitationResponse(updatedInvitation);
  }

  /**
   * Cron job to mark expired invitations.
   * Runs daily at 1:00 AM.
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async expireOldInvitations(): Promise<void> {
    this.logger.debug('Running expired invitations cron job');

    const result = await this.prisma.invitation.updateMany({
      where: {
        status: InvitationStatus.PENDING,
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        status: InvitationStatus.EXPIRED,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Marked ${result.count} invitation(s) as expired`);
    }
  }

  /**
   * Sends an invitation email to the invitee.
   *
   * @param email - Recipient email
   * @param token - Invitation token
   * @param tenantName - Name of the organization
   * @param inviterName - Name of the person who sent the invitation
   */
  private async sendInvitationEmail(
    email: string,
    token: string,
    tenantName: string,
    inviterName: string,
  ): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('app.frontendUrl') ||
      'http://localhost:5173';
    const invitationUrl = `${frontendUrl}/accept-invitation?token=${token}`;

    const htmlContent = this.getInvitationEmailTemplate(
      tenantName,
      inviterName,
      invitationUrl,
    );

    const result = await this.brevoService.sendEmail({
      to: email,
      subject: `${inviterName} te ha invitado a unirte a ${tenantName} en StockFlow`,
      htmlContent,
      textContent: `${inviterName} te ha invitado a unirte a ${tenantName} en StockFlow. Acepta la invitacion visitando: ${invitationUrl}. Esta invitacion expira en 7 dias.`,
    });

    if (result.success) {
      this.logger.log(`Invitation email sent to ${email}`);
    } else {
      this.logger.warn(
        `Failed to send invitation email to ${email}: ${result.error}`,
      );
    }
  }

  /**
   * Generates the HTML email template for invitations.
   */
  private getInvitationEmailTemplate(
    tenantName: string,
    inviterName: string,
    invitationUrl: string,
  ): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitacion a ${tenantName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; background-color: #2563eb; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">StockFlow</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 600;">
                Has sido invitado a unirte a ${tenantName}
              </h2>
              <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                <strong>${inviterName}</strong> te ha invitado a unirte a <strong>${tenantName}</strong> en StockFlow.
              </p>
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                StockFlow es una plataforma de gestion de inventario y facturacion que te ayudara a optimizar tus operaciones comerciales.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
                <tr>
                  <td style="border-radius: 6px; background-color: #2563eb;">
                    <a href="${invitationUrl}" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 500;">
                      Aceptar invitacion
                    </a>
                  </td>
                </tr>
              </table>
              <div style="padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; margin-bottom: 24px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 500;">
                  Esta invitacion expirara en 7 dias.
                </p>
              </div>
              <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px;">
                Si el boton no funciona, copia y pega esta URL en tu navegador:<br>
                <a href="${invitationUrl}" style="color: #2563eb; word-break: break-all;">${invitationUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
                &copy; ${new Date().getFullYear()} StockFlow. Todos los derechos reservados.
              </p>
              <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Este es un mensaje automatico. Por favor no responda directamente a este correo.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Maps an Invitation entity to an InvitationResponse object.
   */
  private mapToInvitationResponse(
    invitation: Invitation & {
      invitedBy: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      };
    },
  ): InvitationResponse {
    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      invitedBy: invitation.invitedBy,
    };
  }
}
