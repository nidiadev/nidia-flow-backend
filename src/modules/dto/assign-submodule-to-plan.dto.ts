import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class AssignSubModuleToPlanDto {
  @ApiProperty({ description: 'SubModule ID' })
  @IsUUID()
  @IsNotEmpty()
  subModuleId: string;

  @ApiProperty({ description: 'Plan ID' })
  @IsUUID()
  @IsNotEmpty()
  planId: string;

  @ApiPropertyOptional({ description: 'Whether the submodule is enabled for this plan', default: true })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}

