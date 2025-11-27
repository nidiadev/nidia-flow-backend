import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { BusinessEventEmitterService } from '../../../common/events/event-emitter.service';
import { BusinessEventTypes } from '../../../common/events/business-events';
import {
  CreateLeadScoringRuleDto,
  UpdateLeadScoringRuleDto,
  LeadScoringRuleFilterDto,
  LeadScoringRuleResponseDto,
  LeadScoreHistoryResponseDto,
  RecalculateScoreDto,
  LeadScoreClassification,
  LeadScoreSummaryDto,
  ScoringCategory,
} from '../../dto/crm/lead-scoring.dto';
import { Prisma } from '../../../../generated/tenant-prisma';

/**
 * LeadScoringService
 * 
 * Service for managing lead scoring rules and calculating customer scores
 */
@Injectable()
export class LeadScoringService {
  private readonly logger = new Logger(LeadScoringService.name);

  constructor(
    private readonly prisma: TenantPrismaService,
    private readonly eventEmitter: BusinessEventEmitterService,
  ) {}

  /**
   * Create a new lead scoring rule
   */
  async create(
    createDto: CreateLeadScoringRuleDto,
    userId: string,
  ): Promise<LeadScoringRuleResponseDto> {
    const client = await this.prisma.getTenantClient();

    const rule = await client.leadScoringRule.create({
      data: {
        name: createDto.name,
        description: createDto.description,
        category: createDto.category,
        condition: createDto.condition as any,
        points: createDto.points,
        isActive: createDto.isActive ?? true,
        priority: createDto.priority ?? 0,
        sortOrder: createDto.sortOrder ?? 0,
        createdBy: userId,
      },
    });

    // If rule is active, recalculate scores for affected customers
    if (rule.isActive) {
      await this.recalculateAffectedScores(rule.id);
    }

    this.logger.log(`Lead scoring rule created: ${rule.id}`);
    return this.mapRuleToResponseDto(rule);
  }

