import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TenantPrismaService } from '../tenant/services/tenant-prisma.service';
import { CreatePaymentDto, PaymentStatus, RefundPaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: TenantPrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createPaymentDto: CreatePaymentDto, userId: string) {
    const client = await this.prisma.getTenantClient();

    // Verificar que la orden existe
    const order = await client.order.findUnique({
      where: { id: createPaymentDto.orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Calcular el monto ya pagado
    const paidAmount = order.payments
      .filter(p => p.status === PaymentStatus.COMPLETED)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // Validar que no se exceda el total de la orden
    if (paidAmount + createPaymentDto.amount > Number(order.total)) {
      throw new BadRequestException('Payment amount exceeds order total');
    }

    // Generar número de pago único
    const paymentNumber = await this.generatePaymentNumber();

    const payment = await client.$transaction(async (tx) => {
      // Crear el pago
      const newPayment = await tx.payment.create({
        data: {
          paymentNumber,
          orderId: createPaymentDto.orderId,
          amount: createPaymentDto.amount,
          paymentMethod: createPaymentDto.paymentMethod,
          status: PaymentStatus.COMPLETED,
          transactionId: createPaymentDto.transactionId,
          referenceNumber: createPaymentDto.referenceNumber,
          paymentDate: new Date(createPaymentDto.paymentDate),
          notes: createPaymentDto.notes,
          createdBy: userId,
        },
      });

      // Actualizar el estado de pago de la orden
      const newPaidAmount = paidAmount + createPaymentDto.amount;
      let paymentStatus = 'pending';

      if (newPaidAmount >= Number(order.total)) {
        paymentStatus = 'paid';
      } else if (newPaidAmount > 0) {
        paymentStatus = 'partial';
      }

      await tx.order.update({
        where: { id: createPaymentDto.orderId },
        data: {
          paymentStatus,
          paidAmount: newPaidAmount,
        },
      });

      return newPayment;
    });

    // Emitir evento
    this.eventEmitter.emit('payment.created', {
      paymentId: payment.id,
      orderId: payment.orderId,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      userId,
    });

    return payment;
  }

  async findByOrder(orderId: string) {
    const client = await this.prisma.getTenantClient();

    const payments = await client.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return payments;
  }

  async findOne(id: string) {
    const client = await this.prisma.getTenantClient();

    const payment = await client.payment.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                companyName: true,
              },
            },
          },
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async refund(id: string, refundDto: RefundPaymentDto, userId: string) {
    const client = await this.prisma.getTenantClient();

    const payment = await client.payment.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Can only refund completed payments');
    }

    if (refundDto.amount > Number(payment.amount) - Number(payment.refundedAmount)) {
      throw new BadRequestException('Refund amount exceeds available amount');
    }

    const updatedPayment = await client.$transaction(async (tx) => {
      // Actualizar el pago
      const newRefundedAmount = Number(payment.refundedAmount) + refundDto.amount;
      const newStatus = newRefundedAmount >= Number(payment.amount) 
        ? PaymentStatus.REFUNDED 
        : PaymentStatus.COMPLETED;

      const updated = await tx.payment.update({
        where: { id },
        data: {
          refundedAmount: newRefundedAmount,
          status: newStatus,
          refundedAt: new Date(),
          refundReason: refundDto.reason,
        },
      });

      // Actualizar el estado de pago de la orden
      const orderPayments = await tx.payment.findMany({
        where: { 
          orderId: payment.orderId,
          status: { in: [PaymentStatus.COMPLETED, PaymentStatus.REFUNDED] }
        },
      });

      const totalPaid = orderPayments.reduce((sum, p) => sum + (Number(p.amount) - Number(p.refundedAmount)), 0);
      
      let paymentStatus = 'pending';
      if (totalPaid >= Number(payment.order.total)) {
        paymentStatus = 'paid';
      } else if (totalPaid > 0) {
        paymentStatus = 'partial';
      }

      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus,
          paidAmount: totalPaid,
        },
      });

      return updated;
    });

    // Emitir evento
    this.eventEmitter.emit('payment.refunded', {
      paymentId: id,
      orderId: payment.orderId,
      refundAmount: refundDto.amount,
      reason: refundDto.reason,
      userId,
    });

    return updatedPayment;
  }

  async getPaymentSummary(orderId: string) {
    const client = await this.prisma.getTenantClient();

    const order = await client.order.findUnique({
      where: { id: orderId },
      include: {
        payments: {
          where: {
            status: { in: [PaymentStatus.COMPLETED, PaymentStatus.REFUNDED] }
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const totalPaid = order.payments.reduce((sum, p) => sum + (Number(p.amount) - Number(p.refundedAmount)), 0);
    const totalRefunded = order.payments.reduce((sum, p) => sum + Number(p.refundedAmount), 0);
    const remainingBalance = Number(order.total) - totalPaid;

    return {
      orderTotal: order.total,
      totalPaid,
      totalRefunded,
      remainingBalance,
      paymentStatus: order.paymentStatus,
      payments: order.payments,
    };
  }

  private async generatePaymentNumber(): Promise<string> {
    const client = await this.prisma.getTenantClient();
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    const lastPayment = await client.payment.findFirst({
      where: {
        paymentNumber: {
          startsWith: `PAY-${dateStr}`,
        },
      },
      orderBy: { paymentNumber: 'desc' },
    });

    let sequence = 1;
    if (lastPayment) {
      const lastSequence = parseInt(lastPayment.paymentNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    return `PAY-${dateStr}-${sequence.toString().padStart(6, '0')}`;
  }

  async getPaymentStatistics(filters?: { dateFrom?: string; dateTo?: string }) {
    const client = await this.prisma.getTenantClient();

    const where: any = {};
    if (filters?.dateFrom || filters?.dateTo) {
      where.paymentDate = {};
      if (filters.dateFrom) {
        where.paymentDate.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.paymentDate.lte = new Date(filters.dateTo);
      }
    }

    const [
      totalPayments,
      totalAmount,
      totalRefunded,
      completedPayments,
      pendingPayments,
      failedPayments,
    ] = await Promise.all([
      client.payment.count({ where }),
      client.payment.aggregate({
        where: { ...where, status: PaymentStatus.COMPLETED },
        _sum: { amount: true },
      }),
      client.payment.aggregate({
        where,
        _sum: { refundedAmount: true },
      }),
      client.payment.count({ where: { ...where, status: PaymentStatus.COMPLETED } }),
      client.payment.count({ where: { ...where, status: PaymentStatus.PENDING } }),
      client.payment.count({ where: { ...where, status: PaymentStatus.FAILED } }),
    ]);

    return {
      totalPayments,
      totalAmount: Number(totalAmount._sum.amount) || 0,
      totalRefunded: Number(totalRefunded._sum.refundedAmount) || 0,
      netAmount: (Number(totalAmount._sum.amount) || 0) - (Number(totalRefunded._sum.refundedAmount) || 0),
      completedPayments,
      pendingPayments,
      failedPayments,
      successRate: totalPayments > 0 ? (completedPayments / totalPayments) * 100 : 0,
    };
  }

  async getPaymentsByMethod(filters?: { dateFrom?: string; dateTo?: string }) {
    const client = await this.prisma.getTenantClient();

    const where: any = {};
    if (filters?.dateFrom || filters?.dateTo) {
      where.paymentDate = {};
      if (filters.dateFrom) {
        where.paymentDate.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.paymentDate.lte = new Date(filters.dateTo);
      }
    }

    const methodStats = await client.payment.groupBy({
      by: ['paymentMethod'],
      where: { ...where, status: PaymentStatus.COMPLETED },
      _count: { paymentMethod: true },
      _sum: { amount: true },
    });

    return methodStats.map(item => ({
      paymentMethod: item.paymentMethod,
      count: item._count.paymentMethod,
      totalAmount: item._sum.amount || 0,
    }));
  }

  async getPendingPaymentOrders(filters?: { page?: number; limit?: number }) {
    const client = await this.prisma.getTenantClient();
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      client.order.findMany({
        where: {
          paymentStatus: { in: ['pending', 'partial'] },
          status: { not: 'cancelled' },
        },
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
          payments: {
            where: { status: PaymentStatus.COMPLETED },
            select: {
              amount: true,
              paymentDate: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      client.order.count({
        where: {
          paymentStatus: { in: ['pending', 'partial'] },
          status: { not: 'cancelled' },
        },
      }),
    ]);

    const ordersWithBalance = orders.map(order => {
      const paidAmount = order.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const remainingBalance = Number(order.total) - paidAmount;

      return {
        ...order,
        paidAmount,
        remainingBalance,
      };
    });

    return {
      data: ordersWithBalance,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}