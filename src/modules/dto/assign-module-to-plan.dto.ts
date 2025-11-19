import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsBoolean, IsOptional } from 'class-validator';

export class AssignModuleToPlanDto {
  @ApiProperty({ description: 'Module ID' })
  @IsUUID()
  moduleId: string;

  @ApiProperty({ description: 'Plan ID' })
  @IsUUID()
  planId: string;

  @ApiPropertyOptional({ description: 'Whether module is enabled for this plan', default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

