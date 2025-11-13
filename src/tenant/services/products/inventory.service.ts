import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import {
  CreateInventoryMovementDto,
  InventoryMovementFilterDto,
  InventoryMovementResponseDto,
  InventoryStatsDto,
  StockAdjustmentDto,
  BulkStockUpdateDto,
} from '../../dto/products/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: TenantPrismaService) {}

  async createMovement(createMovementDto: CreateInventoryMovementDto, createdBy: string): Promise<InventoryMovementResponseDto> {
    const { productId, productVariantId, movementType, quantity, referenceType, referenceId, reason, costPerUnit } = createMovementDto;
    const client = await this.prisma.getTenantClient();

    // Verificar que el producto existe
    const product = await client.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.trackInventory) {
      throw new BadRequestException('This product does not track inventory');
    }

    // Verificar variante si se especifica
    let productVariant: any = null;
    if (productVariantId) {
      productVariant = await client.productVariant.findUnique({
        where: { id: productVariantId },
      });

      if (!productVariant || productVariant.productId !== productId) {
        throw new NotFoundException('Product variant not found or does not belong to this product');
      }
    }

    // Calcular nuevas cantidades
    const currentQuantity = productVariantId ? productVariant.stockQuantity : product.stockQuantity;
    let newQuantity: number;

    switch (movementType) {
      case 'in':
        newQuantity = currentQuantity + quantity;
        break;
      case 'out':
        if (currentQuantity < quantity) {
          throw new BadRequestException('Insufficient stock for this operation');
        }
        newQuantity = currentQuantity - quantity;
        break;
      case 'adjustment':
        newQuantity = quantity;
        break;
      default:
        throw new BadRequestException('Invalid movement type');
    }

    // Crear movimiento y actualizar stock en transacción
    const movement = await client.$transaction(async (tx) => {
      // Crear movimiento de inventario
      const newMovement = await tx.inventoryMovement.create({
        data: {
          productId,
          productVariantId,
          movementType,
          quantity,
          previousQuantity: currentQuantity,
          newQuantity,
          referenceType,
          referenceId,
          reason,
          costPerUnit,
          totalCost: costPerUnit ? costPerUnit * quantity : null,
          createdBy,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
          productVariant: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
          createdByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Actualizar stock del producto o variante
      if (productVariantId) {
        await tx.productVariant.update({
          where: { id: productVariantId },
          data: { stockQuantity: newQuantity },
        });
      } else {
        await tx.product.update({
          where: { id: productId },
          data: { stockQuantity: newQuantity },
        });
      }

      return newMovement;
    });

    return this.mapMovementToResponseDto(movement);
  }

  async findMovements(filterDto: InventoryMovementFilterDto): Promise<{ data: InventoryMovementResponseDto[]; pagination: any }> {
    const {
      page = 1,
      limit = 20,
      productId,
      productVariantId,
      movementType,
      referenceType,
      referenceId,
      createdBy,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filterDto;
    const client = await this.prisma.getTenantClient();

    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = {};

    if (productId) {
      where.productId = productId;
    }

    if (productVariantId) {
      where.productVariantId = productVariantId;
    }

    if (movementType) {
      where.movementType = movementType;
    }

    if (referenceType) {
      where.referenceType = referenceType;
    }

    if (referenceId) {
      where.referenceId = referenceId;
    }

    if (createdBy) {
      where.createdBy = createdBy;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Ejecutar consultas
    const [movements, total] = await Promise.all([
      client.inventoryMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              imageUrl: true,
            },
          },
          productVariant: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
          createdByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      client.inventoryMovement.count({ where }),
    ]);

    const data = movements.map((movement) => this.mapMovementToResponseDto(movement));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async getMovementById(id: string): Promise<InventoryMovementResponseDto> {
    const client = await this.prisma.getTenantClient();
    const movement = await client.inventoryMovement.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            imageUrl: true,
          },
        },
        productVariant: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!movement) {
      throw new NotFoundException('Inventory movement not found');
    }

    return this.mapMovementToResponseDto(movement);
  }

  async adjustStock(adjustmentDto: StockAdjustmentDto, createdBy: string): Promise<InventoryMovementResponseDto> {
    const { productId, productVariantId, newQuantity, reason } = adjustmentDto;

    return this.createMovement({
      productId,
      productVariantId,
      movementType: 'adjustment',
      quantity: newQuantity,
      referenceType: 'adjustment',
      reason: reason || 'Stock adjustment',
    }, createdBy);
  }

  async bulkStockUpdate(bulkUpdateDto: BulkStockUpdateDto, createdBy: string): Promise<InventoryMovementResponseDto[]> {
    const { updates, reason } = bulkUpdateDto;
    const results: InventoryMovementResponseDto[] = [];
    const client = await this.prisma.getTenantClient();

    // Procesar actualizaciones en transacción
    await client.$transaction(async (tx) => {
      for (const update of updates) {
        const movement = await this.adjustStock({
          productId: update.productId,
          productVariantId: update.productVariantId,
          newQuantity: update.newQuantity,
          reason: reason || 'Bulk stock update',
        }, createdBy);
        
        results.push(movement);
      }
    });

    return results;
  }

  async getInventoryStats(): Promise<InventoryStatsDto> {
    const client = await this.prisma.getTenantClient();
    // Obtener productos para calcular estadísticas
    const products = await client.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        trackInventory: true,
        stockQuantity: true,
        stockMin: true,
      },
    });

    const totalProducts = products.length;
    const trackedProducts = products.filter(p => p.trackInventory).length;
    
    // Filtrar productos con stock bajo y sin stock
    const lowStockProducts = products.filter(p => 
      p.trackInventory && 
      p.stockQuantity > 0 && 
      p.stockMin !== null && 
      p.stockQuantity <= p.stockMin
    ).length;
    
    const outOfStockProducts = products.filter(p => 
      p.trackInventory && 
      p.stockQuantity === 0
    ).length;

    // Movimientos por tipo en los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const movementsByType = await client.inventoryMovement.groupBy({
      by: ['movementType'],
      _count: { movementType: true },
      _sum: { quantity: true },
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    // Valor total del inventario
    const totalInventoryValue = products
      .filter(p => p.trackInventory)
      .reduce((sum, p) => sum + p.stockQuantity, 0);

    // Productos más movidos en los últimos 30 días
    const topMovedProducts = await client.inventoryMovement.groupBy({
      by: ['productId'],
      _count: { productId: true },
      _sum: { quantity: true },
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: {
        _count: {
          productId: 'desc',
        },
      },
      take: 10,
    });

    return {
      totalProducts,
      trackedProducts,
      untrackedProducts: totalProducts - trackedProducts,
      lowStockProducts,
      outOfStockProducts,
      totalInventoryValue,
      movementsByType: movementsByType.reduce((acc, item) => {
        acc[item.movementType] = {
          count: item._count.movementType,
          totalQuantity: Number(item._sum.quantity) || 0,
        };
        return acc;
      }, {}),
      topMovedProducts: topMovedProducts.map((item) => ({
        productId: item.productId,
        movementCount: item._count.productId,
        totalQuantity: Number(item._sum.quantity) || 0,
      })),
    };
  }

  async getLowStockProducts(limit = 20): Promise<any[]> {
    const client = await this.prisma.getTenantClient();
    const products = await client.product.findMany({
      where: {
        trackInventory: true,
        isActive: true,
      },
      take: limit,
      orderBy: { stockQuantity: 'asc' },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Filtrar productos con stock bajo
    const lowStockProducts = products.filter(product => 
      product.stockQuantity > 0 && 
      product.stockMin !== null && 
      product.stockQuantity <= product.stockMin
    );

    return lowStockProducts.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      currentStock: product.stockQuantity,
      minStock: product.stockMin,
      stockUnit: product.stockUnit,
      category: product.category,
      imageUrl: product.imageUrl,
    }));
  }

  async getOutOfStockProducts(limit = 20): Promise<any[]> {
    const client = await this.prisma.getTenantClient();
    const products = await client.product.findMany({
      where: {
        trackInventory: true,
        isActive: true,
        stockQuantity: 0,
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      stockUnit: product.stockUnit,
      category: product.category,
      imageUrl: product.imageUrl,
      lastUpdated: product.updatedAt,
    }));
  }

  async getInventoryValuation(): Promise<any> {
    const client = await this.prisma.getTenantClient();
    const products = await client.product.findMany({
      where: {
        trackInventory: true,
        isActive: true,
        stockQuantity: { gt: 0 },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stockQuantity: true,
        cost: true,
        price: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    let totalCostValue = 0;
    let totalRetailValue = 0;

    const valuationByCategory = {};

    products.forEach((product) => {
      const costValue = product.cost ? Number(product.cost) * product.stockQuantity : 0;
      const retailValue = Number(product.price) * product.stockQuantity;

      totalCostValue += costValue;
      totalRetailValue += retailValue;

      const categoryName = product.category?.name || 'Uncategorized';
      if (!valuationByCategory[categoryName]) {
        valuationByCategory[categoryName] = {
          costValue: 0,
          retailValue: 0,
          productCount: 0,
        };
      }

      valuationByCategory[categoryName].costValue += costValue;
      valuationByCategory[categoryName].retailValue += retailValue;
      valuationByCategory[categoryName].productCount += 1;
    });

    return {
      totalCostValue,
      totalRetailValue,
      potentialProfit: totalRetailValue - totalCostValue,
      profitMargin: totalRetailValue > 0 ? ((totalRetailValue - totalCostValue) / totalRetailValue) * 100 : 0,
      valuationByCategory,
      totalProducts: products.length,
    };
  }

  private mapMovementToResponseDto(movement: any): InventoryMovementResponseDto {
    return {
      id: movement.id,
      productId: movement.productId,
      product: movement.product ? {
        id: movement.product.id,
        name: movement.product.name,
        sku: movement.product.sku,
        imageUrl: movement.product.imageUrl,
      } : undefined,
      productVariantId: movement.productVariantId,
      productVariant: movement.productVariant ? {
        id: movement.productVariant.id,
        name: movement.productVariant.name,
        sku: movement.productVariant.sku,
      } : undefined,
      movementType: movement.movementType,
      quantity: Number(movement.quantity),
      previousQuantity: movement.previousQuantity ? Number(movement.previousQuantity) : undefined,
      newQuantity: movement.newQuantity ? Number(movement.newQuantity) : undefined,
      referenceType: movement.referenceType,
      referenceId: movement.referenceId,
      reason: movement.reason,
      costPerUnit: movement.costPerUnit ? Number(movement.costPerUnit) : undefined,
      totalCost: movement.totalCost ? Number(movement.totalCost) : undefined,
      createdBy: movement.createdByUser ? {
        id: movement.createdByUser.id,
        firstName: movement.createdByUser.firstName,
        lastName: movement.createdByUser.lastName,
        email: movement.createdByUser.email,
      } : undefined,
      createdAt: movement.createdAt,
    };
  }
}