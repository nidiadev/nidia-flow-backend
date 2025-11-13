import { IsString, IsOptional, IsObject, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'Template ID to use for the message' })
  @IsString()
  templateId: string;

  @ApiProperty({ description: 'Recipient (email or phone number)' })
  @IsString()
  recipient: string;

  @ApiProperty({ description: 'Variables to replace in the template' })
  @IsObject()
  variables: Record<string, any>;

  @ApiPropertyOptional({ description: 'Customer ID (optional)' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Schedule message for later (ISO string)' })
  @IsOptional()
  @IsDateString()
  scheduleAt?: string;
}

export class BulkRecipientDto {
  @ApiProperty({ description: 'Recipient (email or phone number)' })
  @IsString()
  recipient: string;

  @ApiProperty({ description: 'Variables to replace in the template for this recipient' })
  @IsObject()
  variables: Record<string, any>;

  @ApiPropertyOptional({ description: 'Customer ID (optional)' })
  @IsOptional()
  @IsString()
  customerId?: string;
}

export class BulkSendMessageDto {
  @ApiProperty({ description: 'Template ID to use for all messages' })
  @IsString()
  templateId: string;

  @ApiProperty({ 
    description: 'Array of recipients with their specific variables',
    type: [BulkRecipientDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkRecipientDto)
  recipients: BulkRecipientDto[];

  @ApiPropertyOptional({ description: 'Schedule all messages for later (ISO string)' })
  @IsOptional()
  @IsDateString()
  scheduleAt?: string;
}

export class UpdateMessageStatusDto {
  @ApiProperty({ 
    description: 'New message status',
    enum: ['pending', 'sent', 'delivered', 'failed', 'read']
  })
  @IsString()
  status: string;

  @ApiPropertyOptional({ description: 'Additional metadata for the status update' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class RenderTemplateDto {
  @ApiProperty({ description: 'Variables to replace in the template' })
  @IsObject()
  variables: Record<string, any>;
}

export class DuplicateTemplateDto {
  @ApiProperty({ description: 'Name for the duplicated template' })
  @IsString()
  name: string;
}