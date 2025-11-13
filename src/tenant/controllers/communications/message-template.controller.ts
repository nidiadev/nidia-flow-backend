import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { PermissionsGuard } from '../../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { MessageTemplateService } from '../../services/communications/message-template.service';
import {
  CreateMessageTemplateDto,
  UpdateMessageTemplateDto,
  MessageChannel,
} from '../../dto/communications/message-template.dto';
import { RenderTemplateDto, DuplicateTemplateDto } from '../../dto/communications/send-message.dto';

@ApiTags('Message Templates')
@ApiBearerAuth()
@Controller('message-templates')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class MessageTemplateController {
  constructor(private readonly messageTemplateService: MessageTemplateService) {}

  @Post()
  @RequirePermissions('communications:write')
  @ApiOperation({ summary: 'Create a new message template' })
  @ApiResponse({
    status: 201,
    description: 'Message template created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid template data or variables',
  })
  async create(
    @Body() createMessageTemplateDto: CreateMessageTemplateDto,
    @CurrentUser() user: any,
  ) {
    return this.messageTemplateService.create(createMessageTemplateDto, user.userId);
  }

  @Get()
  @RequirePermissions('communications:read')
  @ApiOperation({ summary: 'Get all message templates' })
  @ApiQuery({
    name: 'channel',
    required: false,
    enum: MessageChannel,
    description: 'Filter by communication channel',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by message type',
  })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Include inactive templates',
  })
  @ApiResponse({
    status: 200,
    description: 'List of message templates',
  })
  async findAll(
    @Query('channel') channel?: string,
    @Query('type') type?: string,
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    return this.messageTemplateService.findAll(channel, type, includeInactive);
  }

  @Get('variables')
  @RequirePermissions('communications:read')
  @ApiOperation({ summary: 'Get available template variables' })
  @ApiResponse({
    status: 200,
    description: 'Available template variables by category',
  })
  async getAvailableVariables() {
    return this.messageTemplateService.getAvailableVariables();
  }

  @Get('by-type/:type')
  @RequirePermissions('communications:read')
  @ApiOperation({ summary: 'Get templates by type' })
  @ApiParam({ name: 'type', description: 'Message type' })
  @ApiQuery({
    name: 'channel',
    required: false,
    enum: MessageChannel,
    description: 'Filter by communication channel',
  })
  @ApiResponse({
    status: 200,
    description: 'Templates filtered by type',
  })
  async getTemplatesByType(
    @Param('type') type: string,
    @Query('channel') channel?: string,
  ) {
    return this.messageTemplateService.getTemplatesByType(type, channel);
  }

  @Get(':id')
  @RequirePermissions('communications:read')
  @ApiOperation({ summary: 'Get a message template by ID' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: 200,
    description: 'Message template details',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  async findOne(@Param('id') id: string) {
    return this.messageTemplateService.findOne(id);
  }

  @Post(':id/render')
  @RequirePermissions('communications:read')
  @ApiOperation({ summary: 'Render template with variables' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: 200,
    description: 'Rendered template content',
  })
  @ApiResponse({
    status: 400,
    description: 'Template is inactive or invalid variables',
  })
  async renderTemplate(
    @Param('id') id: string,
    @Body() renderDto: RenderTemplateDto,
  ) {
    return this.messageTemplateService.renderTemplate(id, renderDto.variables);
  }

  @Post(':id/duplicate')
  @RequirePermissions('communications:write')
  @ApiOperation({ summary: 'Duplicate an existing template' })
  @ApiParam({ name: 'id', description: 'Template ID to duplicate' })
  @ApiResponse({
    status: 201,
    description: 'Template duplicated successfully',
  })
  async duplicateTemplate(
    @Param('id') id: string,
    @Body() duplicateDto: DuplicateTemplateDto,
    @CurrentUser() user: any,
  ) {
    return this.messageTemplateService.duplicateTemplate(id, duplicateDto.name, user.userId);
  }

  @Patch(':id')
  @RequirePermissions('communications:write')
  @ApiOperation({ summary: 'Update a message template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: 200,
    description: 'Template updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateMessageTemplateDto: UpdateMessageTemplateDto,
  ) {
    return this.messageTemplateService.update(id, updateMessageTemplateDto);
  }

  @Delete(':id')
  @RequirePermissions('communications:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate a message template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: 204,
    description: 'Template deactivated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  async remove(@Param('id') id: string) {
    await this.messageTemplateService.remove(id);
  }
}