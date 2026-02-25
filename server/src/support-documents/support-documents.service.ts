import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  SupportDocument,
  SupportDocumentItem,
  SupportDocumentStatus,
  Supplier,
  User,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import {
  CreateSupportDocumentDto,
  UpdateSupportDocumentDto,
  FilterSupportDocumentsDto,
} from './dto';

/**
 * Support document item data returned in responses
 */
export interface SupportDocumentItemResponse {
  id: string;
  supportDocumentId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  subtotal: number;
  tax: number;
  total: number;
}

/**
 * Support document data returned in responses
 */
export interface SupportDocumentResponse {
  id: string;
  tenantId: string;
  supplierId: string | null;
  userId: string | null;
  documentNumber: string;
  issueDate: Date;
  supplierName: string;
  supplierDocument: string;
  supplierDocType: string;
  subtotal: number;
  tax: number;
  withholdings: number;
  total: number;
  status: SupportDocumentStatus;
  dianCude: string | null;
  dianXml: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  items?: SupportDocumentItemResponse[];
  supplier?: {
    id: string;
    name: string;
    documentNumber: string | null;
  } | null;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

/**
 * Paginated response for support document list endpoints
 */
export interface PaginatedSupportDocumentsResponse {
  data: SupportDocumentResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Support document with relations for internal use
 */
type SupportDocumentWithRelations = SupportDocument & {
  items?: SupportDocumentItem[];
  supplier?: Supplier | null;
  user?: User | null;
};

/**
 * SupportDocumentsService handles all operations for Documento Soporte Electronico.
 *
 * Support documents are required by DIAN (Colombia) for purchases from
 * non-invoicers (no obligados a facturar). They serve as the buyer's
 * equivalent of an invoice when the seller cannot issue one.
 *
 * Each document number is unique within its tenant and auto-generated
 * with the format DS-00001.
 */
@Injectable()
export class SupportDocumentsService {
  private readonly logger = new Logger(SupportDocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Creates a new support document within the current tenant.
   * Auto-generates document number (DS-00001), calculates totals per item
   * and aggregate totals, and persists everything in a transaction.
   *
   * @param dto - Support document creation data
   * @param userId - ID of the user creating the document
   * @returns Created support document with items
   */
  async create(
    dto: CreateSupportDocumentDto,
    userId: string,
  ): Promise<SupportDocumentResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Creating support document for tenant ${tenantId} by user ${userId}`,
    );

    // Validate supplier if provided
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, tenantId },
      });

      if (!supplier) {
        throw new NotFoundException(
          `Proveedor no encontrado: ${dto.supplierId}`,
        );
      }
    }

    // Calculate item totals
    const itemsData = dto.items.map((item) => {
      const taxRate = item.taxRate ?? 0;
      const subtotal = item.quantity * item.unitPrice;
      const tax = subtotal * (taxRate / 100);
      const total = subtotal + tax;

      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate,
        subtotal,
        tax,
        total,
      };
    });

    // Calculate aggregate totals
    const docSubtotal = itemsData.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );
    const docTax = itemsData.reduce((sum, item) => sum + item.tax, 0);
    const docTotal = docSubtotal + docTax;

    // Create in a transaction to guarantee consistency
    const document = await this.prisma.$transaction(async (tx) => {
      // Generate document number inside transaction to prevent race conditions
      const documentNumber = await this.generateDocumentNumber(tx);

      // Create the support document
      const newDocument = await tx.supportDocument.create({
        data: {
          tenantId,
          userId,
          supplierId: dto.supplierId ?? null,
          documentNumber,
          issueDate: dto.issueDate ?? new Date(),
          supplierName: dto.supplierName,
          supplierDocument: dto.supplierDocument,
          supplierDocType: dto.supplierDocType ?? 'CC',
          subtotal: docSubtotal,
          tax: docTax,
          withholdings: 0,
          total: docTotal,
          status: SupportDocumentStatus.DRAFT,
          notes: dto.notes ?? null,
        },
      });

      // Create items
      await tx.supportDocumentItem.createMany({
        data: itemsData.map((item) => ({
          supportDocumentId: newDocument.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          subtotal: item.subtotal,
          tax: item.tax,
          total: item.total,
        })),
      });

      // Fetch the complete document with relations
      return tx.supportDocument.findUnique({
        where: { id: newDocument.id },
        include: {
          items: true,
          supplier: true,
          user: true,
        },
      });
    });

    if (!document) {
      throw new BadRequestException('Error al crear el documento soporte');
    }

    this.logger.log(
      `Support document created: ${document.documentNumber} (${document.id})`,
    );

    return this.mapToResponse(document);
  }

  /**
   * Lists all support documents within the current tenant with filtering and pagination.
   *
   * @param filters - Filter and pagination options
   * @returns Paginated list of support documents
   */
  async findAll(
    filters: FilterSupportDocumentsDto = {},
  ): Promise<PaginatedSupportDocumentsResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const {
      page = 1,
      limit = 10,
      status,
      supplierName,
      supplierDocument,
      fromDate,
      toDate,
    } = filters;
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Listing support documents for tenant ${tenantId}, page ${page}, limit ${limit}`,
    );

