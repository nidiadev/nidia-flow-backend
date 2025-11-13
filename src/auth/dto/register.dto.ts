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
    description: 'User password (min 8 characters, must contain uppercase, lowercase, number and special character)',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
    },
  )
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
}