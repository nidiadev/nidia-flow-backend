import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import {
  StockAlertFilterDto,
  StockAlertResponseDto,
  StockAlertStatsDto,
  CreateStockAlertDto,
} from '../../dto/products/stock-alert.dto';

@Injectable()
export class StockAlertService {
  constructor(private readonly prisma: TenantPrismaService) {}

  async createAlert(createAlertDto: CreateStockAlertDto): Promise<StockAlertResponseDto> {
    const { productId, alertType, currentStock, thresholdStock } = createAlertDto;
    const client = await this.prisma.getTenantClient();

    // Verificar que el producto existe
    const product = await client.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Verificar si ya existe una alerta activa para este producto y tipo
    const existingAlert = await client.stockAlert.findFirst({
      where: {
        productId,
        alertType,
        isResolved: false,
      },
    });

    if (existingAlert) {
      // Actualizar la alerta existente
      const updatedAlert = await client.stockAlert.update({
        where: { id: existingAlert.id },
        data: {
          currentQuantity: currentStock,
          thresholdQuantity: thresholdStock,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              imageUrl: true,
              stockUnit: true,
            },
          },
        },
      });

      return this.mapToResponseDto(updatedAlert);
    }

    // Crear nueva alerta
    const alert = await client.stockAlert.create({
      data: {
        productId,
        alertType,
        currentQuantity: currentStock,
        thresholdQuantity: thresholdStock,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            imageUrl: true,
            stockUnit: true,
          },
        },
      },
    });

    return this.mapToResponseDto(alert);
  }

  async findMany(filterDto: StockAlertFilterDto): Promise<{ data: StockAlertResponseDto[]; pagination: any }> {
    const {
      page = 1,
      limit = 20,
      productId,
      alertType,
      status,
      isNotified,
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

    if (alertType) {
      where.alertType = alertType;
    }

    // Mapear status a isResolved
    if (status) {
      if (status === 'active') {
        where.isResolved = false;
      } else if (status === 'resolved') {
        where.isResolved = true;
      }
    }

    // Ejecutar consultas
    const [alerts, total] = await Promise.all([
      client.stockAlert.findMany({
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
              stockUnit: true,
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      client.stockAlert.count({ where }),
    ]);

    const data = alerts.map((alert) => this.mapToResponseDto(alert));

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

  async findById(id: string): Promise<StockAlertResponseDto> {
    const client = await this.prisma.getTenantClient();
    const alert = await client.stockAlert.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            imageUrl: true,
            stockUnit: true,
            stockQuantity: true,
            stockMin: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!alert) {
      throw new NotFoundException('Stock alert not found');
    }

    return this.mapToResponseDto(alert);
  }

  async resolveAlert(id: string): Promise<StockAlertResponseDto> {
    const client = await this.prisma.getTenantClient();
    const alert = await client.stockAlert.findUnique({
      where: { id },
    });

    if (!alert) {
      throw new NotFoundException('Stock alert not found');
    }

    const updatedAlert = await client.stockAlert.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            imageUrl: true,
            stockUnit: true,
          },
        },
      },
    });

    return this.mapToResponseDto(updatedAlert);
  }

  async getActiveAlerts(limit = 50): Promise<StockAlertResponseDto[]> {
    const client = await this.prisma.getTenantClient();
    const alerts = await client.stockAlert.findMany({
      where: {
        isResolved: false,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            imageUrl: true,
            stockUnit: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return alerts.map((alert) => this.mapToResponseDto(alert));
  }

  async getStats(): Promise<StockAlertStatsDto> {
    const client = await this.prisma.getTenantClient();
    const [totalAlerts, activeAlerts, resolvedAlerts] = await Promise.all([
      client.stockAlert.count(),
      client.stockAlert.count({ where: { isResolved: false } }),
      client.stockAlert.count({ where: { isResolved: true } }),
    ]);

    const alertsByType = await client.stockAlert.groupBy({
      by: ['alertType'],
      _count: { alertType: true },
      where: { isResolved: false },
    });

    const alertsByProduct = await client.stockAlert.groupBy({
      by: ['productId'],
      _count: { productId: true },
      where: { isResolved: false },
      orderBy: {
        _count: {
          productId: 'desc',
        },
      },
      take: 10,
    });

    return {
      totalAlerts,
      activeAlerts,
      acknowledgedAlerts: 0, // No hay campo para acknowledged en el esquema actual
      resolvedAlerts,
      unnotifiedAlerts: 0, // No hay campo para notified en el esquema actual
      alertsByType: alertsByType.reduce((acc, item) => {
        if (item.alertType) {
          acc[item.alertType] = item._count.alertType;
        }
        return acc;
      }, {}),
      topAlertsProducts: alertsByProduct.map((item) => ({
        productId: item.productId,
        alertCount: item._count.productId,
      })),
    };
  }

  async checkAndCreateAlerts(): Promise<void> {
    const client = await this.prisma.getTenantClient();
    // Buscar productos con stock bajo usando una consulta más simple
    const products = await client.product.findMany({
      where: {
        trackInventory: true,
        isActive: true,
      },
      select: {
        id: true,
        stockQuantity: true,
        stockMin: true,
      },
    });

    // Filtrar productos con stock bajo
    const lowStockProducts = products.filter(
      (product) => product.stockQuantity > 0 && product.stockQuantity <= (product.stockMin || 0)
    );

    // Filtrar productos sin stock
    const outOfStockProducts = products.filter(
      (product) => product.stockQuantity === 0
    );

    // Crear alertas para productos con stock bajo
    for (const product of lowStockProducts) {
      await this.createAlert({
        productId: product.id,
        alertType: 'low_stock',
        currentStock: product.stockQuantity,
        thresholdStock: product.stockMin || 0,
      });
    }

    // Crear alertas para productos sin stock
    for (const product of outOfStockProducts) {
      await this.createAlert({
        productId: product.id,
        alertType: 'out_of_stock',
        currentStock: 0,
        thresholdStock: product.stockMin || 0,
      });
    }
  }

  async bulkResolve(alertIds: string[]): Promise<void> {
    const client = await this.prisma.getTenantClient();
    await client.stockAlert.updateMany({
      where: {
        id: { in: alertIds },
        isResolved: false,
      },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
      },
    });
  }

  private mapToResponseDto(alert: any): StockAlertResponseDto {
    return {
      id: alert.id,
      productId: alert.productId,
      product: alert.product ? {
        id: alert.product.id,
        name: alert.product.name,
        sku: alert.product.sku,
        imageUrl: alert.product.imageUrl,
        stockUnit: alert.product.stockUnit,
        currentStock: alert.product.stockQuantity,
        minStock: alert.product.stockMin,
        category: alert.product.category,
      } : undefined,
      alertType: alert.alertType,
      currentStock: Number(alert.currentQuantity),
      thresholdStock: Number(alert.thresholdQuantity),
      status: alert.isResolved ? 'resolved' : 'active',
      acknowledgedAt: undefined, // No existe en el esquema actual
      acknowledgedBy: undefined, // No existe en el esquema actual
      resolvedAt: alert.resolvedAt,
      isNotified: false, // No existe en el esquema actual
      notifiedAt: undefined, // No existe en el esquema actual
      metadata: {},
      createdAt: alert.createdAt,
      updatedAt: alert.createdAt, // No hay updatedAt en el esquema actual
    };
  }
}