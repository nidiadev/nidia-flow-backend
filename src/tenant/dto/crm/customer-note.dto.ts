import { 
  IsString, 
  IsOptional, 
  IsBoolean,
  IsUUID,
  MinLength
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Create Customer Note DTO
 */
export class CreateCustomerNoteDto {
  @ApiProperty({ 
    description: 'Customer ID this note belongs to',
    format: 'uuid'
  })
  @IsUUID()
  customerId: string;

  @ApiProperty({ 
    description: 'Note content',
    example: 'Cliente interesado en productos premium. Prefiere comunicación por WhatsApp.'
  })
  @IsString()
  @MinLength(1, { message: 'Note content cannot be empty' })
  content: string;

  @ApiPropertyOptional({ 
    description: 'Is this note internal (not visible to customer)',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean = true;
}

/**
 * Update Customer Note DTO
 */
export class UpdateCustomerNoteDto {
  @ApiPropertyOptional({ 
    description: 'Note content'
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @ApiPropertyOptional({ 
    description: 'Is this note internal'
  })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}

/**
 * Customer Note Response DTO
 */
export class CustomerNoteResponseDto {
  @ApiProperty({ description: 'Note ID' })
  id: string;

  @ApiProperty({ description: 'Customer ID' })
  customerId: string;

  @ApiProperty({ description: 'Note content' })
  content: string;

  @ApiProperty({ description: 'Is internal note' })
  isInternal: boolean;

  @ApiProperty({ description: 'Created by user ID' })
  createdBy: string;

  @ApiProperty({ description: 'Created by user info' })
  createdByUser?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };

  @ApiProperty({ description: 'Creation date' })
  createdAt: string;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: string;
}

