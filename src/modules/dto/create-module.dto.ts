import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsObject, Min, Max } from 'class-validator';

export class CreateModuleDto {
  @ApiProperty({ description: 'Unique module name identifier (e.g., "crm", "products")' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Display name for the module' })
  @IsString()
  displayName: string;

  @ApiPropertyOptional({ description: 'Module description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Icon name from lucide-react' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ description: 'Frontend path (e.g., "/crm")' })
  @IsString()
  path: string;

  @ApiPropertyOptional({ description: 'Category for grouping modules' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Sort order for display', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Whether module is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Whether module is visible in sidebar even if not enabled', default: true })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata (permissions, features, etc.)', type: Object })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

