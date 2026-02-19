import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JournalEntrySource, JournalEntryStatus } from '@prisma/client';
import { JournalEntriesService } from './journal-entries.service';
import type {
  JournalEntryResponse,
  PaginatedJournalEntriesResponse,
} from './journal-entries.service';
import { CreateJournalEntryDto } from './dto';
import { JwtAuthGuard } from '../auth';
import { RequirePermissions, PermissionsGuard } from '../common';
import { Permission } from '../common/permissions/permission.enum';

@ApiTags('journal-entries')
@ApiBearerAuth('JWT-auth')
@Controller('journal-entries')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class JournalEntriesController {
  private readonly logger = new Logger(JournalEntriesController.name);

  constructor(private readonly journalEntriesService: JournalEntriesService) {}

  @Get()
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'List journal entries', description: 'Returns paginated journal entries with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'source', required: false, enum: JournalEntrySource })
  @ApiQuery({ name: 'status', required: false, enum: JournalEntryStatus })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Journal entries listed successfully' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('source') source?: JournalEntrySource,
    @Query('status') status?: JournalEntryStatus,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ): Promise<PaginatedJournalEntriesResponse> {
    const parsedPage = Math.max(1, parseInt(page || '1', 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit || '20', 10) || 20));

    return this.journalEntriesService.findAll(
      parsedPage,
      parsedLimit,
      source,
      status,
      fromDate,
      toDate,
    );
  }

  @Get(':id')
  @RequirePermissions(Permission.ACCOUNTING_VIEW)
  @ApiOperation({ summary: 'Get journal entry by ID', description: 'Returns entry with all lines' })
  @ApiResponse({ status: 200, description: 'Journal entry found' })
  @ApiResponse({ status: 404, description: 'Journal entry not found' })
  async findOne(@Param('id') id: string): Promise<JournalEntryResponse> {
    return this.journalEntriesService.findOne(id);
  }

  @Post()
  @RequirePermissions(Permission.ACCOUNTING_CREATE)
  @ApiOperation({ summary: 'Create manual journal entry', description: 'Creates a DRAFT journal entry' })
  @ApiResponse({ status: 201, description: 'Journal entry created' })
  @ApiResponse({ status: 400, description: 'Validation error (unbalanced, invalid accounts)' })
  async create(
    @Body() dto: CreateJournalEntryDto,
    @Request() req: any,
  ): Promise<JournalEntryResponse> {
    return this.journalEntriesService.create(dto, req.user?.id);
  }

  @Patch(':id/post')
  @RequirePermissions(Permission.ACCOUNTING_EDIT)
  @ApiOperation({ summary: 'Post a draft journal entry', description: 'Changes status from DRAFT to POSTED' })
  @ApiResponse({ status: 200, description: 'Journal entry posted' })
  @ApiResponse({ status: 400, description: 'Entry is not in DRAFT status' })
  async postEntry(@Param('id') id: string): Promise<JournalEntryResponse> {
    return this.journalEntriesService.postEntry(id);
  }

  @Patch(':id/void')
  @RequirePermissions(Permission.ACCOUNTING_EDIT)
  @ApiOperation({ summary: 'Void a journal entry', description: 'Marks entry as VOIDED with reason' })
  @ApiResponse({ status: 200, description: 'Journal entry voided' })
  @ApiResponse({ status: 400, description: 'Entry already voided' })
  async voidEntry(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<JournalEntryResponse> {
    return this.journalEntriesService.voidEntry(id, reason);
  }
}
