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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CategoriesService } from './categories.service';
import type {
  CategoryResponse,
  PaginatedCategoriesResponse,
} from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth';
import { Roles } from '../common/decorators';
import {
  CategoryEntity,
  PaginatedCategoriesEntity,
} from './entities/category.entity';

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
@ApiTags('categories')
@ApiBearerAuth('JWT-auth')
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
  @ApiOperation({
    summary: 'List all categories',
    description:
      'Returns a paginated list of all categories in the current tenant. All authenticated users can access this endpoint.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'List of categories retrieved successfully',
    type: PaginatedCategoriesEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
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
  @ApiOperation({
    summary: 'Get category by ID',
    description:
      'Returns a single category by its ID. All authenticated users can access this endpoint.',
  })
  @ApiParam({
    name: 'id',
    description: 'Category ID (CUID format)',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Category retrieved successfully',
    type: CategoryEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
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
  @ApiOperation({
    summary: 'Create a new category',
    description:
      'Creates a new category in the current tenant. Only ADMIN and MANAGER users can create categories.',
  })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
    type: CategoryEntity,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Category name already exists',
  })
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
  @ApiOperation({
    summary: 'Update a category',
    description:
      'Updates an existing category. Only ADMIN and MANAGER users can update categories.',
  })
  @ApiParam({
    name: 'id',
    description: 'Category ID to update',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({
    status: 200,
    description: 'Category updated successfully',
    type: CategoryEntity,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Category name already exists',
  })
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
  @ApiOperation({
    summary: 'Delete a category',
    description:
      'Deletes a category. Only ADMIN users can delete categories. Deletion fails if products are associated with the category.',
  })
  @ApiParam({
    name: 'id',
    description: 'Category ID to delete',
    example: 'cmkcykam80004reya0hsdx337',
  })
  @ApiResponse({ status: 204, description: 'Category deleted successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Category has associated products',
  })
  async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting category: ${id}`);
    return this.categoriesService.delete(id);
  }
}
