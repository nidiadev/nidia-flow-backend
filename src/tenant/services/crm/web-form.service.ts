import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Scope,
} from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { BusinessEventEmitterService } from '../../../common/events/event-emitter.service';
import { BusinessEventTypes } from '../../../common/events/business-events';
import { CustomerService } from './customer.service';
import {
  CreateWebFormDto,
  UpdateWebFormDto,
  WebFormFilterDto,
  WebFormResponseDto,
  WebFormSubmissionResponseDto,
  SubmitWebFormDto,
} from '../../dto/crm/web-form.dto';
import { Prisma } from '../../../../generated/tenant-prisma';

/**
 * WebFormService
 * 
 * Service for managing web forms and submissions
 */
@Injectable({ scope: Scope.REQUEST })
export class WebFormService {
  private readonly logger = new Logger(WebFormService.name);

  constructor(
    private readonly prisma: TenantPrismaService,
    private readonly eventEmitter: BusinessEventEmitterService,
    private readonly customerService: CustomerService,
  ) {}

  /**
   * Create a new web form
   */
  async create(createDto: CreateWebFormDto, userId: string): Promise<WebFormResponseDto> {
    const client = await this.prisma.getTenantClient();

    // Validate fields
    this.validateFields(createDto.fields);

    // Generate embed code and URL
    const formId = `form_${Date.now()}`;
    const embedCode = this.generateEmbedCode(formId);
    const embedUrl = this.generateEmbedUrl(formId);

    const form = await client.webForm.create({
      data: {
        name: createDto.name,
        description: createDto.description,
        isActive: createDto.isActive ?? true,
        fields: createDto.fields as any,
        settings: (createDto.settings || {}) as any,
        styles: (createDto.styles || {}) as any,
        recaptchaEnabled: createDto.recaptchaEnabled ?? false,
        recaptchaSiteKey: createDto.recaptchaSiteKey,
        embedCode,
        embedUrl,
        createdBy: userId,
      },
    });

    this.logger.log(`Web form created: ${form.id}`);
    return this.mapToResponseDto(form);
  }

