import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
  ParseIntPipe,
  DefaultValuePipe,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { AuditLogService } from '../services/audit/audit-log.service';
import {
  AuditLogResponseDto,
  AuditLogFilterDto,
} from '../dto/audit/audit-log.dto';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Get audit logs with filtering and pagination' })
  @RequirePermissions('audit:read')
  async getAuditLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query() filters: AuditLogFilterDto,
  ) {
    if (page < 1) {
      throw new BadRequestException('Page must be greater than 0');
    }
    if (limit < 1 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    return this.auditLogService.findAll(filters, page, limit);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get audit statistics' })
  @RequirePermissions('audit:read')
  async getAuditStatistics(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    if (days < 1 || days > 365) {
      throw new BadRequestException('Days must be between 1 and 365');
    }

    return this.auditLogService.getStatistics(days);
  }
}