import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsOptional, IsBoolean, IsString, IsDateString } from 'class-validator';

export class AssignModuleToTenantDto {
  @ApiProperty({ description: 'Module ID' })
  @IsUUID()
  @IsNotEmpty()
  moduleId: string;

  @ApiProperty({ description: 'Tenant ID' })
  @IsUUID()
  @IsNotEmpty()
  tenantId: string;

  @ApiPropertyOptional({ description: 'Whether the module is enabled', default: true })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Start date of the assignment (ISO string)' })
  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @ApiPropertyOptional({ description: 'End date of the assignment (ISO string). Null = permanent' })
  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @ApiPropertyOptional({ description: 'Reason for the assignment' })
  @IsString()
  @IsOptional()
  reason?: string;
}

