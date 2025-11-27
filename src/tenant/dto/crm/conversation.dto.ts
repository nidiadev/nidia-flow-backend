import { 
  IsString, 
  IsOptional, 
  IsEnum, 
  IsArray, 
  IsUUID,
  IsBoolean,
  IsNumber,
  IsDateString,
  MinLength,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { SearchDto, DateRangeDto } from '../base/base.dto';

export enum ConversationStatus {
  OPEN = 'open',
  PENDING = 'pending',
  RESOLVED = 'resolved',
  SPAM = 'spam',
  ARCHIVED = 'archived'
}

export enum ConversationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum MessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound'
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  LOCATION = 'location',
  CONTACT = 'contact',
  STICKER = 'sticker'
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

/**
 * Create Conversation DTO
 */
export class CreateConversationDto {
  @ApiProperty({ 
    description: 'Customer ID',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ 
    description: 'Contact ID (CustomerContact)',
    format: 'uuid'
  })
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiProperty({ 
    description: 'Communication channel',
    enum: ['whatsapp', 'email', 'sms'],
    example: 'whatsapp'
  })
  @IsString()
  @IsEnum(['whatsapp', 'email', 'sms'])
  channel: string;

  @ApiPropertyOptional({ 
    description: 'Channel-specific ID (e.g., WhatsApp conversation ID)',
    maxLength: 255
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  channelId?: string;

  @ApiProperty({ 
    description: 'Recipient identifier (email, phone number, etc.)',
    maxLength: 255,
    example: '+573001234567'
  })
  @IsString()
  @MaxLength(255)
  recipient: string;

  @ApiPropertyOptional({ 
    description: 'Recipient name',
    maxLength: 255,
    example: 'Juan Pérez'
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  recipientName?: string;

  @ApiPropertyOptional({ 
    description: 'Initial status',
    enum: ConversationStatus,
    default: ConversationStatus.OPEN
  })
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @ApiPropertyOptional({ 
    description: 'Priority level',
    enum: ConversationPriority,
    default: ConversationPriority.NORMAL
  })
  @IsOptional()
  @IsEnum(ConversationPriority)
  priority?: ConversationPriority;

  @ApiPropertyOptional({ 
    description: 'SLA in minutes',
    minimum: 1,
    example: 60
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  slaMinutes?: number;

  @ApiPropertyOptional({ 
    description: 'Tags for categorization',
    type: [String],
    example: ['support', 'urgent']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * Update Conversation DTO
 */
export class UpdateConversationDto {
  @ApiPropertyOptional({ 
    description: 'Status',
    enum: ConversationStatus
  })
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @ApiPropertyOptional({ 
    description: 'Assigned user ID',
    format: 'uuid'
  })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ 
    description: 'Priority level',
    enum: ConversationPriority
  })
  @IsOptional()
  @IsEnum(ConversationPriority)
  priority?: ConversationPriority;

  @ApiPropertyOptional({ 
    description: 'Tags',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ 
    description: 'SLA in minutes',
    minimum: 1
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  slaMinutes?: number;
}

/**
 * Conversation Filter DTO
 */
export class ConversationFilterDto extends SearchDto {
  @ApiPropertyOptional({ 
    description: 'Filter by customer ID',
    format: 'uuid'
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by channel',
    enum: ['whatsapp', 'email', 'sms']
  })
  @IsOptional()
  @IsString()
  @IsEnum(['whatsapp', 'email', 'sms'])
  channel?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by status',
    enum: ConversationStatus
  })
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @ApiPropertyOptional({ 
    description: 'Filter by assigned user ID',
    format: 'uuid'
  })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by priority',
    enum: ConversationPriority
  })
  @IsOptional()
  @IsEnum(ConversationPriority)
  priority?: ConversationPriority;

  @ApiPropertyOptional({ 
    description: 'Filter by tags',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ 
    description: 'Filter by creation date range',
    type: DateRangeDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  createdAt?: DateRangeDto;

  @ApiPropertyOptional({ 
    description: 'Filter by last message date range',
    type: DateRangeDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  lastMessageAt?: DateRangeDto;

  @ApiPropertyOptional({ 
    description: 'Show only unassigned conversations',
    example: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  unassignedOnly?: boolean;

  @ApiPropertyOptional({ 
    description: 'Show only conversations with SLA violations',
    example: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  slaViolatedOnly?: boolean;
}

/**
 * Send Message DTO
 */
export class SendMessageDto {
  @ApiProperty({ 
    description: 'Conversation ID',
    format: 'uuid'
  })
  @IsUUID()
  conversationId: string;

  @ApiProperty({ 
    description: 'Message body',
    minLength: 1
  })
  @IsString()
  @MinLength(1)
  body: string;

  @ApiPropertyOptional({ 
    description: 'Message subject (for emails)',
    maxLength: 255
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @ApiPropertyOptional({ 
    description: 'HTML body (for emails)'
  })
  @IsOptional()
  @IsString()
  bodyHtml?: string;

  @ApiPropertyOptional({ 
    description: 'Message type',
    enum: MessageType,
    default: MessageType.TEXT
  })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @ApiPropertyOptional({ 
    description: 'Attachments',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        filename: { type: 'string' },
        mimeType: { type: 'string' },
        size: { type: 'number' }
      }
    }
  })
  @IsOptional()
  @IsArray()
  attachments?: Array<{
    url: string;
    filename: string;
    mimeType?: string;
    size?: number;
  }>;
}

/**
 * Add Note DTO
 */
export class AddConversationNoteDto {
  @ApiProperty({ 
    description: 'Note content',
    minLength: 1
  })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiPropertyOptional({ 
    description: 'Is internal note (not visible to customer)',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}

/**
 * Message Response DTO
 */
export class MessageResponseDto {
  @ApiProperty({ description: 'Message ID', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Conversation ID', format: 'uuid' })
  conversationId: string;

  @ApiProperty({ description: 'Direction', enum: MessageDirection })
  direction: MessageDirection;

  @ApiProperty({ description: 'Channel' })
  channel: string;

  @ApiPropertyOptional({ description: 'Message type', enum: MessageType })
  type?: MessageType;

  @ApiPropertyOptional({ description: 'Subject' })
  subject?: string;

  @ApiPropertyOptional({ description: 'Body' })
  body?: string;

  @ApiPropertyOptional({ description: 'HTML body' })
  bodyHtml?: string;

  @ApiProperty({ description: 'Attachments', type: 'array' })
  attachments: Array<{
    url: string;
    filename: string;
    mimeType?: string;
    size?: number;
  }>;

  @ApiProperty({ description: 'Status', enum: MessageStatus })
  status: MessageStatus;

  @ApiPropertyOptional({ description: 'Provider message ID' })
  providerMessageId?: string;

  @ApiPropertyOptional({ description: 'Sent at', format: 'date-time' })
  sentAt?: string;

  @ApiPropertyOptional({ description: 'Delivered at', format: 'date-time' })
  deliveredAt?: string;

  @ApiPropertyOptional({ description: 'Read at', format: 'date-time' })
  readAt?: string;

  @ApiPropertyOptional({ description: 'Failed at', format: 'date-time' })
  failedAt?: string;

  @ApiPropertyOptional({ description: 'Error message' })
  errorMessage?: string;

  @ApiProperty({ description: 'Created at', format: 'date-time' })
  createdAt: string;
}

/**
 * Conversation Response DTO
 */
export class ConversationResponseDto {
  @ApiProperty({ description: 'Conversation ID', format: 'uuid' })
  id: string;

  @ApiPropertyOptional({ description: 'Customer ID', format: 'uuid' })
  customerId?: string;

  @ApiPropertyOptional({ description: 'Customer information' })
  customer?: {
    id: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    email?: string;
    phone?: string;
  };

  @ApiPropertyOptional({ description: 'Contact ID', format: 'uuid' })
  contactId?: string;

  @ApiPropertyOptional({ description: 'Contact information' })
  contact?: {
    id: string;
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
    position?: string;
  };

  @ApiProperty({ description: 'Channel' })
  channel: string;

  @ApiPropertyOptional({ description: 'Channel ID' })
  channelId?: string;

  @ApiProperty({ description: 'Recipient' })
  recipient: string;

  @ApiPropertyOptional({ description: 'Recipient name' })
  recipientName?: string;

  @ApiProperty({ description: 'Status', enum: ConversationStatus })
  status: ConversationStatus;

  @ApiPropertyOptional({ description: 'Assigned user ID', format: 'uuid' })
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Assigned user information' })
  assignedToUser?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };

  @ApiProperty({ description: 'Priority', enum: ConversationPriority })
  priority: ConversationPriority;

  @ApiPropertyOptional({ description: 'SLA in minutes' })
  slaMinutes?: number;

  @ApiPropertyOptional({ description: 'First message at', format: 'date-time' })
  firstMessageAt?: string;

  @ApiPropertyOptional({ description: 'First response at', format: 'date-time' })
  firstResponseAt?: string;

  @ApiPropertyOptional({ description: 'Last message at', format: 'date-time' })
  lastMessageAt?: string;

  @ApiPropertyOptional({ description: 'Last response at', format: 'date-time' })
  lastResponseAt?: string;

  @ApiPropertyOptional({ description: 'Resolved at', format: 'date-time' })
  resolvedAt?: string;

  @ApiPropertyOptional({ description: 'Archived at', format: 'date-time' })
  archivedAt?: string;

  @ApiProperty({ description: 'Tags', type: [String] })
  tags: string[];

  @ApiProperty({ description: 'Messages', type: [MessageResponseDto] })
  messages: MessageResponseDto[];

  @ApiProperty({ description: 'Notes', type: 'array' })
  notes: Array<{
    id: string;
    content: string;
    isInternal: boolean;
    createdBy: string;
    createdByUser?: {
      id: string;
      firstName?: string;
      lastName?: string;
      email: string;
    };
    createdAt: string;
  }>;

  @ApiProperty({ description: 'Unread message count' })
  unreadCount: number;

  @ApiProperty({ description: 'SLA status' })
  slaStatus: {
    isViolated: boolean;
    minutesRemaining?: number;
    minutesOverdue?: number;
  };

  @ApiProperty({ description: 'Created at', format: 'date-time' })
  createdAt: string;

  @ApiProperty({ description: 'Updated at', format: 'date-time' })
  updatedAt: string;
}

/**
 * Conversation Summary DTO (for inbox list)
 */
export class ConversationSummaryDto {
  @ApiProperty({ description: 'Conversation ID', format: 'uuid' })
  id: string;

  @ApiPropertyOptional({ description: 'Customer ID', format: 'uuid' })
  customerId?: string;

  @ApiProperty({ description: 'Customer name' })
  customerName: string;

  @ApiProperty({ description: 'Channel' })
  channel: string;

  @ApiProperty({ description: 'Recipient' })
  recipient: string;

  @ApiPropertyOptional({ description: 'Recipient name' })
  recipientName?: string;

  @ApiProperty({ description: 'Status', enum: ConversationStatus })
  status: ConversationStatus;

  @ApiPropertyOptional({ description: 'Assigned user name' })
  assignedToName?: string;

  @ApiProperty({ description: 'Priority', enum: ConversationPriority })
  priority: ConversationPriority;

  @ApiPropertyOptional({ description: 'Last message preview' })
  lastMessagePreview?: string;

  @ApiPropertyOptional({ description: 'Last message at', format: 'date-time' })
  lastMessageAt?: string;

  @ApiProperty({ description: 'Unread count' })
  unreadCount: number;

  @ApiProperty({ description: 'SLA status' })
  slaStatus: {
    isViolated: boolean;
    minutesRemaining?: number;
  };

  @ApiProperty({ description: 'Tags', type: [String] })
  tags: string[];

  @ApiProperty({ description: 'Created at', format: 'date-time' })
  createdAt: string;
}

