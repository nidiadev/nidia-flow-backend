import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsObject, Min, Max } from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ description: 'Unique plan name identifier' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Display name for the plan' })
  @IsString()
  displayName: string;

  @ApiPropertyOptional({ description: 'Plan description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Monthly price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceMonthly?: number;

  @ApiPropertyOptional({ description: 'Yearly price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceYearly?: number;

  @ApiPropertyOptional({ description: 'Currency code (default: USD)', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Maximum number of users' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxUsers?: number;

  @ApiPropertyOptional({ description: 'Maximum storage in GB' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxStorageGb?: number;

  @ApiPropertyOptional({ description: 'Maximum monthly emails' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxMonthlyEmails?: number;

  @ApiPropertyOptional({ description: 'Maximum monthly WhatsApp messages' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxMonthlyWhatsapp?: number;

  @ApiPropertyOptional({ description: 'Maximum monthly API calls' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxMonthlyApiCalls?: number;

  @ApiPropertyOptional({ 
    description: 'Plan features (JSON object)',
    type: Object,
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  features?: any;

  @ApiPropertyOptional({ description: 'Enabled modules', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledModules?: string[];

  @ApiPropertyOptional({ description: 'Stripe monthly price ID' })
  @IsOptional()
  @IsString()
  stripePriceIdMonthly?: string;

  @ApiPropertyOptional({ description: 'Stripe yearly price ID' })
  @IsOptional()
  @IsString()
  stripePriceIdYearly?: string;

  @ApiPropertyOptional({ description: 'Is plan active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Is plan visible in pricing page', default: true })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({ description: 'Sort order', default: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

