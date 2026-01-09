import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CategoriesService } from './categories.service';
import type {
  CategoryResponse,
  PaginatedCategoriesResponse,
} from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth';
import { Roles } from '../common/decorators';

/**
 * CategoriesController handles all category management endpoints.
 *
 * All endpoints require JWT authentication.
 * Role-based access is enforced per endpoint:
 * - List categories: All authenticated roles
 * - View category: All authenticated roles
 * - Create category: ADMIN, MANAGER
 * - Update category: ADMIN, MANAGER
 * - Delete category: ADMIN only
 */
@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  private readonly logger = new Logger(CategoriesController.name);

  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Lists all categories in the current tenant with pagination.
   *
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10, max: 100)
   * @returns Paginated list of categories
   *
   * @example
   * GET /categories?page=1&limit=20
   */
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedCategoriesResponse> {
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit ?? '10', 10) || 10),
    );

    this.logger.log(
      `Listing categories - page: ${pageNum}, limit: ${limitNum}`,
    );

    return this.categoriesService.findAll(pageNum, limitNum);
  }

  /**
   * Gets a category by ID.
   *
   * @param id - Category ID
   * @returns Category data
   *
   * @example
   * GET /categories/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<CategoryResponse> {
    this.logger.log(`Getting category: ${id}`);

    return this.categoriesService.findOne(id);
  }

  /**
   * Creates a new category in the tenant.
   * Only ADMIN and MANAGER users can create categories.
   *
   * @param dto - Category creation data
   * @returns Created category data
   *
   * @example
   * POST /categories
   * {
   *   "name": "Electronics",
   *   "description": "Electronic devices and accessories",
   *   "color": "#3b82f6"
   * }
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCategoryDto): Promise<CategoryResponse> {
    this.logger.log(`Creating category: ${dto.name}`);
    return this.categoriesService.create(dto);
  }

  /**
   * Updates a category.
   * Only ADMIN and MANAGER users can update categories.
   *
   * @param id - Category ID to update
   * @param dto - Update data
   * @returns Updated category data
   *
   * @example
   * PATCH /categories/:id
   * {
   *   "name": "Updated Name",
   *   "description": "Updated description",
   *   "color": "#ef4444"
   * }
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryResponse> {
    this.logger.log(`Updating category: ${id}`);
    return this.categoriesService.update(id, dto);
  }

  /**
   * Deletes a category.
   * Only ADMIN users can delete categories.
   * Deletion fails if products are associated with the category.
   *
   * @param id - Category ID to delete
   *
   * @example
   * DELETE /categories/:id
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting category: ${id}`);
    return this.categoriesService.delete(id);
  }
}