    // Build where clause
    const where: Prisma.SupportDocumentWhereInput = { tenantId };

    if (status) {
      where.status = status;
    }

    if (supplierName) {
      where.supplierName = { contains: supplierName, mode: 'insensitive' };
    }

    if (supplierDocument) {
      where.supplierDocument = supplierDocument;
    }

    if (fromDate || toDate) {
      where.issueDate = {};
      if (fromDate) {
        where.issueDate.gte = fromDate;
      }
      if (toDate) {
        where.issueDate.lte = toDate;
      }
    }

    const [documents, total] = await Promise.all([
      this.prisma.supportDocument.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: true,
          user: true,
        },
      }),
      this.prisma.supportDocument.count({ where }),
    ]);

    return this.buildPaginatedResponse(documents, total, page, limit);
  }

  /**
   * Finds a single support document by ID within the current tenant.
   * Includes all items, supplier, and user relations.
   *
   * @param id - Support document ID
   * @returns Support document data with relations
   * @throws NotFoundException if document not found
   */
  async findOne(id: string): Promise<SupportDocumentResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Finding support document ${id} in tenant ${tenantId}`,
    );

    const document = await this.prisma.supportDocument.findFirst({
      where: { id, tenantId },
      include: {
        items: true,
        supplier: true,
        user: true,
      },
    });

    if (!document) {
      this.logger.warn(`Support document not found: ${id}`);
      throw new NotFoundException('Documento soporte no encontrado');
    }

    return this.mapToResponse(document);
  }

  /**
   * Updates an existing support document.
   * Only DRAFT documents can be updated.
   * When items are provided, all existing items are replaced and totals are recalculated.
   *
   * @param id - Support document ID to update
   * @param dto - Update data
   * @returns Updated support document data
   * @throws NotFoundException if document not found
   * @throws BadRequestException if document is not in DRAFT status
   */
  async update(
    id: string,
    dto: UpdateSupportDocumentDto,
  ): Promise<SupportDocumentResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Updating support document ${id} in tenant ${tenantId}`,
    );

    // Find the document
    const document = await this.prisma.supportDocument.findFirst({
      where: { id, tenantId },
    });

    if (!document) {
      this.logger.warn(`Support document not found: ${id}`);
      throw new NotFoundException('Documento soporte no encontrado');
    }

    // Only DRAFT documents can be updated
    if (document.status !== SupportDocumentStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden modificar documentos soporte en borrador',
      );
    }

    // Validate supplier if provided
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, tenantId },
      });

      if (!supplier) {
        throw new NotFoundException(
          `Proveedor no encontrado: ${dto.supplierId}`,
        );
      }
    }

    // Update in a transaction
    const updatedDocument = await this.prisma.$transaction(async (tx) => {
      // Build update data for the document fields
      const updateData: Prisma.SupportDocumentUpdateInput = {};

      if (dto.supplierId !== undefined) {
        updateData.supplier = dto.supplierId
          ? { connect: { id: dto.supplierId } }
          : { disconnect: true };
      }
      if (dto.supplierName !== undefined) {
        updateData.supplierName = dto.supplierName;
      }
      if (dto.supplierDocument !== undefined) {
        updateData.supplierDocument = dto.supplierDocument;
      }
      if (dto.supplierDocType !== undefined) {
        updateData.supplierDocType = dto.supplierDocType;
      }
      if (dto.issueDate !== undefined) {
        updateData.issueDate = dto.issueDate;
      }
      if (dto.notes !== undefined) {
        updateData.notes = dto.notes;
      }

      // If items are provided, replace all existing items and recalculate totals
      if (dto.items && dto.items.length > 0) {
        // Delete existing items
        await tx.supportDocumentItem.deleteMany({
          where: { supportDocumentId: id },
        });

        // Calculate new item totals
        const itemsData = dto.items.map((item) => {
          const quantity = item.quantity!;
          const unitPrice = item.unitPrice!;
          const taxRate = item.taxRate ?? 0;
          const subtotal = quantity * unitPrice;
          const tax = subtotal * (taxRate / 100);
          const total = subtotal + tax;

          return {
            supportDocumentId: id,
            description: item.description!,
            quantity,
            unitPrice,
            taxRate,
            subtotal,
            tax,
            total,
          };
        });

        // Create new items
        await tx.supportDocumentItem.createMany({ data: itemsData });

        // Recalculate aggregate totals
        const docSubtotal = itemsData.reduce(
          (sum, item) => sum + item.subtotal,
          0,
        );
        const docTax = itemsData.reduce((sum, item) => sum + item.tax, 0);
        const docTotal = docSubtotal + docTax;

        updateData.subtotal = docSubtotal;
        updateData.tax = docTax;
        updateData.total = docTotal;
      }

      // Update the document
      return tx.supportDocument.update({
        where: { id },
        data: updateData,
        include: {
          items: true,
          supplier: true,
          user: true,
        },
      });
    });

    this.logger.log(
      `Support document updated: ${updatedDocument.documentNumber} (${updatedDocument.id})`,
    );

    return this.mapToResponse(updatedDocument);
  }

  /**
   * Deletes a support document from the tenant.
   * Only DRAFT documents can be deleted.
   *
   * @param id - Support document ID to delete
   * @throws NotFoundException if document not found
   * @throws BadRequestException if document is not in DRAFT status
   */
  async remove(id: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Deleting support document ${id} in tenant ${tenantId}`,
    );

    const document = await this.prisma.supportDocument.findFirst({
      where: { id, tenantId },
    });

    if (!document) {
      this.logger.warn(`Support document not found: ${id}`);
      throw new NotFoundException('Documento soporte no encontrado');
    }

    // Only DRAFT documents can be deleted
    if (document.status !== SupportDocumentStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden eliminar documentos soporte en borrador',
      );
    }

    // Items are cascade-deleted by the database relation (onDelete: Cascade)
    await this.prisma.supportDocument.delete({ where: { id } });

    this.logger.log(
      `Support document deleted: ${document.documentNumber} (${document.id})`,
    );
  }

  /**
   * Generates a support document (transitions DRAFT -> GENERATED).
   * In the future, this will generate the DIAN-compliant XML.
   *
   * @param id - Support document ID to generate
   * @returns Updated support document with GENERATED status
   * @throws NotFoundException if document not found
   * @throws BadRequestException if document is not in DRAFT status
   */
  async generate(id: string): Promise<SupportDocumentResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Generating support document ${id} in tenant ${tenantId}`,
    );

    const document = await this.prisma.supportDocument.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });

    if (!document) {
      this.logger.warn(`Support document not found: ${id}`);
      throw new NotFoundException('Documento soporte no encontrado');
    }

    if (document.status !== SupportDocumentStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden generar documentos soporte en borrador',
      );
    }

    // Validate the document has items
    if (!document.items || document.items.length === 0) {
      throw new BadRequestException(
        'El documento soporte debe tener al menos un item',
      );
    }

    // TODO: Generate DIAN-compliant XML here in the future
    // For now, just transition the status

    const updatedDocument = await this.prisma.supportDocument.update({
      where: { id },
      data: {
        status: SupportDocumentStatus.GENERATED,
      },
      include: {
        items: true,
        supplier: true,
        user: true,
      },
    });

    this.logger.log(
      `Support document generated: ${updatedDocument.documentNumber} (${updatedDocument.id})`,
    );

    return this.mapToResponse(updatedDocument);
  }

  /**
   * Gets aggregated statistics for all support documents in the current tenant.
   *
   * @returns Statistics including count by status and total value
   */
  async getStats(): Promise<{
    totalDocuments: number;
    totalValue: number;
    documentsByStatus: Record<SupportDocumentStatus, number>;
  }> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Getting support document statistics for tenant ${tenantId}`,
    );

    const documents = await this.prisma.supportDocument.findMany({
      where: { tenantId },
      select: {
        status: true,
        total: true,
      },
    });

    // Initialize status counts
    const documentsByStatus: Record<SupportDocumentStatus, number> = {
      [SupportDocumentStatus.DRAFT]: 0,
      [SupportDocumentStatus.GENERATED]: 0,
      [SupportDocumentStatus.SENT]: 0,
      [SupportDocumentStatus.ACCEPTED]: 0,
      [SupportDocumentStatus.REJECTED]: 0,
    };

    let totalValue = 0;

    for (const doc of documents) {
      documentsByStatus[doc.status]++;
      totalValue += Number(doc.total);
    }

    return {
      totalDocuments: documents.length,
      totalValue,
      documentsByStatus,
    };
  }

  /**
   * Generates a consecutive document number unique to the tenant.
   * Format: DS-00001, DS-00002, etc.
   *
   * @param tx - Prisma transaction client
   * @returns Generated document number
   */
  private async generateDocumentNumber(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const tenantId = this.tenantContext.requireTenantId();

    const lastDocument = await tx.supportDocument.findFirst({
      where: { tenantId, documentNumber: { startsWith: 'DS-' } },
      orderBy: { documentNumber: 'desc' },
      select: { documentNumber: true },
    });

    let nextNumber = 1;

    if (lastDocument?.documentNumber) {
      const match = lastDocument.documentNumber.match(/DS-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    const documentNumber = `DS-${nextNumber.toString().padStart(5, '0')}`;

    this.logger.debug(`Generated document number: ${documentNumber}`);

    return documentNumber;
  }

  /**
   * Maps a SupportDocument entity to a SupportDocumentResponse object.
   *
   * @param document - The support document entity to map
   * @returns SupportDocumentResponse object
   */
  private mapToResponse(
    document: SupportDocumentWithRelations,
  ): SupportDocumentResponse {
    const response: SupportDocumentResponse = {
      id: document.id,
      tenantId: document.tenantId,
      supplierId: document.supplierId,
      userId: document.userId,
      documentNumber: document.documentNumber,
      issueDate: document.issueDate,
      supplierName: document.supplierName,
      supplierDocument: document.supplierDocument,
      supplierDocType: document.supplierDocType,
      subtotal: Number(document.subtotal),
      tax: Number(document.tax),
      withholdings: Number(document.withholdings),
      total: Number(document.total),
      status: document.status,
      dianCude: document.dianCude,
      dianXml: document.dianXml,
      notes: document.notes,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };

    // Map items if included
    if (document.items) {
      response.items = document.items.map((item) => ({
        id: item.id,
        supportDocumentId: item.supportDocumentId,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        taxRate: Number(item.taxRate),
        subtotal: Number(item.subtotal),
        tax: Number(item.tax),
        total: Number(item.total),
      }));
    }

    // Map supplier if included
    if (document.supplier) {
      response.supplier = {
        id: document.supplier.id,
        name: document.supplier.name,
        documentNumber: document.supplier.documentNumber,
      };
    }

    // Map user if included
    if (document.user) {
      response.user = {
        id: document.user.id,
        name: `${document.user.firstName} ${document.user.lastName}`,
        email: document.user.email,
      };
    }

    return response;
  }

  /**
   * Builds a paginated response from documents and pagination params.
   */
  private buildPaginatedResponse(
    documents: SupportDocumentWithRelations[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedSupportDocumentsResponse {
    return {
      data: documents.map((doc) => this.mapToResponse(doc)),
      meta: {
        total,
        page,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }
}
