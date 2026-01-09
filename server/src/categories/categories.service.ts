import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Category } from '@prisma/client';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common/services';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

/**
 * Category data returned in responses
 */
export interface CategoryResponse {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Paginated response for list endpoints
 */
export interface PaginatedCategoriesResponse {
  data: CategoryResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * CategoriesService handles all category management operations including
 * CRUD operations with multi-tenant isolation.
 *
 * Categories are used to organize products within a tenant.
 * Each category name must be unique within its tenant.
 */
@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Lists all categories within the current tenant with pagination.
   *
   * @param page - Page number (1-indexed)
   * @param limit - Number of categories per page
   * @returns Paginated list of categories
   */
  async findAll(page = 1, limit = 10): Promise<PaginatedCategoriesResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Listing categories for tenant ${tenantId}, page ${page}, limit ${limit}`,
    );

    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where: { tenantId },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.category.count({ where: { tenantId } }),
    ]);

    return {
      data: categories.map((category) => this.mapToCategoryResponse(category)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Finds a single category by ID within the current tenant.
   *
   * @param id - Category ID
   * @returns Category data
   * @throws NotFoundException if category not found
   */
  async findOne(id: string): Promise<CategoryResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Finding category ${id} in tenant ${tenantId}`);

    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
    });

    if (!category) {
      this.logger.warn(`Category not found: ${id}`);
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return this.mapToCategoryResponse(category);
  }

  /**
   * Creates a new category within the current tenant.
   *
   * @param dto - Category creation data
   * @returns Created category data
   * @throws ConflictException if category name already exists in tenant
   */
  async create(dto: CreateCategoryDto): Promise<CategoryResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const normalizedName = dto.name.trim();

    this.logger.debug(
      `Creating category "${normalizedName}" in tenant ${tenantId}`,
    );

    // Check for existing category with same name in tenant
    const existingCategory = await this.prisma.category.findUnique({
      where: {
        tenantId_name: {
          tenantId,
          name: normalizedName,
        },
      },
    });

    if (existingCategory) {
      this.logger.warn(`Category already exists: ${normalizedName}`);
      throw new ConflictException(
        `A category with the name "${normalizedName}" already exists`,
      );
    }

    // Create category
    const category = await this.prisma.category.create({
      data: {
        name: normalizedName,
        description: dto.description,
        color: dto.color,
        tenantId,
      },
    });

    this.logger.log(`Category created: ${category.name} (${category.id})`);

    return this.mapToCategoryResponse(category);
  }

  /**
   * Updates an existing category.
   *
   * @param id - Category ID to update
   * @param dto - Update data
   * @returns Updated category data
   * @throws NotFoundException if category not found
   * @throws ConflictException if new name already exists in tenant
   */
  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryResponse> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Updating category ${id} in tenant ${tenantId}`);

    // Find the category to update
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
    });

    if (!category) {
      this.logger.warn(`Category not found: ${id}`);
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Build update data
    const updateData: Partial<Category> = {};

    // Name requires uniqueness check
    if (dto.name !== undefined) {
      const normalizedName = dto.name.trim();
      if (normalizedName !== category.name) {
        const existingCategory = await this.prisma.category.findUnique({
          where: {
            tenantId_name: {
              tenantId,
              name: normalizedName,
            },
          },
        });

        if (existingCategory) {
          throw new ConflictException(
            `A category with the name "${normalizedName}" already exists`,
          );
        }

        updateData.name = normalizedName;
      }
    }

    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }

    if (dto.color !== undefined) {
      updateData.color = dto.color;
    }

    // Update the category
    const updatedCategory = await this.prisma.category.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(
      `Category updated: ${updatedCategory.name} (${updatedCategory.id})`,
    );

    return this.mapToCategoryResponse(updatedCategory);
  }

  /**
   * Deletes a category from the tenant.
   * Only allowed if no products are associated with the category.
   *
   * @param id - Category ID to delete
   * @throws NotFoundException if category not found
   * @throws BadRequestException if category has associated products
   */
  async delete(id: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(`Deleting category ${id} in tenant ${tenantId}`);

    // Find the category to delete
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
    });

    if (!category) {
      this.logger.warn(`Category not found: ${id}`);
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check if any products are associated with this category
    const productCount = await this.prisma.product.count({
      where: { categoryId: id, tenantId },
    });

    if (productCount > 0) {
      this.logger.warn(
        `Cannot delete category ${id}: ${productCount} products associated`,
      );
      throw new BadRequestException(
        `Cannot delete category "${category.name}". ${productCount} product(s) are still associated with this category. Please reassign or remove the products first.`,
      );
    }

    await this.prisma.category.delete({ where: { id } });

    this.logger.log(`Category deleted: ${category.name} (${category.id})`);
  }

  /**
   * Maps a Category entity to a CategoryResponse object
   *
   * @param category - The category entity to map
   * @returns CategoryResponse object
   */
  private mapToCategoryResponse(category: Category): CategoryResponse {
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      color: category.color,
      tenantId: category.tenantId,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
