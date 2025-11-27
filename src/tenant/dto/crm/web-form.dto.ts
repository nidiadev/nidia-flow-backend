import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsObject,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Form Field Types
 */
export enum FormFieldType {
  TEXT = 'text',
  EMAIL = 'email',
  PHONE = 'phone',
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  CHECKBOX = 'checkbox',
  TEXTAREA = 'textarea',
  URL = 'url',
  NUMBER = 'number',
  DATE = 'date',
}

/**
 * Form Field DTO
 */
export class FormFieldDto {
  @ApiProperty({ description: 'Field ID (unique within form)' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Field type', enum: FormFieldType })
  @IsEnum(FormFieldType)
  type: FormFieldType;

  @ApiProperty({ description: 'Field label' })
  @IsString()
  label: string;

  @ApiPropertyOptional({ description: 'Field name (for form submission)' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Placeholder text' })
  @IsOptional()
  @IsString()
  placeholder?: string;

  @ApiPropertyOptional({ description: 'Whether field is required', default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ description: 'Options (for select/multi_select)', type: [String] })
  @IsOptional()
  @IsArray()
  options?: string[];

  @ApiPropertyOptional({ description: 'Validation rules', type: Object })
  @IsOptional()
  @IsObject()
  validation?: any;

  @ApiPropertyOptional({ description: 'Default value' })
  @IsOptional()
  defaultValue?: any;

  @ApiPropertyOptional({ description: 'Field order/position' })
  @IsOptional()
  order?: number;
}

/**
 * Form Settings DTO
 */
export class FormSettingsDto {
  @ApiPropertyOptional({ description: 'Confirmation message after submission' })
  @IsOptional()
  @IsString()
  confirmationMessage?: string;

  @ApiPropertyOptional({ description: 'Redirect URL after submission' })
  @IsOptional()
  @IsString()
  redirectUrl?: string;

  @ApiPropertyOptional({ description: 'Auto-create customer from submission', default: true })
  @IsOptional()
  @IsBoolean()
  autoCreateCustomer?: boolean;

  @ApiPropertyOptional({ description: 'Assign customer to user ID' })
  @IsOptional()
  @IsString()
  assignTo?: string;

  @ApiPropertyOptional({ description: 'Default lead source for submissions' })
  @IsOptional()
  @IsString()
  defaultLeadSource?: string;
}

/**
 * Form Styles DTO
 */
export class FormStylesDto {
  @ApiPropertyOptional({ description: 'Primary color (hex)' })
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional({ description: 'Background color (hex)' })
  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @ApiPropertyOptional({ description: 'Font family' })
  @IsOptional()
  @IsString()
  fontFamily?: string;

  @ApiPropertyOptional({ description: 'Show logo', default: false })
  @IsOptional()
  @IsBoolean()
  showLogo?: boolean;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsOptional()
  @IsString()
  logoUrl?: string;
}

/**
 * Create WebForm DTO
 */
export class CreateWebFormDto {
  @ApiProperty({ description: 'Form name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Form description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether form is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Form fields',
    type: [FormFieldDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  fields: FormFieldDto[];

  @ApiPropertyOptional({
    description: 'Form settings',
    type: FormSettingsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FormSettingsDto)
  settings?: FormSettingsDto;

  @ApiPropertyOptional({
    description: 'Form styles',
    type: FormStylesDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FormStylesDto)
  styles?: FormStylesDto;

  @ApiPropertyOptional({ description: 'Enable reCAPTCHA', default: false })
  @IsOptional()
  @IsBoolean()
  recaptchaEnabled?: boolean;

  @ApiPropertyOptional({ description: 'reCAPTCHA site key' })
  @IsOptional()
  @IsString()
  recaptchaSiteKey?: string;
}

/**
 * Update WebForm DTO
 */
export class UpdateWebFormDto {
  @ApiPropertyOptional({ description: 'Form name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Form description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether form is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Form fields',
    type: [FormFieldDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  fields?: FormFieldDto[];

  @ApiPropertyOptional({
    description: 'Form settings',
    type: FormSettingsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FormSettingsDto)
  settings?: FormSettingsDto;

  @ApiPropertyOptional({
    description: 'Form styles',
    type: FormStylesDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FormStylesDto)
  styles?: FormStylesDto;

  @ApiPropertyOptional({ description: 'Enable reCAPTCHA' })
  @IsOptional()
  @IsBoolean()
  recaptchaEnabled?: boolean;

  @ApiPropertyOptional({ description: 'reCAPTCHA site key' })
  @IsOptional()
  @IsString()
  recaptchaSiteKey?: string;
}

/**
 * WebForm Filter DTO
 */
export class WebFormFilterDto {
  @ApiPropertyOptional({ description: 'Filter by name (partial match)' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

/**
 * Submit WebForm DTO (Public)
 */
export class SubmitWebFormDto {
  @ApiProperty({ description: 'Form field values', type: Object })
  @IsObject()
  data: Record<string, any>;

  @ApiPropertyOptional({ description: 'reCAPTCHA token' })
  @IsOptional()
  @IsString()
  recaptchaToken?: string;
}

/**
 * WebForm Response DTO
 */
export class WebFormResponseDto {
  @ApiProperty({ description: 'Form ID' })
  id: string;

  @ApiProperty({ description: 'Form name' })
  name: string;

  @ApiPropertyOptional({ description: 'Form description' })
  description?: string;

  @ApiProperty({ description: 'Whether form is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Form fields', type: [Object] })
  fields: any[];

  @ApiProperty({ description: 'Form settings', type: Object })
  settings: any;

  @ApiProperty({ description: 'Form styles', type: Object })
  styles: any;

  @ApiProperty({ description: 'Embed code' })
  embedCode: string;

  @ApiProperty({ description: 'Embed URL' })
  embedUrl: string;

  @ApiProperty({ description: 'reCAPTCHA enabled' })
  recaptchaEnabled: boolean;

  @ApiProperty({ description: 'View count' })
  viewCount: number;

  @ApiProperty({ description: 'Submission count' })
  submissionCount: number;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: Date;
}

/**
 * WebForm Submission Response DTO
 */
export class WebFormSubmissionResponseDto {
  @ApiProperty({ description: 'Submission ID' })
  id: string;

  @ApiProperty({ description: 'Form ID' })
  formId: string;

  @ApiProperty({ description: 'Submission data', type: Object })
  data: any;

  @ApiPropertyOptional({ description: 'Customer ID (if created)' })
  customerId?: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;
}

