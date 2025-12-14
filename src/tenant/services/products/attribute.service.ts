import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CreateAttributeDto, UpdateAttributeDto } from '../../dto/products/attribute.dto';

@Injectable()
export class AttributeService {
  constructor(private readonly prisma: TenantPrismaService) {}

  async create(createAttributeDto: CreateAttributeDto) {
    const { values, ...attributeData } = createAttributeDto;
    const client = await this.prisma.getTenantClient();

    const attribute = await client.attribute.create({
      data: {
        ...attributeData,
        values: values ? {
          create: values.map((v) => ({
            name: v.name,
            value: v.value,
            position: v.position || 0,
          })),
        } : undefined,
      },
      include: {
        values: {
          orderBy: { position: 'asc' },
        },
      },
    });

    return attribute;
  }

  async findAll() {
    const client = await this.prisma.getTenantClient();
    return client.attribute.findMany({
      include: {
        values: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const client = await this.prisma.getTenantClient();
    const attribute = await client.attribute.findUnique({
      where: { id },
      include: {
        values: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!attribute) {
      throw new NotFoundException(`Attribute with ID ${id} not found`);
    }

    return attribute;
  }

  async update(id: string, updateAttributeDto: UpdateAttributeDto) {
    const { values, ...attributeData } = updateAttributeDto;
    const client = await this.prisma.getTenantClient();

    const existingAttribute = await client.attribute.findUnique({
      where: { id },
    });

    if (!existingAttribute) {
      throw new NotFoundException(`Attribute with ID ${id} not found`);
    }

    // Update values if provided
    if (values) {
       const upsertOperations = values.map(val => {
        if (val.id) {
          return client.attributeValue.update({
            where: { id: val.id },
            data: {
              name: val.name,
              value: val.value,
              position: val.position,
            },
          });
        } else {
          return client.attributeValue.create({
            data: {
              attributeId: id,
              name: val.name,
              value: val.value,
              position: val.position || 0,
            },
          });
        }
      });
      
      await Promise.all(upsertOperations);
    }

    const attribute = await client.attribute.update({
      where: { id },
      data: {
        ...attributeData,
      },
      include: {
        values: {
          orderBy: { position: 'asc' },
        },
      },
    });

    return attribute;
  }

  async remove(id: string) {
    const client = await this.prisma.getTenantClient();
    
    // 1. Get the attribute name
    const attribute = await client.attribute.findUnique({
      where: { id },
    });

    if (!attribute) {
      throw new NotFoundException(`Attribute with ID ${id} not found`);
    }

    // 2. Check if any ProductVariant uses this attribute name in option1Name or option2Name
    const usageCount = await client.productVariant.count({
      where: {
        OR: [
          { option1Name: attribute.name },
          { option2Name: attribute.name },
        ],
      },
    });

    if (usageCount > 0) {
      throw new BadRequestException(`Cannot delete attribute "${attribute.name}" because it is used by ${usageCount} product variants.`);
    }
    
    await client.attribute.delete({
      where: { id },
    });
  }
}