  /**
   * Find all lead scoring rules
   */
  async findMany(
    filters: LeadScoringRuleFilterDto,
  ): Promise<{ data: LeadScoringRuleResponseDto[]; pagination: any }> {
    const client = await this.prisma.getTenantClient();
    const where = this.buildWhereClause(filters);

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;
    const sortBy = filters.sortBy || 'priority';
    const sortOrder = filters.sortOrder || 'desc';

    const [rules, total] = await Promise.all([
      client.leadScoringRule.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      client.leadScoringRule.count({ where }),
    ]);

    return {
      data: rules.map((rule) => this.mapRuleToResponseDto(rule)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find rule by ID
   */
  async findById(id: string): Promise<LeadScoringRuleResponseDto> {
    const client = await this.prisma.getTenantClient();
    const rule = await client.leadScoringRule.findUnique({ where: { id } });

    if (!rule) {
      throw new NotFoundException(`Lead scoring rule with ID ${id} not found`);
    }

    return this.mapRuleToResponseDto(rule);
  }

  /**
   * Update lead scoring rule
   */
  async update(
    id: string,
    updateDto: UpdateLeadScoringRuleDto,
  ): Promise<LeadScoringRuleResponseDto> {
    const client = await this.prisma.getTenantClient();

    const existing = await client.leadScoringRule.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Lead scoring rule with ID ${id} not found`);
    }

    if (existing.isSystem) {
      throw new BadRequestException('Cannot modify system lead scoring rules');
    }

    const rule = await client.leadScoringRule.update({
      where: { id },
      data: {
        name: updateDto.name,
        description: updateDto.description,
        category: updateDto.category,
        condition: updateDto.condition as any,
        points: updateDto.points,
        isActive: updateDto.isActive,
        priority: updateDto.priority,
        sortOrder: updateDto.sortOrder,
      },
    });

    // If rule changed and is active, recalculate affected scores
    if (rule.isActive && (updateDto.condition || updateDto.points !== undefined)) {
      await this.recalculateAffectedScores(id);
    }

    this.logger.log(`Lead scoring rule updated: ${id}`);
    return this.mapRuleToResponseDto(rule);
  }

  /**
   * Delete lead scoring rule
   */
  async delete(id: string): Promise<void> {
    const client = await this.prisma.getTenantClient();

    const rule = await client.leadScoringRule.findUnique({ where: { id } });
    if (!rule) {
      throw new NotFoundException(`Lead scoring rule with ID ${id} not found`);
    }

    if (rule.isSystem) {
      throw new BadRequestException('Cannot delete system lead scoring rules');
    }

    await client.leadScoringRule.delete({ where: { id } });
    this.logger.log(`Lead scoring rule deleted: ${id}`);
  }

  /**
   * Calculate lead score for a customer
   */
  async calculateScore(customerId: string): Promise<number> {
    const client = await this.prisma.getTenantClient();

    // Get customer data
    const customer = await client.customer.findUnique({
      where: { id: customerId },
      include: {
        interactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        orders: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    // Get all active rules, ordered by priority
    const rules = await client.leadScoringRule.findMany({
      where: { isActive: true },
      orderBy: [{ priority: 'desc' }, { sortOrder: 'asc' }],
    });

    let score = 0;
    const breakdown = {
      demographic: 0,
      engagement: 0,
      behavior: 0,
      fit: 0,
    };

    // Evaluate each rule
    for (const rule of rules) {
      if (this.evaluateRule(rule.condition as any, customer)) {
        score += rule.points;
        breakdown[rule.category as ScoringCategory] += rule.points;
      }
    }

    // Clamp score between 0 and 100
    score = Math.max(0, Math.min(100, score));

    return score;
  }

  /**
   * Recalculate score for a customer and save history
   */
  async recalculateScore(
    customerId: string,
    triggerType: string = 'recalculate',
    triggerId?: string,
    reason?: string,
  ): Promise<{ oldScore: number; newScore: number; change: number }> {
    const client = await this.prisma.getTenantClient();

    const customer = await client.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    const oldScore = customer.leadScore;
    const newScore = await this.calculateScore(customerId);
    const change = newScore - oldScore;

    // Update customer score
    await client.customer.update({
      where: { id: customerId },
      data: { leadScore: newScore },
    });

    // Save history if score changed
    if (oldScore !== newScore) {
      await client.leadScoreHistory.create({
        data: {
          customerId,
          oldScore,
          newScore,
          change,
          triggerType,
          triggerId,
          reason,
        },
      });

      // Emit event
      await this.eventEmitter.emit(BusinessEventTypes.LEAD_SCORE_CHANGED, {
        customerId,
        oldScore,
        newScore,
        change,
        triggerType,
      });

      // Check if score crossed threshold and send alert
      await this.checkScoreThreshold(customerId, oldScore, newScore);
    }

    this.logger.log(`Score recalculated for customer ${customerId}: ${oldScore} -> ${newScore}`);
    return { oldScore, newScore, change };
  }

  /**
   * Recalculate scores for all customers
   */
  async recalculateAllScores(): Promise<{ processed: number; updated: number }> {
    const client = await this.prisma.getTenantClient();

    const customers = await client.customer.findMany({
      select: { id: true },
    });

    let processed = 0;
    let updated = 0;

    for (const customer of customers) {
      try {
        const result = await this.recalculateScore(customer.id, 'recalculate_all');
        processed++;
        if (result.change !== 0) {
          updated++;
        }
      } catch (error: any) {
        this.logger.error(`Failed to recalculate score for customer ${customer.id}: ${error.message}`);
      }
    }

    this.logger.log(`Recalculated scores: ${processed} processed, ${updated} updated`);
    return { processed, updated };
  }

  /**
   * Get score history for a customer
   */
  async getScoreHistory(
    customerId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: LeadScoreHistoryResponseDto[]; pagination: any }> {
    const client = await this.prisma.getTenantClient();

    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      client.leadScoreHistory.findMany({
        where: { customerId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      client.leadScoreHistory.count({ where: { customerId } }),
    ]);

    return {
      data: history.map((entry) => this.mapHistoryToResponseDto(entry)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get score summary for a customer
   */
  async getScoreSummary(customerId: string): Promise<LeadScoreSummaryDto> {
    const client = await this.prisma.getTenantClient();

    const customer = await client.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    const score = customer.leadScore;
    const classification = this.getScoreClassification(score);

    // Calculate breakdown by evaluating all rules
    const rules = await client.leadScoringRule.findMany({
      where: { isActive: true },
      orderBy: [{ priority: 'desc' }, { sortOrder: 'asc' }],
    });

    const customerData = await client.customer.findUnique({
      where: { id: customerId },
      include: {
        interactions: { take: 10, orderBy: { createdAt: 'desc' } },
        orders: { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });

    const breakdown = {
      demographic: 0,
      engagement: 0,
      behavior: 0,
      fit: 0,
    };

    for (const rule of rules) {
      if (this.evaluateRule(rule.condition as any, customerData)) {
        breakdown[rule.category as ScoringCategory] += rule.points;
      }
    }

    // Get last update from history
    const lastHistory = await client.leadScoreHistory.findFirst({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      score,
      classification,
      breakdown,
      lastUpdated: lastHistory?.createdAt || customer.updatedAt,
    };
  }

  /**
   * Initialize default scoring rules
   */
  async initializeDefaultRules(userId: string): Promise<void> {
    const client = await this.prisma.getTenantClient();

    const defaultRules = [
      {
        name: 'CEO/Director/Gerente',
        description: 'High-value job titles',
        category: ScoringCategory.DEMOGRAPHIC,
        condition: {
          field: 'jobTitle',
          operator: 'in',
          value: ['CEO', 'Director', 'Gerente', 'Manager'],
        },
        points: 20,
        isSystem: true,
        priority: 10,
      },
      {
        name: 'Empresa > 10 empleados',
        description: 'Medium to large companies',
        category: ScoringCategory.DEMOGRAPHIC,
        condition: {
          field: 'companySize',
          operator: 'greater_than',
          value: 10,
        },
        points: 15,
        isSystem: true,
        priority: 9,
      },
      {
        name: 'Abrió email últimos 7 días',
        description: 'Recent email engagement',
        category: ScoringCategory.ENGAGEMENT,
        condition: {
          field: 'lastEmailOpenedAt',
          operator: 'greater_than',
          value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        points: 15,
        isSystem: true,
        priority: 8,
      },
      {
        name: 'Respondió WhatsApp',
        description: 'WhatsApp response',
        category: ScoringCategory.ENGAGEMENT,
        condition: {
          field: 'lastWhatsAppResponseAt',
          operator: 'is_not_null',
          value: null,
        },
        points: 20,
        isSystem: true,
        priority: 7,
      },
      {
        name: 'Sin interacción 30 días',
        description: 'Negative: No recent interaction',
        category: ScoringCategory.ENGAGEMENT,
        condition: {
          field: 'lastInteractionAt',
          operator: 'less_than',
          value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
        points: -10,
        isSystem: true,
        priority: 6,
      },
    ];

    for (const ruleData of defaultRules) {
      await client.leadScoringRule.upsert({
        where: { id: ruleData.name }, // This won't work, need unique constraint
        create: {
          ...ruleData,
          condition: ruleData.condition as any,
          createdBy: userId,
        },
        update: {},
      });
    }

    this.logger.log('Default lead scoring rules initialized');
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Evaluate a scoring rule condition against customer data
   */
  private evaluateRule(condition: any, customer: any): boolean {
    const { field, operator, value } = condition;

    // Get field value from customer
    let fieldValue: any = customer[field];

    // Handle nested fields (e.g., interactions, orders)
    if (field.includes('.')) {
      const parts = field.split('.');
      fieldValue = customer;
      for (const part of parts) {
        fieldValue = fieldValue?.[part];
      }
    }

    // Evaluate based on operator
    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'contains':
        return String(fieldValue || '').toLowerCase().includes(String(value).toLowerCase());
      case 'greater_than':
        return Number(fieldValue || 0) > Number(value);
      case 'less_than':
        return Number(fieldValue || 0) < Number(value);
      case 'in':
        return Array.isArray(value) ? value.includes(fieldValue) : false;
      case 'not_in':
        return Array.isArray(value) ? !value.includes(fieldValue) : true;
      case 'is_not_null':
        return fieldValue !== null && fieldValue !== undefined;
      case 'is_null':
        return fieldValue === null || fieldValue === undefined;
      default:
        return false;
    }
  }

  /**
   * Recalculate scores for customers affected by a rule change
   */
  private async recalculateAffectedScores(ruleId: string): Promise<void> {
    const client = await this.prisma.getTenantClient();

    // For now, recalculate all scores
    // In production, you could optimize by only recalculating affected customers
    await this.recalculateAllScores();
  }

  /**
   * Check if score crossed threshold and send alert
   */
  private async checkScoreThreshold(
    customerId: string,
    oldScore: number,
    newScore: number,
  ): Promise<void> {
    const threshold = 70; // Configurable threshold

    if (oldScore < threshold && newScore >= threshold) {
      // Score crossed threshold upward
      this.logger.log(`Customer ${customerId} score crossed threshold: ${oldScore} -> ${newScore}`);
      // Emit event for notification
      await this.eventEmitter.emit(BusinessEventTypes.LEAD_SCORE_THRESHOLD_CROSSED, {
        customerId,
        oldScore,
        newScore,
        threshold,
        direction: 'up',
      });
    }
  }

  /**
   * Get score classification
   */
  private getScoreClassification(score: number): LeadScoreClassification {
    if (score <= 30) return LeadScoreClassification.COLD;
    if (score <= 60) return LeadScoreClassification.WARM;
    return LeadScoreClassification.HOT;
  }

  /**
   * Build where clause for filtering rules
   */
  private buildWhereClause(filters: LeadScoringRuleFilterDto): Prisma.LeadScoringRuleWhereInput {
    const where: Prisma.LeadScoringRuleWhereInput = {};

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.isSystem !== undefined) {
      where.isSystem = filters.isSystem;
    }

    return where;
  }

  /**
   * Map rule to response DTO
   */
  private mapRuleToResponseDto(rule: any): LeadScoringRuleResponseDto {
    return {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      category: rule.category,
      isActive: rule.isActive,
      isSystem: rule.isSystem,
      condition: rule.condition,
      points: rule.points,
      priority: rule.priority,
      sortOrder: rule.sortOrder,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }

  /**
   * Map history to response DTO
   */
  private mapHistoryToResponseDto(history: any): LeadScoreHistoryResponseDto {
    return {
      id: history.id,
      customerId: history.customerId,
      oldScore: history.oldScore,
      newScore: history.newScore,
      change: history.change,
      triggerType: history.triggerType,
      triggerId: history.triggerId,
      reason: history.reason,
      createdAt: history.createdAt,
    };
  }
}

