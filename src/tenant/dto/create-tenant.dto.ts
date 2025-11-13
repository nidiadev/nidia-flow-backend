import { IsString, IsEmail, IsOptional, Matches, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({
    description: 'Company name',
    example: 'Acme Corporation',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'URL-safe slug for the tenant (lowercase, numbers, hyphens only)',
    example: 'acme-corp',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @ApiPropertyOptional({
    description: 'Legal company name',
    example: 'Acme Corporation S.A.S.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyLegalName?: string;

  @ApiPropertyOptional({
    description: 'Tax ID or NIT',
    example: '900123456-1',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;

  @ApiPropertyOptional({
    description: 'Industry sector',
    example: 'Technology',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional({
    description: 'Company size',
    example: 'medium',
    enum: ['small', 'medium', 'large', 'enterprise'],
  })
  @IsOptional()
  @IsString()
  companySize?: string;

  @ApiProperty({
    description: 'Billing email address',
    example: 'billing@acme.com',
  })
  @IsEmail()
  billingEmail: string;

  @ApiPropertyOptional({
    description: 'Billing contact name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  billingContactName?: string;

  @ApiPropertyOptional({
    description: 'Billing address',
    example: 'Calle 123 #45-67',
  })
  @IsOptional()
  @IsString()
  billingAddress?: string;

  @ApiPropertyOptional({
    description: 'Billing city',
    example: 'Bogotá',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  billingCity?: string;

  @ApiPropertyOptional({
    description: 'Billing state/province',
    example: 'Cundinamarca',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  billingState?: string;

  @ApiPropertyOptional({
    description: 'Billing country (ISO 3166-1 alpha-2)',
    example: 'CO',
    default: 'CO',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  billingCountry?: string;

  @ApiPropertyOptional({
    description: 'Billing postal code',
    example: '110111',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  billingPostalCode?: string;

  @ApiPropertyOptional({
    description: 'Payment method',
    example: 'credit_card',
    enum: ['credit_card', 'debit_card', 'bank_transfer', 'cash', 'other'],
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'Primary contact name',
    example: 'Jane Smith',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  primaryContactName?: string;

  @ApiPropertyOptional({
    description: 'Primary contact email',
    example: 'contact@acme.com',
  })
  @IsOptional()
  @IsEmail()
  primaryContactEmail?: string;

  @ApiPropertyOptional({
    description: 'Primary contact phone',
    example: '+57 300 123 4567',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  primaryContactPhone?: string;

  @ApiPropertyOptional({
    description: 'Initial plan type',
    example: 'free',
    enum: ['free', 'basic', 'professional', 'enterprise'],
    default: 'free',
  })
  @IsOptional()
  @IsString()
  planType?: string;

  @ApiPropertyOptional({
    description: 'Referral source',
    example: 'google_ads',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referralSource?: string;

  @ApiPropertyOptional({
    description: 'Internal notes (NIDIA staff only)',
    example: 'Cliente importante, seguimiento especial requerido',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}