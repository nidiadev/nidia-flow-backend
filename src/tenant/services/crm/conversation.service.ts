import { Injectable, Logger, BadRequestException, NotFoundException, Scope } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { DataScopeService } from '../data-scope.service';
import { BusinessEventEmitterService } from '../../../common/events/event-emitter.service';
import { BusinessEventTypes } from '../../../common/events/business-events';
import {
  CreateConversationDto,
  UpdateConversationDto,
  ConversationFilterDto,
  ConversationResponseDto,
  ConversationSummaryDto,
  SendMessageDto,
  AddConversationNoteDto,
  MessageResponseDto,
  ConversationStatus,
  ConversationPriority,
  MessageDirection,
  MessageType,
  MessageStatus,
} from '../../dto/crm/conversation.dto';

/**
 * ConversationService - Gestión de Bandeja Unificada
 * 
 * CONTEXTO: TENANT
 * Gestiona conversaciones unificadas de WhatsApp, Email y SMS
 */
@Injectable({ scope: Scope.REQUEST })
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly dataScope: DataScopeService,
    private readonly eventEmitter: BusinessEventEmitterService,
  ) {}

  /**
   * Create a new conversation
   */
  async create(createDto: CreateConversationDto, userId: string): Promise<ConversationResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      // Validate customer if provided
      if (createDto.customerId) {
        const customer = await prisma.customer.findUnique({
          where: { id: createDto.customerId },
        });
        if (!customer) {
          throw new BadRequestException(`Customer with ID ${createDto.customerId} not found`);
        }
      }

      // Validate contact if provided
      if (createDto.contactId) {
        const contact = await prisma.customerContact.findUnique({
          where: { id: createDto.contactId },
        });
        if (!contact) {
          throw new BadRequestException(`Contact with ID ${createDto.contactId} not found`);
        }
      }

      // Check if conversation already exists for this channel/recipient
      const existing = await prisma.conversation.findFirst({
        where: {
          channel: createDto.channel,
          recipient: createDto.recipient,
          status: { not: ConversationStatus.ARCHIVED },
        },
      });

      if (existing) {
        this.logger.log(`Conversation already exists: ${existing.id}`);
        return await this.findById(existing.id);
      }

      const conversation = await prisma.conversation.create({
        data: {
          customerId: createDto.customerId,
          contactId: createDto.contactId,
          channel: createDto.channel,
          channelId: createDto.channelId,
          recipient: createDto.recipient,
          recipientName: createDto.recipientName,
          status: createDto.status || ConversationStatus.OPEN,
          priority: createDto.priority || ConversationPriority.NORMAL,
          slaMinutes: createDto.slaMinutes,
          tags: createDto.tags || [],
          firstMessageAt: new Date(),
          lastMessageAt: new Date(),
          createdBy: userId,
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              email: true,
              phone: true,
            },
          },
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              position: true,
            },
          },
          assignedToUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Emit event
      await this.eventEmitter.emit(BusinessEventTypes.CONVERSATION_CREATED, {
        conversationId: conversation.id,
        channel: conversation.channel,
        customerId: conversation.customerId,
        createdBy: userId,
        timestamp: new Date(),
      });

      this.logger.log(`Conversation created: ${conversation.id} by user: ${userId}`);
      return await this.findById(conversation.id);
    } catch (error: any) {
      this.logger.error(`Failed to create conversation: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find conversations with filtering and pagination
   */
  async findMany(
    filterDto: ConversationFilterDto,
    userId: string,
    userPermissions: string[],
  ): Promise<{ data: ConversationSummaryDto[]; pagination: any }> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      const page = filterDto.page || 1;
      const limit = filterDto.limit || 20;
      const skip = (page - 1) * limit;

      // Build where clause
      const userFilters = this.buildWhereClause(filterDto);

      // Apply data scope
      const scopeFilter = this.dataScope.getConversationScope(userPermissions, userId, userFilters);

      const orderBy = this.buildOrderByClause(filterDto);

      // Execute queries
      const [conversations, total] = await Promise.all([
        prisma.conversation.findMany({
          where: scopeFilter as any,
          orderBy,
          skip,
          take: limit,
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                companyName: true,
                email: true,
                phone: true,
              },
            },
            assignedToUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                body: true,
                direction: true,
                createdAt: true,
              },
            },
            _count: {
              select: {
                messages: true,
              },
            },
          },
        }),
        prisma.conversation.count({ where: scopeFilter as any }),
      ]);

      return {
        data: conversations.map(conv => this.mapToSummaryDto(conv)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to find conversations: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find conversation by ID
   */
  async findById(id: string): Promise<ConversationResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      const conversation = await prisma.conversation.findUnique({
        where: { id },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              email: true,
              phone: true,
            },
          },
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              position: true,
            },
          },
          assignedToUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          createdByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'asc' },
            include: {
              messageLog: {
                select: {
                  id: true,
                  status: true,
                },
              },
            },
          },
          notes: {
            orderBy: { createdAt: 'desc' },
            include: {
              createdByUser: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!conversation) {
        throw new NotFoundException(`Conversation with ID ${id} not found`);
      }

      return this.mapToResponseDto(conversation);
    } catch (error: any) {
      this.logger.error(`Failed to find conversation: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update conversation
   */
  async update(
    id: string,
    updateDto: UpdateConversationDto,
    userId: string,
  ): Promise<ConversationResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      const existing = await prisma.conversation.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException(`Conversation with ID ${id} not found`);
      }

      const updateData: any = {};

      if (updateDto.status !== undefined) {
        updateData.status = updateDto.status;
        if (updateDto.status === ConversationStatus.RESOLVED && !existing.resolvedAt) {
          updateData.resolvedAt = new Date();
        } else if (updateDto.status !== ConversationStatus.RESOLVED) {
          updateData.resolvedAt = null;
        }
        if (updateDto.status === ConversationStatus.ARCHIVED && !existing.archivedAt) {
          updateData.archivedAt = new Date();
        } else if (updateDto.status !== ConversationStatus.ARCHIVED) {
          updateData.archivedAt = null;
        }
      }

      if (updateDto.assignedTo !== undefined) {
        updateData.assignedTo = updateDto.assignedTo;
      }

      if (updateDto.priority !== undefined) {
        updateData.priority = updateDto.priority;
      }

      if (updateDto.tags !== undefined) {
        updateData.tags = updateDto.tags;
      }

      if (updateDto.slaMinutes !== undefined) {
        updateData.slaMinutes = updateDto.slaMinutes;
      }

      await prisma.conversation.update({
        where: { id },
        data: updateData,
      });

      this.logger.log(`Conversation updated: ${id} by user: ${userId}`);
      return await this.findById(id);
    } catch (error: any) {
      this.logger.error(`Failed to update conversation: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(
    conversationId: string,
    sendDto: SendMessageDto,
    userId: string,
  ): Promise<MessageResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) {
        throw new NotFoundException(`Conversation with ID ${conversationId} not found`);
      }

      // Create message
      const message = await prisma.message.create({
        data: {
          conversationId,
          direction: MessageDirection.OUTBOUND,
          channel: conversation.channel,
          type: sendDto.type || MessageType.TEXT,
          subject: sendDto.subject,
          body: sendDto.body,
          bodyHtml: sendDto.bodyHtml,
          attachments: sendDto.attachments || [],
          status: MessageStatus.SENT,
          sentAt: new Date(),
        },
      });

      // Update conversation
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastResponseAt: new Date(),
          lastMessageAt: new Date(),
          // Update first response time if this is the first response
          firstResponseAt: conversation.firstResponseAt || new Date(),
        },
      });

      // TODO: Integrate with actual messaging providers (WhatsApp, SendGrid)
      // For now, we'll just mark as sent
      // await this.sendViaProvider(conversation, message);

      // Emit event
      await this.eventEmitter.emit(BusinessEventTypes.MESSAGE_SENT, {
        messageId: message.id,
        conversationId,
        customerId: conversation.customerId,
        channel: conversation.channel,
        content: sendDto.body,
        status: 'sent',
        sentBy: userId,
        timestamp: new Date(),
      });

      this.logger.log(`Message sent in conversation ${conversationId} by user: ${userId}`);
      return this.mapMessageToResponseDto(message);
    } catch (error: any) {
      this.logger.error(`Failed to send message: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Add a note to conversation
   */
  async addNote(
    conversationId: string,
    noteDto: AddConversationNoteDto,
    userId: string,
  ): Promise<ConversationResponseDto> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) {
        throw new NotFoundException(`Conversation with ID ${conversationId} not found`);
      }

      await prisma.conversationNote.create({
        data: {
          conversationId,
          content: noteDto.content,
          isInternal: noteDto.isInternal !== false,
          createdBy: userId,
        },
      });

      this.logger.log(`Note added to conversation ${conversationId} by user: ${userId}`);
      return await this.findById(conversationId);
    } catch (error: any) {
      this.logger.error(`Failed to add note: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get inbox statistics
   */
  async getInboxStats(userId: string, userPermissions: string[]): Promise<any> {
    try {
      const prisma = await this.tenantPrisma.getTenantClient();

      const userFilters = {};
      const scopeFilter = this.dataScope.getConversationScope(userPermissions, userId, userFilters);

      const [
        total,
        open,
        pending,
        resolved,
        byChannel,
        byPriority,
        slaViolated,
      ] = await Promise.all([
        prisma.conversation.count({ where: scopeFilter as any }),
        prisma.conversation.count({
          where: { ...scopeFilter, status: ConversationStatus.OPEN } as any,
        }),
        prisma.conversation.count({
          where: { ...scopeFilter, status: ConversationStatus.PENDING } as any,
        }),
        prisma.conversation.count({
          where: { ...scopeFilter, status: ConversationStatus.RESOLVED } as any,
        }),
        prisma.conversation.groupBy({
          by: ['channel'],
          where: scopeFilter as any,
          _count: true,
        }),
        prisma.conversation.groupBy({
          by: ['priority'],
          where: scopeFilter as any,
          _count: true,
        }),
        prisma.conversation.count({
          where: {
            ...scopeFilter,
            slaMinutes: { not: null },
            firstMessageAt: { not: null },
            firstResponseAt: null,
          } as any,
        }),
      ]);

      return {
        total,
        byStatus: {
          open,
          pending,
          resolved,
        },
        byChannel: byChannel.reduce((acc, item) => {
          acc[item.channel] = item._count;
          return acc;
        }, {} as Record<string, number>),
        byPriority: byPriority.reduce((acc, item) => {
          acc[item.priority] = item._count;
          return acc;
        }, {} as Record<string, number>),
        slaViolated,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get inbox stats: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Build where clause for filtering
   */
  private buildWhereClause(filterDto: ConversationFilterDto): any {
    const where: any = {};

    if (filterDto.customerId) {
      where.customerId = filterDto.customerId;
    }

    if (filterDto.channel) {
      where.channel = filterDto.channel;
    }

    if (filterDto.status) {
      where.status = filterDto.status;
    }

    if (filterDto.assignedTo) {
      where.assignedTo = filterDto.assignedTo;
    }

    if (filterDto.unassignedOnly) {
      where.assignedTo = null;
    }

    if (filterDto.priority) {
      where.priority = filterDto.priority;
    }

    if (filterDto.tags && filterDto.tags.length > 0) {
      where.tags = { hasSome: filterDto.tags };
    }

    if (filterDto.createdAt) {
      where.createdAt = {};
      if (filterDto.createdAt.startDate) {
        where.createdAt.gte = new Date(filterDto.createdAt.startDate);
      }
      if (filterDto.createdAt.endDate) {
        where.createdAt.lte = new Date(filterDto.createdAt.endDate);
      }
    }

    if (filterDto.lastMessageAt) {
      where.lastMessageAt = {};
      if (filterDto.lastMessageAt.startDate) {
        where.lastMessageAt.gte = new Date(filterDto.lastMessageAt.startDate);
      }
      if (filterDto.lastMessageAt.endDate) {
        where.lastMessageAt.lte = new Date(filterDto.lastMessageAt.endDate);
      }
    }

    if (filterDto.search) {
      where.OR = [
        { recipient: { contains: filterDto.search, mode: 'insensitive' } },
        { recipientName: { contains: filterDto.search, mode: 'insensitive' } },
      ];
    }

    // SLA violation filter - handled in service layer after query
    // We'll filter results after fetching

    if (filterDto.search) {
      where.OR = [
        { recipient: { contains: filterDto.search, mode: 'insensitive' } },
        { recipientName: { contains: filterDto.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  /**
   * Build order by clause
   */
  private buildOrderByClause(filterDto: ConversationFilterDto): any {
    const sortBy = filterDto.sortBy || 'lastMessageAt';
    const sortOrder = filterDto.sortOrder || 'desc';
    return { [sortBy]: sortOrder };
  }

  /**
   * Map Prisma model to response DTO
   */
  private mapToResponseDto(conversation: any): ConversationResponseDto {
    // Calculate SLA status
    const slaStatus = this.calculateSlaStatus(conversation);

    // Count unread messages (inbound messages not read)
    const unreadCount = conversation.messages?.filter(
      (m: any) => m.direction === MessageDirection.INBOUND && m.status !== MessageStatus.READ,
    ).length || 0;

    return {
      id: conversation.id,
      customerId: conversation.customerId,
      customer: conversation.customer
        ? {
            id: conversation.customer.id,
            firstName: conversation.customer.firstName,
            lastName: conversation.customer.lastName,
            companyName: conversation.customer.companyName,
            email: conversation.customer.email,
            phone: conversation.customer.phone,
          }
        : undefined,
      contactId: conversation.contactId,
      contact: conversation.contact
        ? {
            id: conversation.contact.id,
            firstName: conversation.contact.firstName,
            lastName: conversation.contact.lastName,
            email: conversation.contact.email,
            phone: conversation.contact.phone,
            position: conversation.contact.position,
          }
        : undefined,
      channel: conversation.channel,
      channelId: conversation.channelId,
      recipient: conversation.recipient,
      recipientName: conversation.recipientName,
      status: conversation.status as ConversationStatus,
      assignedTo: conversation.assignedTo,
      assignedToUser: conversation.assignedToUser
        ? {
            id: conversation.assignedToUser.id,
            firstName: conversation.assignedToUser.firstName,
            lastName: conversation.assignedToUser.lastName,
            email: conversation.assignedToUser.email,
          }
        : undefined,
      priority: conversation.priority as ConversationPriority,
      slaMinutes: conversation.slaMinutes,
      firstMessageAt: conversation.firstMessageAt?.toISOString(),
      firstResponseAt: conversation.firstResponseAt?.toISOString(),
      lastMessageAt: conversation.lastMessageAt?.toISOString(),
      lastResponseAt: conversation.lastResponseAt?.toISOString(),
      resolvedAt: conversation.resolvedAt?.toISOString(),
      archivedAt: conversation.archivedAt?.toISOString(),
      tags: conversation.tags || [],
      messages: (conversation.messages || []).map((m: any) => this.mapMessageToResponseDto(m)),
      notes: (conversation.notes || []).map((n: any) => ({
        id: n.id,
        content: n.content,
        isInternal: n.isInternal,
        createdBy: n.createdBy,
        createdByUser: n.createdByUser
          ? {
              id: n.createdByUser.id,
              firstName: n.createdByUser.firstName,
              lastName: n.createdByUser.lastName,
              email: n.createdByUser.email,
            }
          : undefined,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
      slaStatus,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }

  /**
   * Map Prisma model to summary DTO
   */
  private mapToSummaryDto(conversation: any): ConversationSummaryDto {
    const customerName =
      conversation.customer?.companyName ||
      `${conversation.customer?.firstName || ''} ${conversation.customer?.lastName || ''}`.trim() ||
      conversation.customer?.email ||
      conversation.recipientName ||
      conversation.recipient ||
      'Sin nombre';

    const lastMessage = conversation.messages?.[0];
    const slaStatus = this.calculateSlaStatus(conversation);

    // Count unread (simplified - would need proper query)
    const unreadCount = 0; // TODO: Calculate properly

    return {
      id: conversation.id,
      customerId: conversation.customerId,
      customerName,
      channel: conversation.channel,
      recipient: conversation.recipient,
      recipientName: conversation.recipientName,
      status: conversation.status as ConversationStatus,
      assignedToName: conversation.assignedToUser
        ? `${conversation.assignedToUser.firstName || ''} ${conversation.assignedToUser.lastName || ''}`.trim()
        : undefined,
      priority: conversation.priority as ConversationPriority,
      lastMessagePreview: lastMessage?.body?.substring(0, 100),
      lastMessageAt: conversation.lastMessageAt?.toISOString(),
      unreadCount,
      slaStatus: {
        isViolated: slaStatus.isViolated,
        minutesRemaining: slaStatus.minutesRemaining,
      },
      tags: conversation.tags || [],
      createdAt: conversation.createdAt.toISOString(),
    };
  }

  /**
   * Map message to response DTO
   */
  private mapMessageToResponseDto(message: any): MessageResponseDto {
    return {
      id: message.id,
      conversationId: message.conversationId,
      direction: message.direction as MessageDirection,
      channel: message.channel,
      type: message.type as MessageType,
      subject: message.subject,
      body: message.body,
      bodyHtml: message.bodyHtml,
      attachments: (message.attachments as any[]) || [],
      status: message.status as MessageStatus,
      providerMessageId: message.providerMessageId,
      sentAt: message.sentAt?.toISOString(),
      deliveredAt: message.deliveredAt?.toISOString(),
      readAt: message.readAt?.toISOString(),
      failedAt: message.failedAt?.toISOString(),
      errorMessage: message.errorMessage,
      createdAt: message.createdAt.toISOString(),
    };
  }

  /**
   * Calculate SLA status
   */
  private calculateSlaStatus(conversation: any): {
    isViolated: boolean;
    minutesRemaining?: number;
    minutesOverdue?: number;
  } {
    if (!conversation.slaMinutes || !conversation.firstMessageAt) {
      return { isViolated: false };
    }

    const now = new Date();
    const firstMessageAt = new Date(conversation.firstMessageAt);
    const elapsedMinutes = Math.floor((now.getTime() - firstMessageAt.getTime()) / (1000 * 60));

    if (conversation.firstResponseAt) {
      // Already responded
      const responseAt = new Date(conversation.firstResponseAt);
      const responseMinutes = Math.floor((responseAt.getTime() - firstMessageAt.getTime()) / (1000 * 60));
      return {
        isViolated: responseMinutes > conversation.slaMinutes,
        minutesOverdue: responseMinutes > conversation.slaMinutes ? responseMinutes - conversation.slaMinutes : undefined,
      };
    } else {
      // Not yet responded
      const remaining = conversation.slaMinutes - elapsedMinutes;
      return {
        isViolated: remaining < 0,
        minutesRemaining: remaining >= 0 ? remaining : undefined,
        minutesOverdue: remaining < 0 ? Math.abs(remaining) : undefined,
      };
    }
  }
}

