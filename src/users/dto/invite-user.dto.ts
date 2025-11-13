import { IsEmail, IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from './create-user.dto';

export class InviteUserDto {
  @ApiProperty({
    description: 'Email address of the user to invite',
    example: 'newuser@example.com',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'First name of the user to invite',
    example: 'Jane',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Last name of the user to invite',
    example: 'Smith',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiProperty({
    description: 'Role to assign to the invited user',
    enum: UserRole,
    example: UserRole.SALES,
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({
    description: 'Department for the invited user',
    example: 'Marketing',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({
    description: 'Position/title for the invited user',
    example: 'Marketing Specialist',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string;

  @ApiPropertyOptional({
    description: 'Custom message to include in the invitation email',
    example: 'Welcome to our team! Please set up your account.',
  })
  @IsOptional()
  @IsString()
  message?: string;
}