import { IsString, IsOptional, IsArray, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Role name',
    example: 'Custom Manager',
  })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Role description',
    example: 'Custom role with specific permissions for project managers',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Array of permissions for this role',
    example: [
      'crm:read',
      'crm:write',
      'orders:read',
      'orders:write',
      'tasks:read',
      'tasks:write',
      'reports:read'
    ],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];

  @ApiPropertyOptional({
    description: 'Whether this is a system role (non-editable)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isSystemRole?: boolean;
}