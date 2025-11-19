import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant/services/tenant-prisma.service';
import { DataScopeService } from '../tenant/services/data-scope.service';
import { BusinessEventEmitterService } from '../common/events/event-emitter.service';
import { BusinessEventTypes } from '../common/events/business-events';
import { CreateOrderDto, OrderStatus } from './dto/create-order.dto';
import { UpdateOrderDto, UpdateOrderStatusDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: TenantPrismaService,
    private readonly dataScope: DataScopeService,
    private readonly eventEmitter: BusinessEventEmitterService,
  ) {}

  async create(createOrderDto: CreateOrderDto, userId: string) {
    const client = await this.prisma.getTenantClient();

    // Generar número de orden único
    const orderNumber = await this.generateOrderNumber();

    // Calcular totales
    const { subtotal, taxAmount, total } = this.calculateOrderTotals(createOrderDto);

    const order = await client.$transaction(async (tx) => {
      // Crear la orden
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId: createOrderDto.customerId,
          type: createOrderDto.type,
          status: OrderStatus.PENDING,
          subtotal,
          discountAmount: createOrderDto.discountAmount || 0,
          taxAmount,
          total,
          paymentMethod: createOrderDto.paymentMethod,
          scheduledDate: createOrderDto.scheduledDate ? new Date(createOrderDto.scheduledDate) : null,
          scheduledTimeStart: createOrderDto.scheduledTimeStart || null,
          scheduledTimeEnd: createOrderDto.scheduledTimeEnd || null,
          serviceAddress: createOrderDto.serviceAddress,
          serviceCity: createOrderDto.serviceCity,
          serviceLatitude: createOrderDto.serviceLatitude,
          serviceLongitude: createOrderDto.serviceLongitude,
          assignedTo: createOrderDto.assignedTo,
          customerNotes: createOrderDto.customerNotes,
          internalNotes: createOrderDto.internalNotes,
          createdBy: userId,
        },
        include: {
          customer: true,
          assignedToUser: true,
        },
      });

      // Crear los items de la orden
      const orderItems = await Promise.all(
        createOrderDto.items.map((item) => {
          const itemSubtotal = item.quantity * item.unitPrice;
          const itemDiscount = itemSubtotal * ((item.discountPercentage || 0) / 100);
          const itemTaxableAmount = itemSubtotal - itemDiscount;
          const itemTax = itemTaxableAmount * ((item.taxRate || 0) / 100);
          const itemTotal = itemTaxableAmount + itemTax;

          return tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              productId: item.productId,
              productVariantId: item.productVariantId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountPercentage: item.discountPercentage || 0,
              taxRate: item.taxRate || 0,
              subtotal: itemSubtotal,
              total: itemTotal,
            },
          });
        }),
      );

      // Actualizar inventario si es necesario
      await this.updateInventoryForOrder(tx, orderItems, 'out');

      return { ...newOrder, items: orderItems };
    });

    // Emitir evento para generar tareas automáticamente
    await this.eventEmitter.emit(BusinessEventTypes.ORDER_CREATED, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderType: order.type,
      customerId: order.customerId,
      assignedTo: order.assignedTo,
      scheduledDate: order.scheduledDate,
      serviceLocation: {
        address: order.serviceAddress,
        latitude: order.serviceLatitude,
        longitude: order.serviceLongitude,
      },
      items: createOrderDto.items,
      total: order.total,
      createdBy: userId,
      timestamp: new Date(),
    });

    return order;
  }

  /**
   * Find orders with filters and pagination
   * Automatically applies data scope based on user permissions
   */
  async findAll(
    filters?: {
      status?: OrderStatus;
      customerId?: string;
      assignedTo?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    },
    userId?: string,
    userPermissions?: string[],
  ) {
    const client = await this.prisma.getTenantClient();
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    // Build user filters
    const userFilters: any = {};

    if (filters?.status) {
      userFilters.status = filters.status;
    }

    if (filters?.customerId) {
      userFilters.customerId = filters.customerId;
    }

    if (filters?.assignedTo) {
      userFilters.assignedTo = filters.assignedTo;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      userFilters.createdAt = {};
      if (filters.dateFrom) {
        userFilters.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        userFilters.createdAt.lte = new Date(filters.dateTo);
      }
    }

    // Apply data scope based on user permissions
    // This automatically filters to show only user's own orders if they don't have 'view_all'
    const scopeFilter = userId && userPermissions
      ? this.dataScope.getOrderScope(userPermissions, userId, userFilters)
      : userFilters;

    const [orders, total] = await Promise.all([
      client.order.findMany({
        where: scopeFilter as any,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              email: true,
              phone: true,
            },
          },
          assignedToUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                },
              },
            },
          },
          payments: true,
          tasks: {
            select: {
              id: true,
              title: true,
              status: true,
              assignedTo: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      client.order.count({ where: scopeFilter as any }),
    ]);

    return {
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const client = await this.prisma.getTenantClient();

    const order = await client.order.findUnique({
      where: { id },
      include: {
        customer: true,
        assignedToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        items: {
          include: {
            product: true,
            productVariant: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        tasks: {
          include: {
            assignedToUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto, userId: string) {
    const client = await this.prisma.getTenantClient();

    const existingOrder = await client.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingOrder) {
      throw new NotFoundException('Order not found');
    }

    // Validar transiciones de estado
    if (updateOrderDto.status) {
      this.validateStatusTransition(existingOrder.status as OrderStatus, updateOrderDto.status);
    }

    const updatedOrder = await client.$transaction(async (tx) => {
      // Si se están actualizando los items, recalcular totales
      let updateData: any = { ...updateOrderDto };

      if (updateOrderDto.items) {
        const { subtotal, taxAmount, total } = this.calculateOrderTotals(updateOrderDto as CreateOrderDto);
        updateData = {
          ...updateData,
          subtotal,
          taxAmount,
          total,
        };

        // Revertir inventario de la orden original
        await this.updateInventoryForOrder(tx, existingOrder.items, 'in');

        // Eliminar items existentes
        await tx.orderItem.deleteMany({
          where: { orderId: id },
        });

        // Crear nuevos items
        const newItems = await Promise.all(
          updateOrderDto.items.map((item) => {
            const itemSubtotal = item.quantity * item.unitPrice;
            const itemDiscount = itemSubtotal * ((item.discountPercentage || 0) / 100);
            const itemTaxableAmount = itemSubtotal - itemDiscount;
            const itemTax = itemTaxableAmount * ((item.taxRate || 0) / 100);
            const itemTotal = itemTaxableAmount + itemTax;

            return tx.orderItem.create({
              data: {
                orderId: id,
                productId: item.productId,
                productVariantId: item.productVariantId,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discountPercentage: item.discountPercentage || 0,
                taxRate: item.taxRate || 0,
                subtotal: itemSubtotal,
                total: itemTotal,
              },
            });
          }),
        );

        // Actualizar inventario con nuevos items
        await this.updateInventoryForOrder(tx, newItems, 'out');
      }

      // Actualizar la orden
      const order = await tx.order.update({
        where: { id },
        data: updateData,
        include: {
          customer: true,
          assignedToUser: true,
          items: true,
        },
      });

      return order;
    });

    // Emitir evento si cambió el estado
    if (updateOrderDto.status && updateOrderDto.status !== existingOrder.status) {
      await this.eventEmitter.emit(BusinessEventTypes.ORDER_STATUS_CHANGED, {
        orderId: id,
        orderNumber: updatedOrder.orderNumber,
        oldStatus: existingOrder.status,
        newStatus: updateOrderDto.status,
        customerId: updatedOrder.customerId,
        assignedTo: updatedOrder.assignedTo,
        userId,
        timestamp: new Date(),
      });
    }

    return updatedOrder;
  }

  async updateStatus(id: string, updateStatusDto: UpdateOrderStatusDto, userId: string) {
    const client = await this.prisma.getTenantClient();

    const order = await client.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    this.validateStatusTransition(order.status as OrderStatus, updateStatusDto.status);

    const updateData: any = {
      status: updateStatusDto.status,
    };

    // Agregar timestamps específicos según el estado
    if (updateStatusDto.status === OrderStatus.IN_PROGRESS) {
      updateData.startedAt = new Date();
    } else if (updateStatusDto.status === OrderStatus.COMPLETED) {
      updateData.completedAt = new Date();
    } else if (updateStatusDto.status === OrderStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
      updateData.cancellationReason = updateStatusDto.reason;
    }

    const updatedOrder = await client.order.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        assignedToUser: true,
      },
    });

    // Emitir evento
    await this.eventEmitter.emit(BusinessEventTypes.ORDER_STATUS_CHANGED, {
      orderId: id,
      orderNumber: updatedOrder.orderNumber,
      oldStatus: order.status,
      newStatus: updateStatusDto.status,
      customerId: updatedOrder.customerId,
      assignedTo: updatedOrder.assignedTo,
      reason: updateStatusDto.reason,
      userId,
      timestamp: new Date(),
    });

    return updatedOrder;
  }

  async remove(id: string) {
    const client = await this.prisma.getTenantClient();

    const order = await client.order.findUnique({
      where: { id },
      include: { items: true, payments: true, tasks: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Validar que se puede eliminar
    if (order.status === OrderStatus.IN_PROGRESS || order.status === OrderStatus.COMPLETED) {
      throw new BadRequestException('Cannot delete order in progress or completed');
    }

    if (order.payments.length > 0) {
      throw new BadRequestException('Cannot delete order with payments');
    }

    if (order.tasks.length > 0) {
      throw new BadRequestException('Cannot delete order with associated tasks');
    }

    await client.$transaction(async (tx) => {
      // Revertir inventario
      await this.updateInventoryForOrder(tx, order.items, 'in');

      // Eliminar orden (cascade eliminará items)
      await tx.order.delete({
        where: { id },
      });
    });

    return { message: 'Order deleted successfully' };
  }

  async getStatistics(filters?: { dateFrom?: string; dateTo?: string; assignedTo?: string }) {
    const client = await this.prisma.getTenantClient();

    const where: any = {};
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }
    if (filters?.assignedTo) {
      where.assignedTo = filters.assignedTo;
    }

    const [
      totalOrders,
      totalRevenue,
      averageOrderValue,
      completedOrders,
      pendingOrders,
      cancelledOrders,
    ] = await Promise.all([
      client.order.count({ where }),
      client.order.aggregate({
        where: { ...where, status: { not: OrderStatus.CANCELLED } },
        _sum: { total: true },
      }),
      client.order.aggregate({
        where: { ...where, status: { not: OrderStatus.CANCELLED } },
        _avg: { total: true },
      }),
      client.order.count({ where: { ...where, status: OrderStatus.COMPLETED } }),
      client.order.count({ where: { ...where, status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED] } } }),
      client.order.count({ where: { ...where, status: OrderStatus.CANCELLED } }),
    ]);

    return {
      totalOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      averageOrderValue: averageOrderValue._avg.total || 0,
      completedOrders,
      pendingOrders,
      cancelledOrders,
      completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
    };
  }

  async getOrdersByStatus(filters?: { dateFrom?: string; dateTo?: string; assignedTo?: string }) {
    const client = await this.prisma.getTenantClient();

    const where: any = {};
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }
    if (filters?.assignedTo) {
      where.assignedTo = filters.assignedTo;
    }

    const statusCounts = await client.order.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
      _sum: { total: true },
    });

    return statusCounts.map(item => ({
      status: item.status,
      count: item._count.status,
      totalValue: item._sum.total || 0,
    }));
  }

  async getRevenueStatistics(filters?: { 
    dateFrom?: string; 
    dateTo?: string; 
    groupBy?: 'day' | 'week' | 'month';
    assignedTo?: string;
  }) {
    const client = await this.prisma.getTenantClient();
    const groupBy = filters?.groupBy || 'day';

    const where: any = {
      status: { not: OrderStatus.CANCELLED },
    };

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }

    // Use raw query for date grouping
    let dateFormat: string;
    switch (groupBy) {
      case 'week':
        dateFormat = 'YYYY-"W"WW';
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        break;
      default:
        dateFormat = 'YYYY-MM-DD';
    }

    // Build WHERE conditions dynamically
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    conditions.push(`status != $${paramIndex}`);
    params.push(OrderStatus.CANCELLED);
    paramIndex++;

    if (filters?.dateFrom) {
      conditions.push(`created_at >= $${paramIndex}::timestamp`);
      params.push(new Date(filters.dateFrom));
      paramIndex++;
    }

    if (filters?.dateTo) {
      conditions.push(`created_at <= $${paramIndex}::timestamp`);
      params.push(new Date(filters.dateTo));
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // dateFormat is a safe, predefined string (only predefined values), so we can safely interpolate it
    const query = `
      SELECT 
        TO_CHAR(created_at, '${dateFormat}') as period,
        COUNT(*)::int as order_count,
        SUM(total)::decimal as total_revenue,
        AVG(total)::decimal as avg_order_value
      FROM orders 
      WHERE ${whereClause}
      GROUP BY TO_CHAR(created_at, '${dateFormat}')
      ORDER BY period ASC
    `;

    const results = await client.$queryRawUnsafe(query, ...params) as Array<{
      period: string;
      order_count: number;
      total_revenue: number;
      avg_order_value: number;
    }>;

    return results;
  }

  async duplicate(id: string, userId: string) {
    const client = await this.prisma.getTenantClient();

    const originalOrder = await client.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!originalOrder) {
      throw new NotFoundException('Order not found');
    }

    // Create new order based on original
    const createOrderDto: CreateOrderDto = {
      customerId: originalOrder.customerId,
      type: originalOrder.type as any,
      items: originalOrder.items.map(item => ({
        productId: item.productId || undefined,
        productVariantId: item.productVariantId || undefined,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discountPercentage: Number(item.discountPercentage),
        taxRate: Number(item.taxRate),
      })),
      paymentMethod: originalOrder.paymentMethod as any,
      serviceAddress: originalOrder.serviceAddress || undefined,
      serviceCity: originalOrder.serviceCity || undefined,
      serviceLatitude: originalOrder.serviceLatitude ? Number(originalOrder.serviceLatitude) : undefined,
      serviceLongitude: originalOrder.serviceLongitude ? Number(originalOrder.serviceLongitude) : undefined,
      assignedTo: originalOrder.assignedTo || undefined,
      customerNotes: originalOrder.customerNotes || undefined,
      internalNotes: `Duplicated from order ${originalOrder.orderNumber}`,
      discountAmount: Number(originalOrder.discountAmount),
    };

    return this.create(createOrderDto, userId);
  }

  async bulkAssign(orderIds: string[], assignedTo: string, userId: string) {
    const client = await this.prisma.getTenantClient();

    // Verify all orders exist and can be assigned
    const orders = await client.order.findMany({
      where: { 
        id: { in: orderIds },
        status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED] }
      },
    });

    if (orders.length !== orderIds.length) {
      throw new BadRequestException('Some orders not found or cannot be assigned');
    }

    // Verify technician exists
    const technician = await client.user.findUnique({
      where: { id: assignedTo },
    });

    if (!technician) {
      throw new BadRequestException('Technician not found');
    }

    const updatedOrders = await client.order.updateMany({
      where: { id: { in: orderIds } },
      data: { assignedTo },
    });

    // Emit events for each order
    for (const order of orders) {
      await this.eventEmitter.emit(BusinessEventTypes.ORDER_ASSIGNED, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        assignedTo,
        customerId: order.customerId,
        userId,
        timestamp: new Date(),
      });
    }

    return {
      message: `${updatedOrders.count} orders assigned successfully`,
      assignedCount: updatedOrders.count,
    };
  }

  async bulkUpdateStatus(orderIds: string[], status: OrderStatus, userId: string, reason?: string) {
    const client = await this.prisma.getTenantClient();

    // Verify all orders exist
    const orders = await client.order.findMany({
      where: { id: { in: orderIds } },
    });

    if (orders.length !== orderIds.length) {
      throw new BadRequestException('Some orders not found');
    }

    // Validate status transitions for each order
    for (const order of orders) {
      this.validateStatusTransition(order.status as OrderStatus, status);
    }

    const updateData: any = { status };

    // Add timestamps based on status
    if (status === OrderStatus.IN_PROGRESS) {
      updateData.startedAt = new Date();
    } else if (status === OrderStatus.COMPLETED) {
      updateData.completedAt = new Date();
    } else if (status === OrderStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
      if (reason) {
        updateData.cancellationReason = reason;
      }
    }

    const updatedOrders = await client.order.updateMany({
      where: { id: { in: orderIds } },
      data: updateData,
    });

    // Emit events for each order
    for (const order of orders) {
      await this.eventEmitter.emit(BusinessEventTypes.ORDER_STATUS_CHANGED, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        oldStatus: order.status,
        newStatus: status,
        customerId: order.customerId,
        assignedTo: order.assignedTo,
        reason,
        userId,
        timestamp: new Date(),
      });
    }

    return {
      message: `${updatedOrders.count} orders updated successfully`,
      updatedCount: updatedOrders.count,
    };
  }

  private async generateOrderNumber(): Promise<string> {
    const client = await this.prisma.getTenantClient();
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    const lastOrder = await client.order.findFirst({
      where: {
        orderNumber: {
          startsWith: `ORD-${dateStr}`,
        },
      },
      orderBy: { orderNumber: 'desc' },
    });

    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.orderNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    return `ORD-${dateStr}-${sequence.toString().padStart(6, '0')}`;
  }

  private calculateOrderTotals(orderDto: CreateOrderDto) {
    let subtotal = 0;
    let taxAmount = 0;

    orderDto.items.forEach((item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemDiscount = itemSubtotal * ((item.discountPercentage || 0) / 100);
      const itemTaxableAmount = itemSubtotal - itemDiscount;
      const itemTax = itemTaxableAmount * ((item.taxRate || 0) / 100);

      subtotal += itemSubtotal;
      taxAmount += itemTax;
    });

    const discountAmount = orderDto.discountAmount || 0;
    const total = subtotal - discountAmount + taxAmount;

    return { subtotal, taxAmount, total };
  }

  private validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus) {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.IN_PROGRESS, OrderStatus.CANCELLED],
      [OrderStatus.IN_PROGRESS]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
      [OrderStatus.COMPLETED]: [], // No transitions from completed
      [OrderStatus.CANCELLED]: [], // No transitions from cancelled
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  private async updateInventoryForOrder(tx: any, items: any[], direction: 'in' | 'out') {
    for (const item of items) {
      if (item.productId) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (product && product.trackInventory) {
          const quantityChange = direction === 'out' ? -item.quantity : item.quantity;

          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: {
                increment: quantityChange,
              },
            },
          });

          // Registrar movimiento de inventario
          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              productVariantId: item.productVariantId,
              movementType: direction === 'out' ? 'out' : 'in',
              quantity: Math.abs(quantityChange),
              referenceType: 'order',
              referenceId: item.orderId,
              reason: direction === 'out' ? 'Order created' : 'Order cancelled/updated',
            },
          });
        }
      }
    }
  }
}