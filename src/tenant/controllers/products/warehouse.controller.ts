import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { WarehouseService } from '../../services/products/warehouse.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from '../../dto/products/warehouse.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../../auth/guards/permissions.guard';

@Controller('warehouses')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Post()
  @RequirePermissions('products:warehouses:write')
  async create(@Body() createWarehouseDto: CreateWarehouseDto): Promise<{ success: boolean; data: any; message: string }> {
    const warehouse = await this.warehouseService.create(createWarehouseDto);
    return {
      success: true,
      data: warehouse,
      message: 'Warehouse created successfully',
    };
  }

  @Get()
  @RequirePermissions('products:warehouses:read')
  async findAll(): Promise<{ success: boolean; data: any[] }> {
    const warehouses = await this.warehouseService.findAll();
    return {
      success: true,
      data: warehouses,
    };
  }

  @Get(':id')
  @RequirePermissions('products:warehouses:read')
  async findOne(@Param('id') id: string): Promise<{ success: boolean; data: any }> {
    const warehouse = await this.warehouseService.findOne(id);
    return {
      success: true,
      data: warehouse,
    };
  }

  @Patch(':id')
  @RequirePermissions('products:warehouses:write')
  async update(@Param('id') id: string, @Body() updateWarehouseDto: UpdateWarehouseDto): Promise<{ success: boolean; data: any; message: string }> {
    const warehouse = await this.warehouseService.update(id, updateWarehouseDto);
    return {
      success: true,
      data: warehouse,
      message: 'Warehouse updated successfully',
    };
  }

  @Delete(':id')
  @RequirePermissions('products:warehouses:delete')
  async remove(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    await this.warehouseService.remove(id);
    return {
      success: true,
      message: 'Warehouse deleted successfully',
    };
  }
}
