import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { PermissionsGuard } from '../../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserPermissions } from '../../../common/decorators/user-permissions.decorator';
import { ConversationService } from '../../services/crm/conversation.service';
import {
  CreateConversationDto,
  UpdateConversationDto,
  ConversationFilterDto,
  ConversationResponseDto,
  ConversationSummaryDto,
  SendMessageDto,
  AddConversationNoteDto,
  MessageResponseDto,
} from '../../dto/crm/conversation.dto';
import { ApiResponseDto } from '../../dto/base/base.dto';

@ApiTags('CRM - Unified Inbox')
@ApiBearerAuth()
@Controller('crm/inbox')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class InboxController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post('conversations')
  @RequirePermissions('crm:write', 'communications:write')
  @ApiOperation({ 
    summary: 'Create a new conversation',
    description: 'Creates a new conversation in the unified inbox'
  })
  @ApiBody({ type: CreateConversationDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Conversation created successfully',
    type: ConversationResponseDto,
  })
  async create(
    @Body(ValidationPipe) createDto: CreateConversationDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<ConversationResponseDto>> {
    const conversation = await this.conversationService.create(createDto, userId);
    return {
      success: true,
      data: conversation,
      message: 'Conversation created successfully',
    };
  }

  @Get('conversations')
  @RequirePermissions('crm:read', 'communications:read')
  @ApiOperation({ 
    summary: 'Get conversations with filtering and pagination',
    description: 'Retrieves a paginated list of conversations with optional filtering'
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'channel', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'assignedTo', required: false, type: String })
  @ApiQuery({ name: 'priority', required: false, type: String })
  @ApiQuery({ name: 'unassignedOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'slaViolatedOnly', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conversations retrieved successfully',
  })
  async findMany(
    @Query(ValidationPipe) filterDto: ConversationFilterDto,
    @CurrentUser('userId') userId: string,
    @UserPermissions() userPermissions: string[],
  ): Promise<ApiResponseDto<ConversationSummaryDto[]>> {
    const result = await this.conversationService.findMany(filterDto, userId, userPermissions);
    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
  }

  @Get('conversations/stats')
  @RequirePermissions('crm:read', 'communications:read')
  @ApiOperation({ 
    summary: 'Get inbox statistics',
    description: 'Returns aggregated statistics for the inbox'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
  })
  async getStats(
    @CurrentUser('userId') userId: string,
    @UserPermissions() userPermissions: string[],
  ): Promise<ApiResponseDto<any>> {
    const stats = await this.conversationService.getInboxStats(userId, userPermissions);
    return {
      success: true,
      data: stats,
    };
  }

  @Get('conversations/:id')
  @RequirePermissions('crm:read', 'communications:read')
  @ApiOperation({ 
    summary: 'Get conversation by ID',
    description: 'Retrieves a single conversation with all messages and notes'
  })
  @ApiParam({ name: 'id', type: String, description: 'Conversation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conversation retrieved successfully',
    type: ConversationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Conversation not found',
  })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<ConversationResponseDto>> {
    const conversation = await this.conversationService.findById(id);
    return {
      success: true,
      data: conversation,
    };
  }

  @Put('conversations/:id')
  @RequirePermissions('crm:write', 'communications:write')
  @ApiOperation({ 
    summary: 'Update conversation',
    description: 'Updates conversation status, assignment, priority, etc.'
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateConversationDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conversation updated successfully',
    type: ConversationResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdateConversationDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<ConversationResponseDto>> {
    const conversation = await this.conversationService.update(id, updateDto, userId);
    return {
      success: true,
      data: conversation,
      message: 'Conversation updated successfully',
    };
  }

  @Post('conversations/:id/messages')
  @RequirePermissions('crm:write', 'communications:write')
  @ApiOperation({ 
    summary: 'Send a message in a conversation',
    description: 'Sends a message (reply) in an existing conversation'
  })
  @ApiParam({ name: 'id', type: String, description: 'Conversation ID' })
  @ApiBody({ type: SendMessageDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Message sent successfully',
    type: MessageResponseDto,
  })
  async sendMessage(
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Body(ValidationPipe) sendDto: SendMessageDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<MessageResponseDto>> {
    const message = await this.conversationService.sendMessage(conversationId, sendDto, userId);
    return {
      success: true,
      data: message,
      message: 'Message sent successfully',
    };
  }

  @Post('conversations/:id/notes')
  @RequirePermissions('crm:write', 'communications:write')
  @ApiOperation({ 
    summary: 'Add a note to conversation',
    description: 'Adds an internal or external note to a conversation'
  })
  @ApiParam({ name: 'id', type: String, description: 'Conversation ID' })
  @ApiBody({ type: AddConversationNoteDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Note added successfully',
    type: ConversationResponseDto,
  })
  async addNote(
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Body(ValidationPipe) noteDto: AddConversationNoteDto,
    @CurrentUser('userId') userId: string,
  ): Promise<ApiResponseDto<ConversationResponseDto>> {
    const conversation = await this.conversationService.addNote(conversationId, noteDto, userId);
    return {
      success: true,
      data: conversation,
      message: 'Note added successfully',
    };
  }
}

