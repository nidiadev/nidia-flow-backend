import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CreateMessageTemplateDto, UpdateMessageTemplateDto } from '../../dto/communications/message-template.dto';
import { MessageTemplate } from '../../../../generated/tenant-prisma';

@Injectable()
export class MessageTemplateService {
  constructor(private readonly prisma: TenantPrismaService) {}

  async create(createMessageTemplateDto: CreateMessageTemplateDto, userId: string): Promise<MessageTemplate> {
    const {
      name,
      channel,
      type,
      subject,
      body,
      whatsappTemplateName,
      whatsappLanguage
    } = createMessageTemplateDto;

    // Validate template variables
    this.validateTemplateVariables(body);
    if (subject) {
      this.validateTemplateVariables(subject);
    }

    const client = await this.prisma.getTenantClient();
    const messageTemplate = await client.messageTemplate.create({
      data: {
        name,
        channel,
        type,
        subject,
        body,
        whatsappTemplateName,
        whatsappLanguage: whatsappLanguage || 'es',
        createdBy: userId,
      },
    });

    return messageTemplate;
  }

  async findAll(channel?: string, type?: string, includeInactive = false) {
    const where: any = {};
    
    if (channel) where.channel = channel;
    if (type) where.type = type;
    if (!includeInactive) where.isActive = true;

    const client = await this.prisma.getTenantClient();
    const templates = await client.messageTemplate.findMany({
      where,
      orderBy: [
        { channel: 'asc' },
        { type: 'asc' },
        { name: 'asc' },
      ],
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
    });

    return templates;
  }

  async findOne(id: string): Promise<MessageTemplate> {
    const client = await this.prisma.getTenantClient();
    const template = await client.messageTemplate.findUnique({
      where: { id },
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
    });

    if (!template) {
      throw new NotFoundException(`Message template with ID ${id} not found`);
    }

    return template;
  } 
 async update(id: string, updateMessageTemplateDto: UpdateMessageTemplateDto): Promise<MessageTemplate> {
    await this.findOne(id); // Ensure it exists

    // Validate template variables if body or subject is being updated
    if (updateMessageTemplateDto.body) {
      this.validateTemplateVariables(updateMessageTemplateDto.body);
    }
    if (updateMessageTemplateDto.subject) {
      this.validateTemplateVariables(updateMessageTemplateDto.subject);
    }

    const client = await this.prisma.getTenantClient();
    const updatedTemplate = await client.messageTemplate.update({
      where: { id },
      data: updateMessageTemplateDto,
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
    });

    return updatedTemplate;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id); // Ensure it exists

    const client = await this.prisma.getTenantClient();
    await client.messageTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async renderTemplate(templateId: string, variables: Record<string, any>): Promise<{ subject?: string; body: string }> {
    const template = await this.findOne(templateId);

    if (!template.isActive) {
      throw new BadRequestException('Template is not active');
    }

    const renderedBody = this.replaceVariables(template.body, variables);
    const renderedSubject = template.subject ? this.replaceVariables(template.subject, variables) : undefined;

    return {
      subject: renderedSubject,
      body: renderedBody,
    };
  }

  async getTemplatesByType(type: string, channel?: string) {
    const where: any = { type, isActive: true };
    if (channel) where.channel = channel;

    const client = await this.prisma.getTenantClient();
    return client.messageTemplate.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async duplicateTemplate(id: string, newName: string, userId: string): Promise<MessageTemplate> {
    const originalTemplate = await this.findOne(id);

    const client = await this.prisma.getTenantClient();
    const duplicatedTemplate = await client.messageTemplate.create({
      data: {
        name: newName,
        channel: originalTemplate.channel,
        type: originalTemplate.type,
        subject: originalTemplate.subject,
        body: originalTemplate.body,
        whatsappTemplateName: originalTemplate.whatsappTemplateName,
        whatsappLanguage: originalTemplate.whatsappLanguage,
        createdBy: userId,
      },
    });

    return duplicatedTemplate;
  }

  private validateTemplateVariables(content: string): void {
    // Check for valid variable syntax {{variableName}}
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const matches = content.match(variableRegex);

    if (matches) {
      for (const match of matches) {
        const variableName = match.slice(2, -2).trim();
        
        // Validate variable name (alphanumeric and underscore only)
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variableName)) {
          throw new BadRequestException(`Invalid variable name: ${variableName}. Use only letters, numbers, and underscores.`);
        }
      }
    }
  }

  private replaceVariables(content: string, variables: Record<string, any>): string {
    return content.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
      const trimmedName = variableName.trim();
      const value = variables[trimmedName];
      
      if (value === undefined || value === null) {
        return `[${trimmedName}]`; // Show missing variables clearly
      }
      
      return String(value);
    });
  }

  async getAvailableVariables(): Promise<Record<string, string[]>> {
    return {
      customer: [
        'firstName',
        'lastName',
        'fullName',
        'email',
        'phone',
        'companyName',
        'address',
        'city',
      ],
      order: [
        'orderNumber',
        'total',
        'status',
        'scheduledDate',
        'serviceAddress',
        'customerNotes',
      ],
      task: [
        'title',
        'description',
        'status',
        'scheduledStart',
        'locationAddress',
        'assignedToName',
      ],
      company: [
        'companyName',
        'phone',
        'email',
        'address',
        'website',
      ],
      system: [
        'currentDate',
        'currentTime',
        'currentDateTime',
      ],
    };
  }
}