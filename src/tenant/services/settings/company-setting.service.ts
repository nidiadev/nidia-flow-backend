import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { 
  UpdateCompanySettingDto, 
  CompanySettingResponseDto 
} from '../../dto/settings/company-setting.dto';

@Injectable()
export class CompanySettingService {
  constructor(private readonly prisma: TenantPrismaService) {}

  private async getClient() {
    return this.prisma.getTenantClient();
  }

  /**
   * Get company settings (creates default if not exists)
   */
  async getSettings(): Promise<CompanySettingResponseDto> {
    const client = await this.getClient();
    let settings = await client.companySetting.findFirst({
      include: {
        updatedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Create default settings if none exist
    if (!settings) {
      settings = await this.createDefaultSettings();
    }

    return this.mapToResponseDto(settings);
  }

  /**
   * Update company settings
   */
  async updateSettings(updateDto: UpdateCompanySettingDto, updatedBy: string): Promise<CompanySettingResponseDto> {
    try {
      const client = await this.getClient();
      // Get existing settings or create default
      let existingSettings = await client.companySetting.findFirst();
      
      if (!existingSettings) {
        existingSettings = await this.createDefaultSettings();
      }

      // Mask sensitive API keys if they're being updated
      const updateData = { ...updateDto };
      if (updateData.whatsappApiKey) {
        updateData.whatsappApiKey = this.maskApiKey(updateData.whatsappApiKey);
      }
      if (updateData.sendgridApiKey) {
        updateData.sendgridApiKey = this.maskApiKey(updateData.sendgridApiKey);
      }
      if (updateData.googleMapsApiKey) {
        updateData.googleMapsApiKey = this.maskApiKey(updateData.googleMapsApiKey);
      }

      const updatedSettings = await client.companySetting.update({
        where: { id: existingSettings!.id },   
     data: {
          ...updateData,
          updatedBy,
          updatedAt: new Date(),
        },
        include: {
          updatedByUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return this.mapToResponseDto(updatedSettings);
    } catch (error) {
      throw new BadRequestException(`Failed to update company settings: ${error.message}`);
    }
  }

  /**
   * Update specific API key
   */
  async updateApiKey(
    keyType: 'whatsapp' | 'sendgrid' | 'googleMaps',
    apiKey: string,
    additionalData?: Record<string, any>,
    updatedBy?: string,
  ): Promise<CompanySettingResponseDto> {
    try {
      const client = await this.getClient();
      let existingSettings = await client.companySetting.findFirst();
      
      if (!existingSettings) {
        existingSettings = await this.createDefaultSettings();
      }

      const updateData: any = {
        updatedBy,
        updatedAt: new Date(),
      };

      switch (keyType) {
        case 'whatsapp':
          updateData.whatsappApiKey = apiKey;
          if (additionalData?.phoneId) {
            updateData.whatsappPhoneId = additionalData.phoneId;
          }
          break;
        case 'sendgrid':
          updateData.sendgridApiKey = apiKey;
          if (additionalData?.fromEmail) {
            updateData.sendgridFromEmail = additionalData.fromEmail;
          }
          break;
        case 'googleMaps':
          updateData.googleMapsApiKey = apiKey;
          break;
        default:
          throw new BadRequestException(`Invalid API key type: ${keyType}`);
      }

      const updatedSettings = await client.companySetting.update({
        where: { id: existingSettings!.id },
        data: updateData,
        include: {
          updatedByUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return this.mapToResponseDto(updatedSettings);
    } catch (error) {
      throw new BadRequestException(`Failed to update ${keyType} API key: ${error.message}`);
    }
  }  /**

   * Update enabled modules
   */
  async updateEnabledModules(modules: string[], updatedBy: string): Promise<CompanySettingResponseDto> {
    try {
      const client = await this.getClient();
      let existingSettings = await client.companySetting.findFirst();
      
      if (!existingSettings) {
        existingSettings = await this.createDefaultSettings();
      }

      const updatedSettings = await client.companySetting.update({
        where: { id: existingSettings!.id },
        data: {
          enabledModules: modules,
          updatedBy,
          updatedAt: new Date(),
        },
        include: {
          updatedByUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return this.mapToResponseDto(updatedSettings);
    } catch (error) {
      throw new BadRequestException(`Failed to update enabled modules: ${error.message}`);
    }
  }

  /**
   * Update business hours
   */
  async updateBusinessHours(businessHours: Record<string, any>, updatedBy: string): Promise<CompanySettingResponseDto> {
    try {
      const client = await this.getClient();
      let existingSettings = await client.companySetting.findFirst();
      
      if (!existingSettings) {
        existingSettings = await this.createDefaultSettings();
      }

      const updatedSettings = await client.companySetting.update({
        where: { id: existingSettings!.id },
        data: {
          businessHours,
          updatedBy,
          updatedAt: new Date(),
        },
        include: {
          updatedByUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return this.mapToResponseDto(updatedSettings);
    } catch (error) {
      throw new BadRequestException(`Failed to update business hours: ${error.message}`);
    }
  }

  /**
   * Get API key (unmasked) for internal use
   */
  async getApiKey(keyType: 'whatsapp' | 'sendgrid' | 'googleMaps'): Promise<string | null> {
    const client = await this.getClient();
    const settings = await client.companySetting.findFirst();
    
    if (!settings) {
      return null;
    }

    switch (keyType) {
      case 'whatsapp':
        return settings.whatsappApiKey;
      case 'sendgrid':
        return settings.sendgridApiKey;
      case 'googleMaps':
        return settings.googleMapsApiKey;
      default:
        return null;
    }
  } 
 /**
   * Check if module is enabled
   */
  async isModuleEnabled(moduleName: string): Promise<boolean> {
    const client = await this.getClient();
    const settings = await client.companySetting.findFirst();
    
    if (!settings) {
      return false;
    }

    return settings.enabledModules.includes(moduleName);
  }

  /**
   * Get business configuration
   */
  async getBusinessConfig(): Promise<{
    timezone: string;
    currency: string;
    locale: string;
    defaultTaxRate: number;
    businessHours: Record<string, any>;
  }> {
    const client = await this.getClient();
    const settings = await client.companySetting.findFirst();
    
    if (!settings) {
      const defaultSettings = await this.createDefaultSettings();
      return {
        timezone: defaultSettings.timezone,
        currency: defaultSettings.currency,
        locale: defaultSettings.locale,
        defaultTaxRate: Number(defaultSettings.defaultTaxRate),
        businessHours: defaultSettings.businessHours as Record<string, any>,
      };
    }

    return {
      timezone: settings.timezone,
      currency: settings.currency,
      locale: settings.locale,
      defaultTaxRate: Number(settings.defaultTaxRate),
      businessHours: settings.businessHours as Record<string, any>,
    };
  }

  /**
   * Create default company settings
   */
  private async createDefaultSettings(): Promise<any> {
    const client = await this.getClient();
    const defaultSettings = await client.companySetting.create({
      data: {
        companyName: 'Mi Empresa',
        country: 'CO',
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981',
        businessHours: {
          monday: { open: '08:00', close: '18:00', isOpen: true },
          tuesday: { open: '08:00', close: '18:00', isOpen: true },
          wednesday: { open: '08:00', close: '18:00', isOpen: true },
          thursday: { open: '08:00', close: '18:00', isOpen: true },
          friday: { open: '08:00', close: '18:00', isOpen: true },
          saturday: { open: '08:00', close: '14:00', isOpen: true },
          sunday: { open: '00:00', close: '00:00', isOpen: false },
        },
        timezone: 'America/Bogota',
        currency: 'COP',
        locale: 'es-CO',
        defaultTaxRate: 19.00,
        enabledModules: ['crm', 'orders', 'tasks', 'accounting'],
        settings: {},
      },
    });

    return defaultSettings;
  }  /*
*
   * Mask API key for security (show only first 4 and last 4 characters)
   */
  private maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 8) {
      return apiKey;
    }
    
    const start = apiKey.substring(0, 4);
    const end = apiKey.substring(apiKey.length - 4);
    const middle = '*'.repeat(apiKey.length - 8);
    
    return `${start}${middle}${end}`;
  }

  /**
   * Map database entity to response DTO
   */
  private mapToResponseDto(settings: any): CompanySettingResponseDto {
    return {
      id: settings.id,
      companyName: settings.companyName,
      legalName: settings.legalName,
      taxId: settings.taxId,
      phone: settings.phone,
      email: settings.email,
      website: settings.website,
      address: settings.address,
      city: settings.city,
      state: settings.state,
      postalCode: settings.postalCode,
      country: settings.country,
      logoUrl: settings.logoUrl,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      businessHours: settings.businessHours,
      timezone: settings.timezone,
      currency: settings.currency,
      locale: settings.locale,
      defaultTaxRate: Number(settings.defaultTaxRate),
      whatsappApiKey: settings.whatsappApiKey ? this.maskApiKey(settings.whatsappApiKey) : undefined,
      whatsappPhoneId: settings.whatsappPhoneId,
      sendgridApiKey: settings.sendgridApiKey ? this.maskApiKey(settings.sendgridApiKey) : undefined,
      sendgridFromEmail: settings.sendgridFromEmail,
      googleMapsApiKey: settings.googleMapsApiKey ? this.maskApiKey(settings.googleMapsApiKey) : undefined,
      enabledModules: settings.enabledModules,
      settings: settings.settings,
      updatedBy: settings.updatedBy,
      updatedAt: settings.updatedAt,
    };
  }
}