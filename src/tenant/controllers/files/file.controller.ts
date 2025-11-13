import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { FileService } from '../../services/files/file.service';
import { 
  CreateFileDto, 
  UpdateFileDto, 
  FileResponseDto, 
  EntityType 
} from '../../dto/files/file.dto';

@ApiTags('Files')
@ApiBearerAuth()
@Controller('files')
@UseGuards(JwtAuthGuard, TenantGuard)
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file to S3 storage' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ 
    status: 201, 
    description: 'File uploaded successfully',
    type: FileResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid file or data' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: any,
    @Body() createFileDto: CreateFileDto,
    @CurrentUser() user: any,
  ): Promise<FileResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.fileService.uploadFile(
      file,
      user.userId,
      user.tenantId,
      createFileDto.entityType,
      createFileDto.entityId,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a file record (without upload)' })
  @ApiResponse({ 
    status: 201, 
    description: 'File record created successfully',
    type: FileResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  async create(
    @Body() createFileDto: CreateFileDto,
    @CurrentUser() user: any,
  ): Promise<FileResponseDto> {
    return this.fileService.create(createFileDto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all files with optional filtering' })
  @ApiQuery({ name: 'entityType', required: false, enum: EntityType })
  @ApiQuery({ name: 'entityId', required: false, type: String })
  @ApiQuery({ name: 'fileType', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ 
    status: 200, 
    description: 'Files retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { $ref: '#/components/schemas/FileResponseDto' }
        },
        total: { type: 'number' },
        page: { type: 'number' },
        totalPages: { type: 'number' }
      }
    }
  })
  async findAll(
    @Query('entityType') entityType?: EntityType,
    @Query('entityId') entityId?: string,
    @Query('fileType') fileType?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.fileService.findAll(entityType, entityId, fileType, page, limit);
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Get files by entity type and ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Files retrieved successfully',
    type: [FileResponseDto] 
  })
  async findByEntity(
    @Param('entityType') entityType: EntityType,
    @Param('entityId', ParseUUIDPipe) entityId: string,
  ): Promise<FileResponseDto[]> {
    return this.fileService.findByEntity(entityType, entityId);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get file statistics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalFiles: { type: 'number' },
        totalSize: { type: 'number' },
        filesByType: { type: 'object' },
        filesByEntity: { type: 'object' }
      }
    }
  })
  async getStatistics() {
    return this.fileService.getStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a file by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'File retrieved successfully',
    type: FileResponseDto 
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<FileResponseDto> {
    return this.fileService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a file record' })
  @ApiResponse({ 
    status: 200, 
    description: 'File updated successfully',
    type: FileResponseDto 
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFileDto: UpdateFileDto,
  ): Promise<FileResponseDto> {
    return this.fileService.update(id, updateFileDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a file record' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.fileService.remove(id);
    return { message: 'File deleted successfully' };
  }

  @Post('cleanup-orphaned')
  @ApiOperation({ summary: 'Clean up orphaned files' })
  @ApiResponse({ 
    status: 200, 
    description: 'Cleanup completed successfully',
    schema: {
      type: 'object',
      properties: {
        deletedCount: { type: 'number' }
      }
    }
  })
  async cleanupOrphanedFiles() {
    return this.fileService.cleanupOrphanedFiles();
  }
}