import { 
  IsString, 
  IsEmail, 
  IsOptional, 
  IsEnum, 
  IsNumber, 
  IsBoolean, 
  IsArray, 
  IsDecimal,
  IsUUID,
  MinLength,
  MaxLength,
  Min,
  Max,
  Matches
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { BaseCustomFieldsDto, SearchDto, DateRangeDto } from '../base/base.dto';

export enum CustomerType {
  LEAD = 'lead',
  PROSPECT = 'prospect',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CHURNED = 'churned'
}

export enum CustomerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

export enum LeadSource {
  WEBSITE = 'website',
  REFERRAL = 'referral',
  WHATSAPP = 'whatsapp',
  COLD_CALL = 'cold_call',
  SOCIAL_MEDIA = 'social_media',
  EMAIL_CAMPAIGN = 'email_campaign',
  EVENT = 'event',
  OTHER = 'other'
}

/**
 * Create Customer DTO
 */
export class CreateCustomerDto extends BaseCustomFieldsDto {
  @ApiProperty({ 
    description: 'Customer type',
    enum: CustomerType,
    example: CustomerType.LEAD
  })
  @IsEnum(CustomerType)
  type: CustomerType;

  @ApiPropertyOptional({ 
    description: 'Lead source',
    enum: LeadSource,
    example: LeadSource.WEBSITE
  })
  @IsOptional()
  @IsEnum(LeadSource)
  leadSource?: LeadSource;

  @ApiPropertyOptional({ 
    description: 'Lead score (0-100)',
    minimum: 0,
    maximum: 100,
    example: 75
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  leadScore?: number;

  @ApiProperty({ 
    description: 'First name',
    minLength: 1,
    maxLength: 100,
    example: 'John'
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @ApiPropertyOptional({ 
    description: 'Last name',
    maxLength: 100,
    example: 'Doe'
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ 
    description: 'Company name',
    maxLength: 255,
    example: 'Acme Corp'
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @ApiPropertyOptional({ 
    description: 'Email address',
    example: 'john.doe@example.com'
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ 
    description: 'Phone number',
    example: '+57 300 123 4567'
  })
  @IsOptional()
  @IsString()
  @Matches(/^[\+]?[0-9\s\-\(\)]+$/, { message: 'Invalid phone number format' })
  phone?: string;

  @ApiPropertyOptional({ 
    description: 'Mobile number',
    example: '+57 300 123 4567'
  })
  @IsOptional()
  @IsString()
  @Matches(/^[\+]?[0-9\s\-\(\)]+$/, { message: 'Invalid mobile number format' })
  mobile?: string;

  @ApiPropertyOptional({ 
    description: 'WhatsApp number',
    example: '+57 300 123 4567'
  })
  @IsOptional()
  @IsString()
  @Matches(/^[\+]?[0-9\s\-\(\)]+$/, { message: 'Invalid WhatsApp number format' })
  whatsapp?: string;

  @ApiPropertyOptional({ 
    description: 'Address line 1',
    example: 'Calle 123 #45-67'
  })
  @IsOptional()
  @IsString()
  addressLine1?: string;

  @ApiPropertyOptional({ 
    description: 'Address line 2',
    example: 'Apt 101'
  })
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiPropertyOptional({ 
    description: 'City',
    example: 'Bogotá'
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ 
    description: 'State/Province',
    example: 'Cundinamarca'
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ 
    description: 'Postal code',
    example: '110111'
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ 
    description: 'Country code (ISO 3166-1 alpha-2)',
    example: 'CO',
    default: 'CO'
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'Country must be a valid ISO 3166-1 alpha-2 code' })
  country?: string = 'CO';

  @ApiPropertyOptional({ 
    description: 'Latitude',
    example: 4.7110
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 8 })
  latitude?: number;

  @ApiPropertyOptional({ 
    description: 'Longitude',
    example: -74.0721
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 8 })
  longitude?: number;

  @ApiPropertyOptional({ 
    description: 'Industry',
    example: 'Technology'
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional({ 
    description: 'Customer segment',
    example: 'B2B'
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  segment?: string;

  @ApiPropertyOptional({ 
    description: 'Tax ID (NIT/RFC)',
    example: '900123456-1'
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;

  @ApiPropertyOptional({ 
    description: 'Credit limit',
    example: 5000000
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  creditLimit?: number;

  @ApiPropertyOptional({ 
    description: 'Payment terms in days',
    example: 30
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  paymentTerms?: number;

  @ApiPropertyOptional({ 
    description: 'Customer status',
    enum: CustomerStatus,
    example: CustomerStatus.ACTIVE
  })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @ApiPropertyOptional({ 
    description: 'Is customer active',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ 
    description: 'Tags',
    example: ['vip', 'enterprise']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ 
    description: 'Notes',
    example: 'Important customer, handle with care'
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ 
    description: 'Assigned to user ID',
    example: 'uuid-of-user'
  })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;
}

/**
 * Update Customer DTO
 */
export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}

/**
 * Customer Filter DTO
 */
export class CustomerFilterDto extends SearchDto {
  @ApiPropertyOptional({ 
    description: 'Filter by customer type',
    enum: CustomerType
  })
  @IsOptional()
  @IsEnum(CustomerType)
  type?: CustomerType;

  @ApiPropertyOptional({ 
    description: 'Filter by lead source',
    enum: LeadSource
  })
  @IsOptional()
  @IsEnum(LeadSource)
  leadSource?: LeadSource;

  @ApiPropertyOptional({ 
    description: 'Filter by status',
    enum: CustomerStatus
  })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @ApiPropertyOptional({ 
    description: 'Filter by assigned user ID'
  })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by city'
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by state'
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by industry'
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by segment'
  })
  @IsOptional()
  @IsString()
  segment?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by tags'
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ 
    description: 'Minimum lead score'
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minLeadScore?: number;

  @ApiPropertyOptional({ 
    description: 'Maximum lead score'
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  maxLeadScore?: number;

  @ApiPropertyOptional({ 
    description: 'Filter by creation date range'
  })
  @IsOptional()
  createdAt?: DateRangeDto;

  @ApiPropertyOptional({ 
    description: 'Filter by last contact date range'
  })
  @IsOptional()
  lastContactAt?: DateRangeDto;
}

/**
 * Customer Assignment DTO
 */
export class AssignCustomerDto {
  @ApiProperty({ 
    description: 'User ID to assign customer to'
  })
  @IsUUID()
  assignedTo: string;

  @ApiPropertyOptional({ 
    description: 'Assignment reason'
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Convert Lead DTO
 */
export class ConvertLeadDto {
  @ApiProperty({ 
    description: 'Target customer type',
    enum: [CustomerType.PROSPECT, CustomerType.ACTIVE]
  })
  @IsEnum([CustomerType.PROSPECT, CustomerType.ACTIVE])
  targetType: CustomerType.PROSPECT | CustomerType.ACTIVE;

  @ApiPropertyOptional({ 
    description: 'Conversion notes'
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Customer Response DTO
 */
export class CustomerResponseDto {
  @ApiProperty({ description: 'Customer ID' })
  id: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt: string;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: string;

  @ApiProperty({ description: 'Customer type', enum: CustomerType })
  type: CustomerType;

  @ApiPropertyOptional({ description: 'Lead source', enum: LeadSource })
  leadSource?: LeadSource;

  @ApiPropertyOptional({ description: 'Lead score (0-100)' })
  leadScore?: number;

  @ApiProperty({ description: 'First name' })
  firstName: string;

  @ApiPropertyOptional({ description: 'Last name' })
  lastName?: string;

  @ApiPropertyOptional({ description: 'Company name' })
  companyName?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Mobile number' })
  mobile?: string;

  @ApiPropertyOptional({ description: 'WhatsApp number' })
  whatsapp?: string;

  @ApiPropertyOptional({ description: 'Address line 1' })
  addressLine1?: string;

  @ApiPropertyOptional({ description: 'Address line 2' })
  addressLine2?: string;

  @ApiPropertyOptional({ description: 'City' })
  city?: string;

  @ApiPropertyOptional({ description: 'State/Province' })
  state?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Country code' })
  country?: string;

  @ApiPropertyOptional({ description: 'Latitude' })
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude' })
  longitude?: number;

  @ApiPropertyOptional({ description: 'Industry' })
  industry?: string;

  @ApiPropertyOptional({ description: 'Customer segment' })
  segment?: string;

  @ApiPropertyOptional({ description: 'Tax ID' })
  taxId?: string;

  @ApiPropertyOptional({ description: 'Credit limit' })
  creditLimit?: number;

  @ApiPropertyOptional({ description: 'Payment terms in days' })
  paymentTerms?: number;

  @ApiPropertyOptional({ description: 'Customer status', enum: CustomerStatus })
  status?: CustomerStatus;

  @ApiPropertyOptional({ description: 'Is customer active' })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Tags' })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Notes' })
  notes?: string;

  @ApiPropertyOptional({ description: 'Assigned to user ID' })
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Custom fields' })
  customFields?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Metadata' })
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Converted from lead at' })
  convertedFromLeadAt?: string;

  @ApiPropertyOptional({ description: 'First purchase date' })
  firstPurchaseAt?: string;

  @ApiPropertyOptional({ description: 'Last purchase date' })
  lastPurchaseAt?: string;

  @ApiPropertyOptional({ description: 'Last contact date' })
  lastContactAt?: string;

  @ApiPropertyOptional({ description: 'Assigned user info' })
  assignedUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiPropertyOptional({ description: 'Recent interactions count' })
  interactionsCount?: number;

  @ApiPropertyOptional({ description: 'Total orders count' })
  ordersCount?: number;

  @ApiPropertyOptional({ description: 'Total revenue' })
  totalRevenue?: number;
}