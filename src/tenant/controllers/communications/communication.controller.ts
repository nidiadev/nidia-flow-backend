import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
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
import { MessageLogService } from '../../services/communications/message-log.service';
import { MessageTemplateService } from '../../services/communications/message-template.service';
import {
  CreateMessageLogDto,
  MessageLogFilterDto,
  MessageStatus,
} from '../../dto/communications/message-log.dto';
import {
  SendMessageDto,
  BulkSendMessageDto,
  UpdateMessageStatusDto,
} from '../../dto/communications/send-message.dto';

@ApiTags('Communications')
@ApiBearerAuth()
@Controller('communications')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class CommunicationController {
  constructor(
    private readonly messageLogService: MessageLogService,
    private readonly messageTemplateService: MessageTemplateService,
  ) {}

  @Post('send')
  @RequirePermissions('communications:write')
  @ApiOperation({ summary: 'Send a message using a template' })
  @ApiResponse({
    status: 201,
    description: 'Message sent successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid message data or template',
  })
  async sendMessage(@Body() sendMessageDto: SendMessageDto) {
    const { templateId, recipient, variables, customerId, scheduleAt } = sendMessageDto;

    // Get and render template
    const template = await this.messageTemplateService.findOne(templateId);
    const renderedContent = await this.messageTemplateService.renderTemplate(
      templateId,
      variables,
    );

    // Create message log entry
    const messageLog = await this.messageLogService.create({
      customerId,
      channel: template.channel,
      type: template.type,
      recipient,
      subject: renderedContent.subject,
      body: renderedContent.body,
      provider: this.getProviderForChannel(template.channel),
    });

    // TODO: Integrate with actual messaging providers (WhatsApp, SendGrid)
    // For now, we'll just mark as sent
    await this.messageLogService.updateStatus(messageLog.id, 'sent');

    return {
      messageId: messageLog.id,
      status: 'sent',
      recipient,
      channel: template.channel,
      scheduledAt: scheduleAt ? new Date(scheduleAt) : null,
    };
  }

  @Post('bulk-send')
  @RequirePermissions('communications:write')
  @ApiOperation({ summary: 'Send bulk messages using a template' })
  @ApiResponse({
    status: 201,
    description: 'Bulk messages queued successfully',
  })
  async sendBulkMessages(@Body() bulkSendDto: BulkSendMessageDto) {
    const { templateId, recipients, scheduleAt } = bulkSendDto;

    const template = await this.messageTemplateService.findOne(templateId);
    const results: Array<{
      messageId?: string;
      recipient: string;
      status: string;
      error?: string;
    }> = [];

    for (const recipientData of recipients) {
      try {
        const renderedContent = await this.messageTemplateService.renderTemplate(
          templateId,
          recipientData.variables,
        );

        const messageLog = await this.messageLogService.create({
          customerId: recipientData.customerId,
          channel: template.channel,
          type: template.type,
          recipient: recipientData.recipient,
          subject: renderedContent.subject,
          body: renderedContent.body,
          provider: this.getProviderForChannel(template.channel),
        });

        results.push({
          messageId: messageLog.id,
          recipient: recipientData.recipient,
          status: 'queued',
        });
      } catch (error) {
        results.push({
          recipient: recipientData.recipient,
          status: 'failed',
          error: error.message,
        });
      }
    }

    return {
      totalMessages: recipients.length,
      successful: results.filter((r) => r.status === 'queued').length,
      failed: results.filter((r) => r.status === 'failed').length,
      results,
      scheduledAt: scheduleAt ? new Date(scheduleAt) : null,
    };
  }

  @Get('messages')
  @RequirePermissions('communications:read')
  @ApiOperation({ summary: 'Get message logs with filters' })
  @ApiQuery({
    name: 'customerId',
    required: false,
    description: 'Filter by customer ID',
  })
  @ApiQuery({
    name: 'channel',
    required: false,
    description: 'Filter by communication channel',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: MessageStatus,
    description: 'Filter by message status',
  })
  @ApiQuery({
    name: 'provider',
    required: false,
    description: 'Filter by provider',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    description: 'Filter from date (ISO string)',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    description: 'Filter to date (ISO string)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiResponse({
    status: 200,
    description: 'List of message logs with pagination',
  })
  async getMessages(@Query() filters: MessageLogFilterDto) {
    return this.messageLogService.findAll(filters);
  }

  @Get('messages/:id')
  @RequirePermissions('communications:read')
  @ApiOperation({ summary: 'Get message log details' })
  @ApiParam({ name: 'id', description: 'Message log ID' })
  @ApiResponse({
    status: 200,
    description: 'Message log details',
  })
  @ApiResponse({
    status: 404,
    description: 'Message log not found',
  })
  async getMessage(@Param('id') id: string) {
    return this.messageLogService.findOne(id);
  }

  @Patch('messages/:id/status')
  @RequirePermissions('communications:write')
  @ApiOperation({ summary: 'Update message status' })
  @ApiParam({ name: 'id', description: 'Message log ID' })
  @ApiResponse({
    status: 200,
    description: 'Message status updated',
  })
  async updateMessageStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateMessageStatusDto,
  ) {
    return this.messageLogService.updateStatus(
      id,
      updateStatusDto.status,
      updateStatusDto.metadata,
    );
  }

  @Get('stats')
  @RequirePermissions('communications:read')
  @ApiOperation({ summary: 'Get communication statistics' })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    description: 'Filter from date (ISO string)',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    description: 'Filter to date (ISO string)',
  })
  @ApiResponse({
    status: 200,
    description: 'Communication statistics',
  })
  async getStats(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.messageLogService.getMessageStats(dateFrom, dateTo);
  }

  @Get('delivery-rate')
  @RequirePermissions('communications:read')
  @ApiOperation({ summary: 'Get delivery rate statistics' })
  @ApiQuery({
    name: 'channel',
    required: false,
    description: 'Filter by channel',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    description: 'Filter from date (ISO string)',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    description: 'Filter to date (ISO string)',
  })
  @ApiResponse({
    status: 200,
    description: 'Delivery rate statistics',
  })
  async getDeliveryRate(
    @Query('channel') channel?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.messageLogService.getDeliveryRate(channel, dateFrom, dateTo);
  }

  @Get('customers/:customerId/history')
  @RequirePermissions('communications:read')
  @ApiOperation({ summary: 'Get customer message history' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of messages to return',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer message history',
  })
  async getCustomerHistory(
    @Param('customerId') customerId: string,
    @Query('limit') limit?: number,
  ) {
    return this.messageLogService.getCustomerMessageHistory(customerId, limit);
  }

  @Get('failed-messages')
  @RequirePermissions('communications:read')
  @ApiOperation({ summary: 'Get failed messages for retry' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of failed messages to return',
  })
  @ApiResponse({
    status: 200,
    description: 'List of failed messages',
  })
  async getFailedMessages(@Query('limit') limit?: number) {
    return this.messageLogService.getFailedMessages(limit);
  }

  @Post('messages/:id/retry')
  @RequirePermissions('communications:write')
  @ApiOperation({ summary: 'Retry sending a failed message' })
  @ApiParam({ name: 'id', description: 'Message log ID' })
  @ApiResponse({
    status: 200,
    description: 'Message retry initiated',
  })
  async retryMessage(@Param('id') id: string) {
    const messageLog = await this.messageLogService.findOne(id);

    if (messageLog.status !== 'failed') {
      throw new Error('Only failed messages can be retried');
    }

    // Reset status to pending for retry
    await this.messageLogService.updateStatus(id, 'pending', {
      retryAttempt: (messageLog.metadata as any)?.retryAttempt + 1 || 1,
      retriedAt: new Date(),
    });

    // TODO: Queue for actual sending
    return {
      messageId: id,
      status: 'queued_for_retry',
      retryAttempt: (messageLog.metadata as any)?.retryAttempt + 1 || 1,
    };
  }

  @Post('webhooks/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle webhooks from messaging providers' })
  @ApiParam({ name: 'provider', description: 'Provider name (sendgrid, twilio, etc.)' })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  async handleWebhook(
    @Param('provider') provider: string,
    @Body() webhookData: any,
  ) {
    // TODO: Implement webhook handling for different providers
    // This would update message statuses based on provider callbacks

    return {
      status: 'processed',
      provider,
      timestamp: new Date(),
    };
  }

  private getProviderForChannel(channel: string): string {
    switch (channel) {
      case 'email':
        return 'sendgrid';
      case 'whatsapp':
        return '360dialog';
      case 'sms':
        return 'twilio';
      default:
        return 'unknown';
    }
  }
}