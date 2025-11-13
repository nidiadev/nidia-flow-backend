import { IsString, IsOptional, IsEmail, IsUrl, IsObject, IsArray, IsDecimal } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateCompanySettingDto {
  @ApiPropertyOptional({ description: 'Company name' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ description: 'Legal name' })
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiPropertyOptional({ description: 'Tax ID (NIT/RFC)' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ description: 'Physical address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'State/Province' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Country code (ISO 3166-1 alpha-2)' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Primary color (hex)' })
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional({ description: 'Secondary color (hex)' })
  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @ApiPropertyOptional({ description: 'Business hours configuration' })
  @IsOptional()
  @IsObject()
  businessHours?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Timezone' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Currency code (ISO 4217)' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Locale (language-country)' })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional({ description: 'Default tax rate percentage' })
  @IsOptional()
  @Type(() => Number)
  @IsDecimal({ decimal_digits: '0,2' })
  defaultTaxRate?: number;

  @ApiPropertyOptional({ description: 'WhatsApp API key' })
  @IsOptional()
  @IsString()
  whatsappApiKey?: string;

  @ApiPropertyOptional({ description: 'WhatsApp phone ID' })
  @IsOptional()
  @IsString()
  whatsappPhoneId?: string;

  @ApiPropertyOptional({ description: 'SendGrid API key' })
  @IsOptional()
  @IsString()
  sendgridApiKey?: string;

  @ApiPropertyOptional({ description: 'SendGrid from email' })
  @IsOptional()
  @IsEmail()
  sendgridFromEmail?: string;

  @ApiPropertyOptional({ description: 'Google Maps API key' })
  @IsOptional()
  @IsString()
  googleMapsApiKey?: string;

  @ApiPropertyOptional({ description: 'Enabled modules' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledModules?: string[];

  @ApiPropertyOptional({ description: 'Additional settings' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class CompanySettingResponseDto {
  @ApiProperty({ description: 'Settings ID' })
  id: string;

  @ApiProperty({ description: 'Company name' })
  companyName: string;

  @ApiPropertyOptional({ description: 'Legal name' })
  legalName?: string;

  @ApiPropertyOptional({ description: 'Tax ID (NIT/RFC)' })
  taxId?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  email?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  website?: string;

  @ApiPropertyOptional({ description: 'Physical address' })
  address?: string;

  @ApiPropertyOptional({ description: 'City' })
  city?: string;

  @ApiPropertyOptional({ description: 'State/Province' })
  state?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  postalCode?: string;

  @ApiProperty({ description: 'Country code' })
  country: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  logoUrl?: string;

  @ApiProperty({ description: 'Primary color (hex)' })
  primaryColor: string;

  @ApiProperty({ description: 'Secondary color (hex)' })
  secondaryColor: string;

  @ApiProperty({ description: 'Business hours configuration' })
  businessHours: Record<string, any>;

  @ApiProperty({ description: 'Timezone' })
  timezone: string;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Locale' })
  locale: string;

  @ApiProperty({ description: 'Default tax rate percentage' })
  defaultTaxRate: number;

  @ApiPropertyOptional({ description: 'WhatsApp API key (masked)' })
  whatsappApiKey?: string;

  @ApiPropertyOptional({ description: 'WhatsApp phone ID' })
  whatsappPhoneId?: string;

  @ApiPropertyOptional({ description: 'SendGrid API key (masked)' })
  sendgridApiKey?: string;

  @ApiPropertyOptional({ description: 'SendGrid from email' })
  sendgridFromEmail?: string;

  @ApiPropertyOptional({ description: 'Google Maps API key (masked)' })
  googleMapsApiKey?: string;

  @ApiProperty({ description: 'Enabled modules' })
  enabledModules: string[];

  @ApiProperty({ description: 'Additional settings' })
  settings: Record<string, any>;

  @ApiPropertyOptional({ description: 'User who last updated settings' })
  updatedBy?: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}