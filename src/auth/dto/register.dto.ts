import { IsEmail, IsString, MinLength, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'admin@empresa.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password (minimum 8 characters)',
    example: 'SecurePassword123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'Juan',
  })
  @IsString()
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Pérez',
  })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({
    description: 'User preferred language',
    example: 'es',
    default: 'es',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    description: 'User timezone',
    example: 'America/Bogota',
    default: 'America/Bogota',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({
    description: 'Company/tenant name',
    example: 'ACME Corp',
  })
  @IsString()
  companyName: string;

  @ApiProperty({
    description: 'Tenant slug (unique identifier)',
    example: 'acme',
  })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers and hyphens',
  })
  slug: string;

  @ApiPropertyOptional({
    description: 'User phone number with country code',
    example: '+57 300 123 4567',
  })
  @IsOptional()
  @IsString()
  phone?: string;
}