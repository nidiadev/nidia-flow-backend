import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean, IsArray, IsUUID, Min, Max } from 'class-validator';

export class CreateSubModuleDto {
  @ApiProperty({ description: 'Module ID that this submodule belongs to' })
  @IsUUID()
  @IsNotEmpty()
  moduleId: string;

  @ApiProperty({ description: 'Unique name identifier (e.g., "customers", "interactions")' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Display name for the submodule' })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiPropertyOptional({ description: 'Description of the submodule' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Icon name from lucide-react' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ description: 'Frontend path (e.g., "/crm/customers")' })
  @IsString()
  @IsOptional()
  path?: string;

  @ApiPropertyOptional({ description: 'Sort order for display', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Whether the submodule is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Whether the submodule is visible in UI', default: true })
  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;

  @ApiPropertyOptional({ 
    description: 'Array of permission strings (e.g., ["read", "write", "delete"])',
    type: [String],
    example: ['read', 'write']
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata as JSON' })
  @IsOptional()
  metadata?: any;
}

