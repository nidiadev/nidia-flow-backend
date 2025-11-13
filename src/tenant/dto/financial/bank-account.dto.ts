import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateBankAccountDto {
  @ApiProperty({ description: 'Account name' })
  @IsString()
  accountName: string;

  @ApiProperty({ description: 'Bank name' })
  @IsString()
  bankName: string;

  @ApiPropertyOptional({ description: 'Account number' })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiPropertyOptional({ description: 'Account type (checking, savings)' })
  @IsOptional()
  @IsString()
  accountType?: string;

  @ApiPropertyOptional({ description: 'Currency code', default: 'COP' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Initial balance', minimum: 0, default: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  initialBalance?: number;

  @ApiPropertyOptional({ description: 'Set as primary account', default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateBankAccountDto extends PartialType(CreateBankAccountDto) {
  @ApiPropertyOptional({ description: 'Account active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}