  /**
   * Find all web forms
   */
  async findMany(
    filters: WebFormFilterDto,
  ): Promise<{ data: WebFormResponseDto[]; pagination: any }> {
    const client = await this.prisma.getTenantClient();
    const where = this.buildWhereClause(filters);

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [forms, total] = await Promise.all([
      client.webForm.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      client.webForm.count({ where }),
    ]);

    return {
      data: forms.map((form) => this.mapToResponseDto(form)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find web form by ID
   */
  async findById(id: string): Promise<WebFormResponseDto> {
    const client = await this.prisma.getTenantClient();
    const form = await client.webForm.findUnique({
      where: { id },
    });

    if (!form) {
      throw new NotFoundException(`Web form with ID ${id} not found`);
    }

    return this.mapToResponseDto(form);
  }

  /**
   * Find web form by embed ID (public)
   */
  async findByEmbedId(embedId: string): Promise<WebFormResponseDto> {
    const client = await this.prisma.getTenantClient();
    // Extract form ID from embed URL
    const form = await client.webForm.findFirst({
      where: {
        embedUrl: { contains: embedId },
        isActive: true,
      },
    });

    if (!form) {
      throw new NotFoundException(`Web form not found or inactive`);
    }

    // Increment view count
    await client.webForm.update({
      where: { id: form.id },
      data: { viewCount: { increment: 1 } },
    });

    return this.mapToResponseDto(form);
  }

  /**
   * Update web form
   */
  async update(
    id: string,
    updateDto: UpdateWebFormDto,
  ): Promise<WebFormResponseDto> {
    const client = await this.prisma.getTenantClient();

    const existing = await client.webForm.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Web form with ID ${id} not found`);
    }

    // Validate fields if provided
    if (updateDto.fields) {
      this.validateFields(updateDto.fields);
    }

    const form = await client.webForm.update({
      where: { id },
      data: {
        name: updateDto.name,
        description: updateDto.description,
        isActive: updateDto.isActive,
        fields: updateDto.fields as any,
        settings: updateDto.settings as any,
        styles: updateDto.styles as any,
        recaptchaEnabled: updateDto.recaptchaEnabled,
        recaptchaSiteKey: updateDto.recaptchaSiteKey,
      },
    });

    this.logger.log(`Web form updated: ${id}`);
    return this.mapToResponseDto(form);
  }

  /**
   * Delete web form
   */
  async delete(id: string): Promise<void> {
    const client = await this.prisma.getTenantClient();

    const form = await client.webForm.findUnique({ where: { id } });
    if (!form) {
      throw new NotFoundException(`Web form with ID ${id} not found`);
    }

    await client.webForm.delete({ where: { id } });
    this.logger.log(`Web form deleted: ${id}`);
  }

  /**
   * Submit web form (public endpoint)
   */
  async submitForm(
    formId: string,
    submitDto: SubmitWebFormDto,
    requestInfo?: { ipAddress?: string; userAgent?: string; sourceUrl?: string },
  ): Promise<WebFormSubmissionResponseDto> {
    const client = await this.prisma.getTenantClient();

    const form = await client.webForm.findUnique({ where: { id: formId } });
    if (!form) {
      throw new NotFoundException(`Web form with ID ${formId} not found`);
    }

    if (!form.isActive) {
      throw new BadRequestException('Form is not active');
    }

    // Validate reCAPTCHA if enabled
    if (form.recaptchaEnabled && !submitDto.recaptchaToken) {
      throw new BadRequestException('reCAPTCHA token is required');
    }

    if (form.recaptchaEnabled && submitDto.recaptchaToken) {
      // TODO: Verify reCAPTCHA token with Google
      // For now, we'll just check that token exists
    }

    // Validate form data against fields
    this.validateSubmissionData(submitDto.data, form.fields as any[]);

    // Create submission
    const submission = await client.webFormSubmission.create({
      data: {
        formId,
        data: submitDto.data as any,
        sourceUrl: requestInfo?.sourceUrl,
        userAgent: requestInfo?.userAgent,
        ipAddress: requestInfo?.ipAddress,
      },
    });

    // Increment submission count
    await client.webForm.update({
      where: { id: formId },
      data: { submissionCount: { increment: 1 } },
    });

    // Auto-create customer if enabled
    let customerId: string | undefined;
    const settings = form.settings as any;
    if (settings?.autoCreateCustomer !== false) {
      try {
        const customer = await this.customerService.create(
          {
            firstName: submitDto.data.firstName || submitDto.data.name || 'Lead',
            lastName: submitDto.data.lastName || '',
            email: submitDto.data.email,
            phone: submitDto.data.phone,
            companyName: submitDto.data.companyName || submitDto.data.company,
            leadSource: settings?.defaultLeadSource || 'web_form',
            type: 'LEAD',
            assignedTo: settings?.assignTo,
          },
          'system', // Created by system
        );
        customerId = customer.id;

        // Link submission to customer
        await client.webFormSubmission.update({
          where: { id: submission.id },
          data: { customerId: customer.id },
        });

        // Emit event
        await this.eventEmitter.emit(BusinessEventTypes.CUSTOMER_CREATED, {
          customerId: customer.id,
          customerType: 'LEAD',
          leadSource: 'web_form',
          formId: form.id,
          submissionId: submission.id,
          timestamp: new Date(),
        });
      } catch (error: any) {
        this.logger.error(`Failed to create customer from form submission: ${error.message}`);
        // Continue without customer creation
      }
    }

    this.logger.log(`Web form submitted: ${formId}, submission: ${submission.id}`);
    return this.mapSubmissionToResponseDto(submission);
  }

  /**
   * Get form submissions
   */
  async getSubmissions(
    formId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: WebFormSubmissionResponseDto[]; pagination: any }> {
    const client = await this.prisma.getTenantClient();

    const form = await client.webForm.findUnique({ where: { id: formId } });
    if (!form) {
      throw new NotFoundException(`Web form with ID ${formId} not found`);
    }

    const skip = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      client.webFormSubmission.findMany({
        where: { formId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      client.webFormSubmission.count({ where: { formId } }),
    ]);

    return {
      data: submissions.map((sub) => this.mapSubmissionToResponseDto(sub)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Validate form fields
   */
  private validateFields(fields: any[]): void {
    if (fields.length === 0) {
      throw new BadRequestException('Form must have at least one field');
    }

    const fieldIds = new Set<string>();
    for (const field of fields) {
      if (!field.id) {
        throw new BadRequestException('All fields must have an id');
      }
      if (fieldIds.has(field.id)) {
        throw new BadRequestException(`Duplicate field id: ${field.id}`);
      }
      fieldIds.add(field.id);

      if (!field.type) {
        throw new BadRequestException(`Field ${field.id} must have a type`);
      }
      if (!field.label) {
        throw new BadRequestException(`Field ${field.id} must have a label`);
      }
    }
  }

  /**
   * Validate submission data
   */
  private validateSubmissionData(data: Record<string, any>, fields: any[]): void {
    for (const field of fields) {
      const value = data[field.name || field.id];

      if (field.required && (!value || value === '')) {
        throw new BadRequestException(`Field ${field.label} is required`);
      }

      // Type-specific validation
      if (value) {
        if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          throw new BadRequestException(`Field ${field.label} must be a valid email`);
        }
        if (field.type === 'url' && !/^https?:\/\/.+/.test(value)) {
          throw new BadRequestException(`Field ${field.label} must be a valid URL`);
        }
        if (field.type === 'number' && isNaN(Number(value))) {
          throw new BadRequestException(`Field ${field.label} must be a number`);
        }
      }
    }
  }

  /**
   * Generate embed code
   */
  private generateEmbedCode(formId: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://app.nidiaflow.com';
    return `<iframe src="${baseUrl}/forms/${formId}" width="100%" height="600" frameborder="0"></iframe>`;
  }

  /**
   * Generate embed URL
   */
  private generateEmbedUrl(formId: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://app.nidiaflow.com';
    return `${baseUrl}/forms/${formId}`;
  }

  /**
   * Build where clause for filtering
   */
  private buildWhereClause(filters: WebFormFilterDto): Prisma.WebFormWhereInput {
    const where: Prisma.WebFormWhereInput = {};

    if (filters.name) {
      where.name = { contains: filters.name, mode: 'insensitive' };
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return where;
  }

  /**
   * Map to response DTO
   */
  private mapToResponseDto(form: any): WebFormResponseDto {
    return {
      id: form.id,
      name: form.name,
      description: form.description,
      isActive: form.isActive,
      fields: form.fields,
      settings: form.settings,
      styles: form.styles,
      embedCode: form.embedCode,
      embedUrl: form.embedUrl,
      recaptchaEnabled: form.recaptchaEnabled,
      viewCount: form.viewCount,
      submissionCount: form.submissionCount,
      createdAt: form.createdAt,
      updatedAt: form.updatedAt,
    };
  }

  /**
   * Map submission to response DTO
   */
  private mapSubmissionToResponseDto(submission: any): WebFormSubmissionResponseDto {
    return {
      id: submission.id,
      formId: submission.formId,
      data: submission.data,
      customerId: submission.customerId,
      createdAt: submission.createdAt,
    };
  }
}

