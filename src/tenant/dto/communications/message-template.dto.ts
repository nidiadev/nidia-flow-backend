import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export enum MessageChannel {
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
}

export class CreateMessageTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  name: string;

  @ApiProperty({ enum: MessageChannel, description: 'Communication channel' })
  @IsEnum(MessageChannel)
  channel: MessageChannel;

  @ApiProperty({ description: 'Message type (order_confirmation, payment_reminder, etc.)' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: 'Email subject (for email channel)' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ description: 'Message body with variables {{variableName}}' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ description: 'WhatsApp template name (for WhatsApp channel)' })
  @IsOptional()
  @IsString()
  whatsappTemplateName?: string;

  @ApiPropertyOptional({ description: 'WhatsApp language code', default: 'es' })
  @IsOptional()
  @IsString()
  whatsappLanguage?: string;
}

export class UpdateMessageTemplateDto extends PartialType(CreateMessageTemplateDto) {
  @ApiPropertyOptional({ description: 'Template active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}