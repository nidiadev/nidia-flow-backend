import {
    IsString,
    IsEmail,
    IsOptional,
    IsBoolean,
    IsUUID,
    MinLength,
    MaxLength,
    Matches
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { BaseEntityDto } from '../base/base.dto';

/**
 * Create Customer Contact DTO
 */
export class CreateCustomerContactDto extends BaseEntityDto {
    @ApiProperty({
        description: 'Customer ID this contact belongs to'
    })
    @IsUUID()
    customerId: string;

    @ApiProperty({
        description: 'First name',
        minLength: 1,
        maxLength: 100,
        example: 'Maria'
    })
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    firstName: string;

    @ApiPropertyOptional({
        description: 'Last name',
        maxLength: 100,
        example: 'Garcia'
    })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    lastName?: string;

    @ApiPropertyOptional({
        description: 'Position/Job title',
        maxLength: 100,
        example: 'Marketing Manager'
    })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    position?: string;

    @ApiPropertyOptional({
        description: 'Department',
        maxLength: 100,
        example: 'Marketing'
    })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    department?: string;

    @ApiPropertyOptional({
        description: 'Email address',
        example: 'maria.garcia@company.com'
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
        description: 'Is this the primary contact',
        example: false,
        default: false
    })
    @IsOptional()
    @IsBoolean()
    isPrimary?: boolean = false;

    @ApiPropertyOptional({
        description: 'Is contact active',
        example: true,
        default: true
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean = true;

    @ApiPropertyOptional({
        description: 'Notes about this contact',
        example: 'Decision maker for marketing budget'
    })
    @IsOptional()
    @IsString()
    notes?: string;
}

/**
 * Update Customer Contact DTO
 */
export class UpdateCustomerContactDto extends PartialType(CreateCustomerContactDto) {
    @ApiPropertyOptional({ description: 'Customer ID this contact belongs to' })
    @IsOptional()
    @IsUUID()
    customerId?: string;
}

/**
 * Set Primary Contact DTO
 */
export class SetPrimaryContactDto {
    @ApiProperty({
        description: 'Contact ID to set as primary'
    })
    @IsUUID()
    contactId: string;
}

/**
 * Customer Contact Response DTO
 */
export class CustomerContactResponseDto {
    @ApiProperty({ description: 'Contact ID' })
    id: string;

    @ApiProperty({ description: 'Creation date' })
    createdAt: string;

    @ApiProperty({ description: 'Last update date' })
    updatedAt: string;

    @ApiProperty({ description: 'Customer ID this contact belongs to' })
    customerId: string;

    @ApiProperty({ description: 'First name' })
    firstName: string;

    @ApiPropertyOptional({ description: 'Last name' })
    lastName?: string;

    @ApiPropertyOptional({ description: 'Position/Job title' })
    position?: string;

    @ApiPropertyOptional({ description: 'Department' })
    department?: string;

    @ApiPropertyOptional({ description: 'Email address' })
    email?: string;

    @ApiPropertyOptional({ description: 'Phone number' })
    phone?: string;

    @ApiPropertyOptional({ description: 'Mobile number' })
    mobile?: string;

    @ApiPropertyOptional({ description: 'Is this the primary contact' })
    isPrimary?: boolean;

    @ApiPropertyOptional({ description: 'Is contact active' })
    isActive?: boolean;

    @ApiPropertyOptional({ description: 'Notes about this contact' })
    notes?: string;

    @ApiPropertyOptional({ description: 'Customer info' })
    customer?: {
        id: string;
        firstName: string;
        lastName: string;
        companyName: string;
    };
}