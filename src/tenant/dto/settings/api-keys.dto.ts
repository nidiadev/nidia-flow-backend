import { IsString, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateWhatsAppApiKeyDto {
  @ApiProperty({ description: 'WhatsApp API key' })
  @IsString()
  apiKey: string;

  @ApiPropertyOptional({ description: 'WhatsApp phone ID' })
  @IsOptional()
  @IsString()
  phoneId?: string;
}

export class UpdateSendGridApiKeyDto {
  @ApiProperty({ description: 'SendGrid API key' })
  @IsString()
  apiKey: string;

  @ApiPropertyOptional({ description: 'SendGrid from email address' })
  @IsOptional()
  @IsEmail()
  fromEmail?: string;
}

export class UpdateGoogleMapsApiKeyDto {
  @ApiProperty({ description: 'Google Maps API key' })
  @IsString()
  apiKey: string;
}

export class UpdateEnabledModulesDto {
  @ApiProperty({ 
    description: 'Array of enabled module names',
    type: [String],
    example: ['crm', 'orders', 'tasks', 'accounting', 'reports']
  })
  @IsString({ each: true })
  modules: string[];
}

export class UpdateBusinessHoursDto {
  @ApiProperty({ 
    description: 'Business hours configuration by day',
    example: {
      monday: { open: '08:00', close: '18:00', isOpen: true },
      tuesday: { open: '08:00', close: '18:00', isOpen: true },
      wednesday: { open: '08:00', close: '18:00', isOpen: true },
      thursday: { open: '08:00', close: '18:00', isOpen: true },
      friday: { open: '08:00', close: '18:00', isOpen: true },
      saturday: { open: '08:00', close: '14:00', isOpen: true },
      sunday: { open: '00:00', close: '00:00', isOpen: false }
    }
  })
  businessHours: Record<string, {
    open: string;
    close: string;
    isOpen: boolean;
  }>;
}

export class ModuleStatusResponseDto {
  @ApiProperty({ description: 'Module name' })
  module: string;

  @ApiProperty({ description: 'Whether the module is enabled' })
  enabled: boolean;
}

export class BusinessConfigResponseDto {
  @ApiProperty({ description: 'Timezone' })
  timezone: string;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Locale' })
  locale: string;

  @ApiProperty({ description: 'Default tax rate percentage' })
  defaultTaxRate: number;

  @ApiProperty({ description: 'Business hours configuration' })
  businessHours: Record<string, any>;
}