import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { CompanySettingService } from '../services/settings/company-setting.service';
import { AuditLogService } from '../services/audit/audit-log.service';
import {
  UpdateCompanySettingDto,
  CompanySettingResponseDto,
} from '../dto/settings/company-setting.dto';
import {
  UpdateWhatsAppApiKeyDto,
  UpdateSendGridApiKeyDto,
  UpdateGoogleMapsApiKeyDto,
  UpdateEnabledModulesDto,
  UpdateBusinessHoursDto,
  ModuleStatusResponseDto,
  BusinessConfigResponseDto,
} from '../dto/settings/api-keys.dto';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(
    private readonly companySettingService: CompanySettingService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get company settings' })
  @ApiResponse({
    status: 200,
    description: 'Company settings retrieved successfully',
    type: CompanySettingResponseDto,
  })
  @RequirePermissions('settings:read')
  async getSettings(): Promise<CompanySettingResponseDto> {
    return this.companySettingService.getSettings();
  }

  @Put()
  @ApiOperation({ summary: 'Update company settings' })
  @ApiResponse({
    status: 200,
    description: 'Company settings updated successfully',
    type: CompanySettingResponseDto,
  })
  @RequirePermissions('settings:write')
  async updateSettings(
    @Body() updateDto: UpdateCompanySettingDto,
    @Request() req: any,
  ): Promise<CompanySettingResponseDto> {
    const userId = req.user?.userId;
    
    // Get current settings for audit log
    const currentSettings = await this.companySettingService.getSettings();
    
    // Update settings
    const updatedSettings = await this.companySettingService.updateSettings(
      updateDto,
      userId,
    );

    // Log the update action
    await this.auditLogService.logUpdate(
      'company_settings',
      updatedSettings.id,
      currentSettings,
      updatedSettings,
      userId,
      req,
    );

    return updatedSettings;
  }

  @Put('api-keys/whatsapp')
  @ApiOperation({ summary: 'Update WhatsApp API configuration' })
  @ApiResponse({
    status: 200,
    description: 'WhatsApp API key updated successfully',
    type: CompanySettingResponseDto,
  })
  @RequirePermissions('settings:write', 'integrations:manage')
  async updateWhatsAppApiKey(
    @Body() body: UpdateWhatsAppApiKeyDto,
    @Request() req: any,
  ): Promise<CompanySettingResponseDto> {
    const userId = req.user?.userId;
    
    if (!body.apiKey) {
      throw new BadRequestException('API key is required');
    }

    const updatedSettings = await this.companySettingService.updateApiKey(
      'whatsapp',
      body.apiKey,
      { phoneId: body.phoneId },
      userId,
    );

    // Log the API key update
    await this.auditLogService.logAction(
      'whatsapp_api_key_updated',
      userId,
      'company_settings',
      updatedSettings.id,
      { phoneId: body.phoneId },
      req,
    );

    return updatedSettings;
  }

  @Put('api-keys/sendgrid')
  @ApiOperation({ summary: 'Update SendGrid API configuration' })
  @ApiResponse({
    status: 200,
    description: 'SendGrid API key updated successfully',
    type: CompanySettingResponseDto,
  })
  @RequirePermissions('settings:write', 'integrations:manage')
  async updateSendGridApiKey(
    @Body() body: UpdateSendGridApiKeyDto,
    @Request() req: any,
  ): Promise<CompanySettingResponseDto> {
    const userId = req.user?.userId;
    
    if (!body.apiKey) {
      throw new BadRequestException('API key is required');
    }

    const updatedSettings = await this.companySettingService.updateApiKey(
      'sendgrid',
      body.apiKey,
      { fromEmail: body.fromEmail },
      userId,
    );

    // Log the API key update
    await this.auditLogService.logAction(
      'sendgrid_api_key_updated',
      userId,
      'company_settings',
      updatedSettings.id,
      { fromEmail: body.fromEmail },
      req,
    );

    return updatedSettings;
  }

  @Put('api-keys/google-maps')
  @ApiOperation({ summary: 'Update Google Maps API configuration' })
  @ApiResponse({
    status: 200,
    description: 'Google Maps API key updated successfully',
    type: CompanySettingResponseDto,
  })
  @RequirePermissions('settings:write', 'integrations:manage')
  async updateGoogleMapsApiKey(
    @Body() body: UpdateGoogleMapsApiKeyDto,
    @Request() req: any,
  ): Promise<CompanySettingResponseDto> {
    const userId = req.user?.userId;
    
    if (!body.apiKey) {
      throw new BadRequestException('API key is required');
    }

    const updatedSettings = await this.companySettingService.updateApiKey(
      'googleMaps',
      body.apiKey,
      {},
      userId,
    );

    // Log the API key update
    await this.auditLogService.logAction(
      'google_maps_api_key_updated',
      userId,
      'company_settings',
      updatedSettings.id,
      {},
      req,
    );

    return updatedSettings;
  }

  @Put('modules')
  @ApiOperation({ summary: 'Update enabled modules' })
  @ApiResponse({
    status: 200,
    description: 'Enabled modules updated successfully',
    type: CompanySettingResponseDto,
  })
  @RequirePermissions('settings:write', 'modules:manage')
  async updateEnabledModules(
    @Body() body: UpdateEnabledModulesDto,
    @Request() req: any,
  ): Promise<CompanySettingResponseDto> {
    const userId = req.user?.userId;
    
    if (!Array.isArray(body.modules)) {
      throw new BadRequestException('Modules must be an array');
    }

    // Get current modules for audit log
    const currentSettings = await this.companySettingService.getSettings();
    
    const updatedSettings = await this.companySettingService.updateEnabledModules(
      body.modules,
      userId,
    );

    // Log the modules update
    await this.auditLogService.logAction(
      'enabled_modules_updated',
      userId,
      'company_settings',
      updatedSettings.id,
      {
        before: currentSettings.enabledModules,
        after: body.modules,
      },
      req,
    );

    return updatedSettings;
  }

  @Put('business-hours')
  @ApiOperation({ summary: 'Update business hours' })
  @ApiResponse({
    status: 200,
    description: 'Business hours updated successfully',
    type: CompanySettingResponseDto,
  })
  @RequirePermissions('settings:write')
  async updateBusinessHours(
    @Body() body: UpdateBusinessHoursDto,
    @Request() req: any,
  ): Promise<CompanySettingResponseDto> {
    const userId = req.user?.userId;
    
    if (!body.businessHours || typeof body.businessHours !== 'object') {
      throw new BadRequestException('Business hours configuration is required');
    }

    // Get current business hours for audit log
    const currentSettings = await this.companySettingService.getSettings();
    
    const updatedSettings = await this.companySettingService.updateBusinessHours(
      body.businessHours,
      userId,
    );

    // Log the business hours update
    await this.auditLogService.logAction(
      'business_hours_updated',
      userId,
      'company_settings',
      updatedSettings.id,
      {
        before: currentSettings.businessHours,
        after: body.businessHours,
      },
      req,
    );

    return updatedSettings;
  }

  @Get('modules/status')
  @ApiOperation({ summary: 'Check if a module is enabled' })
  @ApiQuery({ name: 'module', description: 'Module name to check' })
  @ApiResponse({
    status: 200,
    description: 'Module status retrieved successfully',
    type: ModuleStatusResponseDto,
  })
  @RequirePermissions('settings:read')
  async checkModuleStatus(@Query('module') moduleName: string): Promise<ModuleStatusResponseDto> {
    if (!moduleName) {
      throw new BadRequestException('Module name is required');
    }

    const enabled = await this.companySettingService.isModuleEnabled(moduleName);
    
    return {
      module: moduleName,
      enabled,
    };
  }

  @Get('business-config')
  @ApiOperation({ summary: 'Get business configuration' })
  @ApiResponse({
    status: 200,
    description: 'Business configuration retrieved successfully',
    type: BusinessConfigResponseDto,
  })
  @RequirePermissions('settings:read')
  async getBusinessConfig(): Promise<BusinessConfigResponseDto> {
    return this.companySettingService.getBusinessConfig();
  }
}