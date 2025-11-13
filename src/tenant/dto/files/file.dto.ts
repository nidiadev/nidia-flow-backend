import { IsString, IsOptional, IsUUID, IsInt, IsEnum, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FileType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  VIDEO = 'video',
}

export enum EntityType {
  ORDER = 'order',
  TASK = 'task',
  CUSTOMER = 'customer',
  PRODUCT = 'product',
}

export class CreateFileDto {
  @ApiProperty({ description: 'Original filename' })
  @IsString()
  originalFilename: string;

  @ApiProperty({ description: 'File path in storage' })
  @IsString()
  filePath: string;

  @ApiProperty({ description: 'Public URL of the file' })
  @IsString()
  fileUrl: string;

  @ApiPropertyOptional({ description: 'MIME type of the file' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  @IsOptional()
  @IsInt()
  fileSize?: number;

  @ApiPropertyOptional({ enum: EntityType, description: 'Type of entity this file belongs to' })
  @IsOptional()
  @IsEnum(EntityType)
  entityType?: EntityType;

  @ApiPropertyOptional({ description: 'ID of the entity this file belongs to' })
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({ enum: FileType, description: 'Type of file' })
  @IsOptional()
  @IsEnum(FileType)
  fileType?: FileType;

  @ApiPropertyOptional({ description: 'Storage provider (default: s3)' })
  @IsOptional()
  @IsString()
  storageProvider?: string;

  @ApiPropertyOptional({ description: 'Bucket name in storage provider' })
  @IsOptional()
  @IsString()
  bucketName?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateFileDto {
  @ApiPropertyOptional({ description: 'Original filename' })
  @IsOptional()
  @IsString()
  originalFilename?: string;

  @ApiPropertyOptional({ enum: EntityType, description: 'Type of entity this file belongs to' })
  @IsOptional()
  @IsEnum(EntityType)
  entityType?: EntityType;

  @ApiPropertyOptional({ description: 'ID of the entity this file belongs to' })
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({ enum: FileType, description: 'Type of file' })
  @IsOptional()
  @IsEnum(FileType)
  fileType?: FileType;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class FileResponseDto {
  @ApiProperty({ description: 'File ID' })
  id: string;

  @ApiProperty({ description: 'Generated filename' })
  filename: string;

  @ApiProperty({ description: 'Original filename' })
  originalFilename: string;

  @ApiProperty({ description: 'File path in storage' })
  filePath: string;

  @ApiProperty({ description: 'Public URL of the file' })
  fileUrl: string;

  @ApiPropertyOptional({ description: 'MIME type of the file' })
  mimeType?: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  fileSize?: number;

  @ApiPropertyOptional({ description: 'Type of entity this file belongs to' })
  entityType?: string;

  @ApiPropertyOptional({ description: 'ID of the entity this file belongs to' })
  entityId?: string;

  @ApiPropertyOptional({ description: 'Type of file' })
  fileType?: string;

  @ApiProperty({ description: 'Storage provider' })
  storageProvider: string;

  @ApiPropertyOptional({ description: 'Bucket name in storage provider' })
  bucketName?: string;

  @ApiProperty({ description: 'Additional metadata' })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'User who uploaded the file' })
  uploadedBy: string;

  @ApiProperty({ description: 'Upload timestamp' })
  uploadedAt: Date;
}