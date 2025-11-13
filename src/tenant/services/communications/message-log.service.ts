import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CreateMessageLogDto, MessageLogFilterDto } from '../../dto/communications/message-log.dto';
import { MessageLog, Prisma } from '../../../../generated/tenant-prisma';

@Injectable()
export class MessageLogService {
  constructor(private readonly prisma: TenantPrismaService) {}

  async create(createMessageLogDto: CreateMessageLogDto): Promise<MessageLog> {
    const {
      customerId,
      channel,
      type,
      recipient,
      subject,
      body,
      provider,
      providerMessageId,
      cost,
      metadata
    } = createMessageLogDto;

    const client = await this.prisma.getTenantClient();
    const messageLog = await client.messageLog.create({
      data: {
        customerId,
        channel,
        type,
        recipient,
        subject,
        body,
        provider,
        providerMessageId,
        cost: cost || null,
        metadata: metadata || {},
      },
    });

    return messageLog;
  }

  async findAll(filters: MessageLogFilterDto = {}) {
    const {
      customerId,
      channel,
      status,
      provider,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;

    const where: Prisma.MessageLogWhereInput = {};

    if (customerId) where.customerId = customerId;
    if (channel) where.channel = channel;
    if (status) where.status = status;
    if (provider) where.provider = provider;
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const skip = (page - 1) * limit;
    const client = await this.prisma.getTenantClient();

    const [messageLogs, total] = await Promise.all([
      client.messageLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
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
        },
      }),
      client.messageLog.count({ where }),
    ]);

    return {
      data: messageLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<MessageLog> {
    const client = await this.prisma.getTenantClient();
    const messageLog = await client.messageLog.findUnique({
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
      },
    });

    if (!messageLog) {
      throw new NotFoundException(`Message log with ID ${id} not found`);
    }

    return messageLog;
  }

  async updateStatus(id: string, status: string, metadata?: Record<string, any>): Promise<MessageLog> {
    const messageLog = await this.findOne(id);
    const client = await this.prisma.getTenantClient();

    const updateData: any = { status };

    // Set timestamps based on status
    switch (status) {
      case 'sent':
        updateData.sentAt = new Date();
        break;
      case 'delivered':
        updateData.deliveredAt = new Date();
        break;
      case 'read':
        updateData.readAt = new Date();
        break;
      case 'failed':
        updateData.failedAt = new Date();
        break;
    }

    // Merge metadata if provided
    if (metadata) {
      updateData.metadata = {
        ...(typeof messageLog.metadata === 'object' && messageLog.metadata !== null ? messageLog.metadata : {}),
        ...metadata,
      };
    }

    const updatedMessageLog = await client.messageLog.update({
      where: { id },
      data: updateData,
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
      },
    });

    return updatedMessageLog;
  }

  async updateError(id: string, errorMessage: string): Promise<MessageLog> {
    return this.updateStatus(id, 'failed', { errorMessage });
  }

  async getMessageStats(dateFrom?: string, dateTo?: string) {
    const where: Prisma.MessageLogWhereInput = {};
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const client = await this.prisma.getTenantClient();
    const [totalMessages, statusBreakdown, channelBreakdown, providerBreakdown] = await Promise.all([
      client.messageLog.count({ where }),
      client.messageLog.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      client.messageLog.groupBy({
        by: ['channel'],
        where,
        _count: true,
      }),
      client.messageLog.groupBy({
        by: ['provider'],
        where,
        _count: true,
      }),
    ]);

    // Calculate costs
    const costStats = await client.messageLog.aggregate({
      where: { ...where, cost: { not: null } },
      _sum: { cost: true },
      _avg: { cost: true },
      _count: true,
    });

    return {
      totalMessages,
      statusBreakdown: statusBreakdown.map(item => ({
        status: item.status,
        count: item._count,
      })),
      channelBreakdown: channelBreakdown.map(item => ({
        channel: item.channel,
        count: item._count,
      })),
      providerBreakdown: providerBreakdown.map(item => ({
        provider: item.provider,
        count: item._count,
      })),
      costs: {
        totalCost: costStats._sum.cost || 0,
        averageCost: costStats._avg.cost || 0,
        messagesWithCost: costStats._count,
      },
    };
  }

  async getCustomerMessageHistory(customerId: string, limit = 50) {
    const client = await this.prisma.getTenantClient();
    const messages = await client.messageLog.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
          },
        },
      },
    });

    return messages;
  }

  async getDeliveryRate(channel?: string, dateFrom?: string, dateTo?: string) {
    const where: Prisma.MessageLogWhereInput = {};
    
    if (channel) where.channel = channel;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const client = await this.prisma.getTenantClient();
    const [total, delivered, failed] = await Promise.all([
      client.messageLog.count({ where }),
      client.messageLog.count({ 
        where: { ...where, status: { in: ['delivered', 'read'] } }
      }),
      client.messageLog.count({ 
        where: { ...where, status: 'failed' }
      }),
    ]);

    const deliveryRate = total > 0 ? (delivered / total) * 100 : 0;
    const failureRate = total > 0 ? (failed / total) * 100 : 0;

    return {
      total,
      delivered,
      failed,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100,
      channel: channel || 'all',
    };
  }

  async findByProviderMessageId(providerMessageId: string): Promise<MessageLog | null> {
    const client = await this.prisma.getTenantClient();
    return client.messageLog.findFirst({
      where: { providerMessageId },
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
      },
    });
  }

  async markAsRead(id: string): Promise<MessageLog> {
    return this.updateStatus(id, 'read');
  }

  async getFailedMessages(limit = 100) {
    const client = await this.prisma.getTenantClient();
    return client.messageLog.findMany({
      where: { status: 'failed' },
      orderBy: { createdAt: 'desc' },
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
      },
    });
  }
}