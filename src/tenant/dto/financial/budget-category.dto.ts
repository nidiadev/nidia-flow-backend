import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export enum BudgetCategoryType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export class CreateBudgetCategoryDto {
  @ApiProperty({ description: 'Category name' })
  @IsString()
  name: string;

  @ApiProperty({ enum: BudgetCategoryType, description: 'Category type' })
  @IsEnum(BudgetCategoryType)
  type: BudgetCategoryType;

  @ApiPropertyOptional({ description: 'Monthly budget amount', minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monthlyBudget?: number;
}

export class UpdateBudgetCategoryDto extends PartialType(CreateBudgetCategoryDto) {
  @ApiPropertyOptional({ description: 'Category active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}