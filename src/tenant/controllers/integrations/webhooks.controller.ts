import {
  Controller,
  Post,
  Body,
  Headers,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiHeader,
  ApiExcludeController,
} from '@nestjs/swagger';
import { ConversationService } from '../../services/crm/conversation.service';
import { WhatsAppService } from '../../services/integrations/whatsapp.service';
import { SendGridService } from '../../services/integrations/sendgrid.service';
import { TenantPrismaService } from '../../services/tenant-prisma.service';
import { BusinessEventEmitterService } from '../../../common/events/event-emitter.service';
import { BusinessEventTypes } from '../../../common/events/business-events';
import { MessageDirection, MessageType, MessageStatus } from '../../dto/crm/conversation.dto';

/**
 * WebhooksController - Maneja webhooks de proveedores externos
 * 
 * CONTEXTO: TENANT
 * Recibe webhooks de WhatsApp, SendGrid, etc. y crea/actualiza conversaciones
 * 
 * NOTA: Este controlador NO requiere autenticación JWT ya que recibe
 * webhooks de servicios externos. Debe usar verificación de firma/secret.
 */
@ApiTags('Integrations - Webhooks')
@ApiExcludeController() // Exclude from Swagger by default (can be enabled for testing)
@Controller('integrations/webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly conversationService: ConversationService,
    private readonly whatsappService: WhatsAppService,
    private readonly sendgridService: SendGridService,
    private readonly tenantPrisma: TenantPrismaService,
    private readonly eventEmitter: BusinessEventEmitterService,
  ) {}

  @Post('whatsapp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'WhatsApp webhook',
    description: 'Receives webhooks from WhatsApp Business API (360Dialog/Twilio)'
  })
  @ApiQuery({ name: 'tenant', required: false, description: 'Tenant identifier' })
  @ApiHeader({ name: 'X-Hub-Signature-256', required: false, description: 'Webhook signature for verification' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed successfully',
  })
  async handleWhatsAppWebhook(
    @Body() payload: any,
    @Query('tenant') tenantId?: string,
    @Headers('x-hub-signature-256') signature?: string,
  ): Promise<{ status: string }> {
    try {
      this.logger.log('Received WhatsApp webhook');

      // TODO: Verify webhook signature
      // if (!this.verifyWhatsAppSignature(payload, signature)) {
      //   throw new UnauthorizedException('Invalid webhook signature');
      // }

      // Parse webhook payload
      const messageData = await this.whatsappService.handleWebhook(payload);

      if (!messageData) {
        this.logger.warn('Could not parse WhatsApp webhook payload');
        return { status: 'ignored' };
      }

      // Find or create conversation
      const prisma = await this.tenantPrisma.getTenantClient();
      let conversation = await prisma.conversation.findFirst({
        where: {
          channel: 'whatsapp',
          recipient: messageData.from,
          status: { not: 'archived' },
        },
      });

      if (!conversation) {
        // Create new conversation
        conversation = await prisma.conversation.create({
          data: {
            channel: 'whatsapp',
            recipient: messageData.from,
            status: 'open',
            priority: 'normal',
            firstMessageAt: messageData.timestamp,
            lastMessageAt: messageData.timestamp,
            createdBy: 'system', // TODO: Get system user ID
          },
        });
      }

      // Create message
      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: MessageDirection.INBOUND,
          channel: 'whatsapp',
          type: messageData.type as MessageType,
          body: messageData.body,
          status: MessageStatus.DELIVERED,
          providerMessageId: messageData.messageId,
          sentAt: messageData.timestamp,
          deliveredAt: messageData.timestamp,
          attachments: messageData.mediaUrl
            ? [
                {
                  url: messageData.mediaUrl,
                  filename: messageData.mediaUrl.split('/').pop() || 'media',
                },
              ]
            : [],
        },
      });

      // Update conversation
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: messageData.timestamp,
          // Update first message time if this is the first
          firstMessageAt: conversation.firstMessageAt || messageData.timestamp,
        },
      });

      // Emit event
      await this.eventEmitter.emit(BusinessEventTypes.MESSAGE_RECEIVED, {
        messageId: message.id,
        conversationId: conversation.id,
        customerId: conversation.customerId,
        channel: 'whatsapp',
        content: messageData.body,
        fromNumber: messageData.from,
        timestamp: messageData.timestamp,
      });

      this.logger.log(`WhatsApp message processed: ${message.id}`);
      return { status: 'processed' };
    } catch (error: any) {
      this.logger.error(`Failed to process WhatsApp webhook: ${error.message}`, error.stack);
      return { status: 'error' };
    }
  }

  @Post('sendgrid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'SendGrid webhook',
    description: 'Receives webhooks from SendGrid for email delivery status'
  })
  @ApiQuery({ name: 'tenant', required: false, description: 'Tenant identifier' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed successfully',
  })
  async handleSendGridWebhook(
    @Body() payload: any[],
    @Query('tenant') tenantId?: string,
  ): Promise<{ status: string; processed: number }> {
    try {
      this.logger.log(`Received SendGrid webhook with ${payload.length} events`);

      // Parse webhook events
      const events = await this.sendgridService.handleWebhook(payload);

      // Update message statuses
      const prisma = await this.tenantPrisma.getTenantClient();
      let processed = 0;

      for (const event of events) {
        // Find message by provider message ID
        const message = await prisma.message.findFirst({
          where: {
            providerMessageId: event.messageId,
            channel: 'email',
          },
        });

        if (message) {
          const updateData: any = {};

          if (event.event === 'delivered') {
            updateData.status = MessageStatus.DELIVERED;
            updateData.deliveredAt = event.timestamp;
          } else if (event.event === 'opened') {
            updateData.status = MessageStatus.READ;
            updateData.readAt = event.timestamp;
          } else if (event.event === 'bounced' || event.event === 'dropped') {
            updateData.status = MessageStatus.FAILED;
            updateData.failedAt = event.timestamp;
            updateData.errorMessage = event.reason;
          }

          if (Object.keys(updateData).length > 0) {
            await prisma.message.update({
              where: { id: message.id },
              data: updateData,
            });
            processed++;
          }
        }
      }

      this.logger.log(`Processed ${processed} SendGrid events`);
      return { status: 'processed', processed };
    } catch (error: any) {
      this.logger.error(`Failed to process SendGrid webhook: ${error.message}`, error.stack);
      return { status: 'error', processed: 0 };
    }
  }
}

