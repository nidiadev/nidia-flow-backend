import { IsString, IsOptional, IsBoolean, IsEnum, ValidateNested, IsNumber, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export enum AttributeType {
  TEXT = 'text',
  COLOR = 'color',
  NUMBER = 'number',
  SELECT = 'select',
}

export class CreateAttributeValueDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  value?: string;

  @IsNumber()
  @IsOptional()
  position?: number;
}

export class CreateAttributeDto {
  @IsString()
  name: string;

  @IsEnum(AttributeType)
  type: AttributeType;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAttributeValueDto)
  @IsOptional()
  values?: CreateAttributeValueDto[];
}

export class UpdateAttributeValueDto {
  @IsString()
  @IsOptional()
  id?: string; // If provided, update existing. If not, create new.

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  value?: string;

  @IsNumber()
  @IsOptional()
  position?: number;
}

export class UpdateAttributeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(AttributeType)
  @IsOptional()
  type?: AttributeType;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateAttributeValueDto)
  @IsOptional()
  values?: UpdateAttributeValueDto[];
}

