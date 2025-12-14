import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from '../../dto/products/warehouse.dto';

@Injectable()
export class WarehouseService {
  constructor(private readonly prisma: TenantPrismaService) {}

  async create(createWarehouseDto: CreateWarehouseDto) {
    const client = await this.prisma.getTenantClient();
    
    // If setting as default, unset others
    if (createWarehouseDto.isDefault) {
      await client.warehouse.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return client.warehouse.create({
      data: createWarehouseDto,
    });
  }

  async findAll() {
    const client = await this.prisma.getTenantClient();
    return client.warehouse.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const client = await this.prisma.getTenantClient();
    const warehouse = await client.warehouse.findUnique({
      where: { id },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    return warehouse;
  }

  async update(id: string, updateWarehouseDto: UpdateWarehouseDto) {
    const client = await this.prisma.getTenantClient();

    // If setting as default, unset others
    if (updateWarehouseDto.isDefault) {
      await client.warehouse.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const warehouse = await client.warehouse.update({
      where: { id },
      data: updateWarehouseDto,
    });

    return warehouse;
  }

  async remove(id: string) {
    const client = await this.prisma.getTenantClient();
    
    // Check inventory usage?
    // Ideally yes.
    
    return client.warehouse.delete({
      where: { id },
    });
  }
}

