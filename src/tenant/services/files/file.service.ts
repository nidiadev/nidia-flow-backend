import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CreateFileDto, UpdateFileDto, FileResponseDto, EntityType } from '../../dto/files/file.dto';
import { S3Service } from './s3.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FileService {
  constructor(
    private readonly prisma: TenantPrismaService,
    private readonly s3Service: S3Service,
  ) {}

  private async getClient() {
    return this.prisma.getTenantClient();
  }

  /**
   * Upload file to S3 and create record
   */
  async uploadFile(
    file: any,
    uploadedBy: string,
    tenantId: string,
    entityType?: EntityType,
    entityId?: string,
  ): Promise<FileResponseDto> {
    try {
      // Validate file
      this.s3Service.validateFile(file);

      // Upload to S3
      const uploadResult = await this.s3Service.uploadFile(file, 'uploads', tenantId);

      // Create file record
      const createFileDto: CreateFileDto = {
        originalFilename: file.originalname,
        filePath: uploadResult.filePath,
        fileUrl: uploadResult.fileUrl,
        mimeType: file.mimetype,
        fileSize: file.size,
        entityType,
        entityId,
        fileType: this.s3Service.getFileType(file.mimetype),
        storageProvider: 's3',
        bucketName: uploadResult.bucketName,
        metadata: {},
      };

      return this.create(createFileDto, uploadedBy);
    } catch (error) {
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Create a new file record
   */
  async create(createFileDto: CreateFileDto, uploadedBy: string): Promise<FileResponseDto> {
    try {
      const filename = this.generateFilename(createFileDto.originalFilename);
      const client = await this.getClient();
      
      const file = await client.file.create({
        data: {
          filename,
          originalFilename: createFileDto.originalFilename,
          filePath: createFileDto.filePath,
          fileUrl: createFileDto.fileUrl,
          mimeType: createFileDto.mimeType,
          fileSize: createFileDto.fileSize,
          entityType: createFileDto.entityType,
          entityId: createFileDto.entityId,
          fileType: createFileDto.fileType,
          storageProvider: createFileDto.storageProvider || 's3',
          bucketName: createFileDto.bucketName,
          metadata: createFileDto.metadata || {},
          uploadedBy,
        },
      });

      return this.mapToResponseDto(file);
    } catch (error) {
      throw new BadRequestException(`Failed to create file record: ${error.message}`);
    }
  }

  /**
   * Find all files with optional filtering
   */
  async findAll(
    entityType?: EntityType,
    entityId?: string,
    fileType?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ files: FileResponseDto[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const client = await this.getClient();
    
    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (fileType) where.fileType = fileType;

    const [files, total] = await Promise.all([
      client.file.findMany({
        where,
        orderBy: { uploadedAt: 'desc' },
        skip,
        take: limit,
        include: {
          uploadedByUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      client.file.count({ where }),
    ]);

    return {
      files: files.map(file => this.mapToResponseDto(file)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find files by entity
   */
  async findByEntity(entityType: EntityType, entityId: string): Promise<FileResponseDto[]> {
    const client = await this.getClient();
    const files = await client.file.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { uploadedAt: 'desc' },
      include: {
        uploadedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return files.map(file => this.mapToResponseDto(file));
  }

  /**
   * Find a file by ID
   */
  async findOne(id: string): Promise<FileResponseDto> {
    const client = await this.getClient();
    const file = await client.file.findUnique({
      where: { id },
      include: {
        uploadedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${id} not found`);
    }

    return this.mapToResponseDto(file);
  }

  /**
   * Update a file record
   */
  async update(id: string, updateFileDto: UpdateFileDto): Promise<FileResponseDto> {
    const client = await this.getClient();
    const existingFile = await client.file.findUnique({
      where: { id },
    });

    if (!existingFile) {
      throw new NotFoundException(`File with ID ${id} not found`);
    }

    try {
      const updatedFile = await client.file.update({
        where: { id },
        data: {
          originalFilename: updateFileDto.originalFilename,
          entityType: updateFileDto.entityType,
          entityId: updateFileDto.entityId,
          fileType: updateFileDto.fileType,
          metadata: updateFileDto.metadata,
        },
        include: {
          uploadedByUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return this.mapToResponseDto(updatedFile);
    } catch (error) {
      throw new BadRequestException(`Failed to update file: ${error.message}`);
    }
  }

  /**
   * Delete a file record
   */
  async remove(id: string): Promise<void> {
    const client = await this.getClient();
    const existingFile = await client.file.findUnique({
      where: { id },
    });

    if (!existingFile) {
      throw new NotFoundException(`File with ID ${id} not found`);
    }

    try {
      await client.file.delete({
        where: { id },
      });
    } catch (error) {
      throw new BadRequestException(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Get file statistics
   */
  async getStatistics(): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByType: Record<string, number>;
    filesByEntity: Record<string, number>;
  }> {
    const client = await this.getClient();
    const [totalFiles, totalSizeResult, filesByType, filesByEntity] = await Promise.all([
      client.file.count(),
      client.file.aggregate({
        _sum: {
          fileSize: true,
        },
      }),
      client.file.groupBy({
        by: ['fileType'],
        _count: {
          id: true,
        },
      }),
      client.file.groupBy({
        by: ['entityType'],
        _count: {
          id: true,
        },
      }),
    ]);

    return {
      totalFiles,
      totalSize: totalSizeResult._sum.fileSize || 0,
      filesByType: filesByType.reduce((acc, item) => {
        acc[item.fileType || 'unknown'] = item._count.id;
        return acc;
      }, {}),
      filesByEntity: filesByEntity.reduce((acc, item) => {
        acc[item.entityType || 'unknown'] = item._count.id;
        return acc;
      }, {}),
    };
  }

  /**
   * Clean up orphaned files (files not associated with any entity)
   */
  async cleanupOrphanedFiles(): Promise<{ deletedCount: number }> {
    const client = await this.getClient();
    const orphanedFiles = await client.file.findMany({
      where: {
        OR: [
          { entityType: null },
          { entityId: null },
        ],
      },
    });

    if (orphanedFiles.length === 0) {
      return { deletedCount: 0 };
    }

    const deletedCount = await client.file.deleteMany({
      where: {
        id: {
          in: orphanedFiles.map(file => file.id),
        },
      },
    });

    return { deletedCount: deletedCount.count };
  }

  /**
   * Generate a unique filename
   */
  private generateFilename(originalFilename: string): string {
    const timestamp = Date.now();
    const uuid = uuidv4().substring(0, 8);
    const extension = originalFilename.split('.').pop();
    return `${timestamp}_${uuid}.${extension}`;
  }

  /**
   * Map database entity to response DTO
   */
  private mapToResponseDto(file: any): FileResponseDto {
    return {
      id: file.id,
      filename: file.filename,
      originalFilename: file.originalFilename,
      filePath: file.filePath,
      fileUrl: file.fileUrl,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      entityType: file.entityType,
      entityId: file.entityId,
      fileType: file.fileType,
      storageProvider: file.storageProvider,
      bucketName: file.bucketName,
      metadata: file.metadata,
      uploadedBy: file.uploadedBy,
      uploadedAt: file.uploadedAt,
    };
  }
}