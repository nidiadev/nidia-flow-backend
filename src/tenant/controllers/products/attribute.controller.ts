import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AttributeService } from '../../services/products/attribute.service';
import { CreateAttributeDto, UpdateAttributeDto } from '../../dto/products/attribute.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { RequirePermissions } from '../../../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../../auth/guards/permissions.guard';

@Controller('attributes')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class AttributeController {
  constructor(private readonly attributeService: AttributeService) {}

  @Post()
  @RequirePermissions('products:attributes:write')
  async create(@Body() createAttributeDto: CreateAttributeDto): Promise<{ success: boolean; data: any; message: string }> {
    const attribute = await this.attributeService.create(createAttributeDto);
    return {
      success: true,
      data: attribute,
      message: 'Attribute created successfully',
    };
  }

  @Get()
  @RequirePermissions('products:attributes:read')
  async findAll(): Promise<{ success: boolean; data: any[] }> {
    const attributes = await this.attributeService.findAll();
    return {
      success: true,
      data: attributes,
    };
  }

  @Get(':id')
  @RequirePermissions('products:attributes:read')
  async findOne(@Param('id') id: string): Promise<{ success: boolean; data: any }> {
    const attribute = await this.attributeService.findOne(id);
    return {
      success: true,
      data: attribute,
    };
  }

  @Patch(':id')
  @RequirePermissions('products:attributes:write')
  async update(@Param('id') id: string, @Body() updateAttributeDto: UpdateAttributeDto): Promise<{ success: boolean; data: any; message: string }> {
    const attribute = await this.attributeService.update(id, updateAttributeDto);
    return {
      success: true,
      data: attribute,
      message: 'Attribute updated successfully',
    };
  }

  @Delete(':id')
  @RequirePermissions('products:attributes:delete')
  async remove(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    await this.attributeService.remove(id);
    return {
      success: true,
      message: 'Attribute deleted successfully',
    };
  }
}
