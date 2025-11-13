import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductFilterDto,
  ProductResponseDto,
  ProductStatsDto,
  ProductType,
} from '../../dto';

@Injectable()
export class ProductService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async create(createProductDto: CreateProductDto, createdBy: string): Promise<ProductResponseDto> {
    const { variants, comboItems, categoryId, ...productData } = createProductDto;
    const prisma = await this.tenantPrisma.getTenantClient();

    // Verificar que el SKU no existe
    const existingProduct = await prisma.product.findUnique({
      where: { sku: productData.sku },
    });

    if (existingProduct) {
      throw new ConflictException('Product with this SKU already exists');
    }

    // Verificar que la categoría existe si se especifica
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      if (!category.isActive) {
        throw new BadRequestException('Category is not active');
      }
    }

    // Validar productos del combo si es tipo combo
    if (productData.type === ProductType.COMBO && comboItems) {
      for (const comboItem of comboItems) {
        const product = await prisma.product.findUnique({
          where: { id: comboItem.productId },
        });

        if (!product) {
          throw new NotFoundException(`Product ${comboItem.productId} not found for combo`);
        }

        if (!product.isActive) {
          throw new BadRequestException(`Product ${product.name} is not active`);
        }

        if (product.type === ProductType.COMBO) {
          throw new BadRequestException('Cannot add combo products to another combo');
        }
      }
    }

    // Crear producto con variantes y combo items en transacción
    const product = await prisma.$transaction(async (tx) => {
      // Crear producto principal
      const newProduct = await tx.product.create({
        data: {
          ...productData,
          categoryId,
          createdBy,
        },
      });

      // Crear variantes si se especifican
      if (variants && variants.length > 0) {
        for (const variant of variants) {
          // Verificar que el SKU de la variante no existe
          if (variant.sku) {
            const existingVariant = await tx.productVariant.findUnique({
              where: { sku: variant.sku },
            });

            if (existingVariant) {
              throw new ConflictException(`Variant SKU ${variant.sku} already exists`);
            }
          }

          await tx.productVariant.create({
            data: {
              ...variant,
              productId: newProduct.id,
              sku: variant.sku || `${newProduct.sku}-${variant.name.replace(/\s+/g, '-').toLowerCase()}`,
            },
          });
        }
      }

      // Crear combo items si es tipo combo
      if (productData.type === ProductType.COMBO && comboItems && comboItems.length > 0) {
        for (const comboItem of comboItems) {
          await tx.comboItem.create({
            data: {
              comboId: newProduct.id,
              productId: comboItem.productId,
              quantity: comboItem.quantity,
            },
          });
        }
      }

      return newProduct;
    });

    return this.findById(product.id);
  }

  async findMany(filterDto: ProductFilterDto): Promise<{ data: ProductResponseDto[]; pagination: any }> {
    const {
      page = 1,
      limit = 20,
      search,
      type,
      categoryId,
      isActive,
      trackInventory,
      lowStock,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filterDto;

    const skip = (page - 1) * limit;
    const prisma = await this.tenantPrisma.getTenantClient();

    // Construir filtros
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (trackInventory !== undefined) {
      where.trackInventory = trackInventory;
    }

    if (lowStock) {
      where.AND = [
        { trackInventory: true },
        { stockQuantity: { lte: 5 } }, // Simplified low stock check
      ];
    }

    // Ejecutar consultas
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          variants: {
            where: { isActive: true },
            orderBy: { name: 'asc' },
          },
          comboItemsAsCombo: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  price: true,
                  imageUrl: true,
                },
              },
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
          _count: {
            select: {
              variants: { where: { isActive: true } },
              inventoryMovements: true,
              orderItems: true,
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const data = products.map((product) => this.mapToResponseDto(product));

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

  async findById(id: string): Promise<ProductResponseDto> {
    const prisma = await this.tenantPrisma.getTenantClient();
    
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        variants: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
        comboItemsAsCombo: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                imageUrl: true,
                stockQuantity: true,
                trackInventory: true,
              },
            },
          },
        },
        inventoryMovements: {
          take: 10,
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
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            variants: { where: { isActive: true } },
            inventoryMovements: true,
            orderItems: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.mapToResponseDto(product);
  }

  async getStats(): Promise<ProductStatsDto> {
    const prisma = await this.tenantPrisma.getTenantClient();
    
    const [totalProducts, activeProducts, lowStockProducts] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({
        where: {
          trackInventory: true,
          isActive: true,
          stockQuantity: { lte: 5 }, // Simplified low stock check
        },
      }),
    ]);

    const totalCategories = await prisma.category.count({ where: { isActive: true } });

    // Productos por tipo
    const productsByType = await prisma.product.groupBy({
      by: ['type'],
      _count: { type: true },
      where: { isActive: true },
    });

    // Productos por categoría
    const productsByCategory = await prisma.product.groupBy({
      by: ['categoryId'],
      _count: { categoryId: true },
      where: { isActive: true },
    });

    return {
      totalProducts,
      activeProducts,
      inactiveProducts: totalProducts - activeProducts,
      lowStockProducts,
      totalCategories,
      productsByType: productsByType.reduce((acc, item) => {
        acc[item.type] = item._count.type;
        return acc;
      }, {}),
      productsByCategory: productsByCategory.reduce((acc, item) => {
        const categoryId = item.categoryId || 'uncategorized';
        acc[categoryId] = item._count.categoryId;
        return acc;
      }, {}),
    };
  }

  async calculateFinalPrice(productId: string, variantId?: string, quantity = 1): Promise<number> {
    const prisma = await this.tenantPrisma.getTenantClient();
    
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        variants: variantId ? { where: { id: variantId } } : false,
        comboItemsAsCombo: {
          include: {
            product: {
              select: {
                price: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    let basePrice = Number(product.price);

    // Si es combo, calcular precio basado en componentes
    if (product.type === ProductType.COMBO) {
      let totalPrice = 0;
      for (const comboItem of product.comboItemsAsCombo) {
        totalPrice += Number(comboItem.product.price) * Number(comboItem.quantity);
      }
      basePrice = totalPrice;
    }

    // Si hay variante, aplicar ajuste de precio
    if (variantId && product.variants && product.variants.length > 0) {
      const variant = product.variants[0];
      basePrice += Number(variant.priceAdjustment);
    }

    // Aplicar descuento
    const discountAmount = (basePrice * Number(product.discountPercentage)) / 100;
    const discountedPrice = basePrice - discountAmount;

    // Aplicar impuestos
    const taxAmount = (discountedPrice * Number(product.taxRate)) / 100;
    const finalPrice = discountedPrice + taxAmount;

    return finalPrice * quantity;
  }

  private mapToResponseDto(product: any): ProductResponseDto {
    return {
      id: product.id,
      type: product.type,
      name: product.name,
      description: product.description,
      sku: product.sku,
      barcode: product.barcode,
      categoryId: product.categoryId,
      category: product.category ? {
        id: product.category.id,
        name: product.category.name,
        description: product.category.description,
      } : undefined,
      brand: product.brand,
      tags: product.tags || [],
      price: Number(product.price),
      cost: product.cost ? Number(product.cost) : undefined,
      taxRate: Number(product.taxRate),
      discountPercentage: Number(product.discountPercentage),
      trackInventory: product.trackInventory,
      stockQuantity: product.stockQuantity,
      stockMin: product.stockMin,
      stockUnit: product.stockUnit,
      durationMinutes: product.durationMinutes,
      requiresScheduling: product.requiresScheduling,
      imageUrl: product.imageUrl,
      images: product.images || [],
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      customFields: product.customFields,
      variants: product.variants?.map((variant: any) => ({
        id: variant.id,
        name: variant.name,
        sku: variant.sku,
        priceAdjustment: Number(variant.priceAdjustment),
        stockQuantity: variant.stockQuantity,
        option1Name: variant.option1Name,
        option1Value: variant.option1Value,
        option2Name: variant.option2Name,
        option2Value: variant.option2Value,
        isActive: variant.isActive,
      })) || [],
      comboItems: product.comboItemsAsCombo?.map((comboItem: any) => ({
        id: comboItem.id,
        productId: comboItem.productId,
        product: {
          id: comboItem.product.id,
          name: comboItem.product.name,
          sku: comboItem.product.sku,
          price: Number(comboItem.product.price),
          imageUrl: comboItem.product.imageUrl,
        },
        quantity: Number(comboItem.quantity),
      })) || [],
      inventoryMovements: product.inventoryMovements?.map((movement: any) => ({
        id: movement.id,
        movementType: movement.movementType,
        quantity: Number(movement.quantity),
        previousQuantity: movement.previousQuantity ? Number(movement.previousQuantity) : null,
        newQuantity: movement.newQuantity ? Number(movement.newQuantity) : null,
        reason: movement.reason,
        createdAt: movement.createdAt,
        createdBy: movement.createdByUser ? {
          id: movement.createdByUser.id,
          firstName: movement.createdByUser.firstName,
          lastName: movement.createdByUser.lastName,
        } : null,
      })) || [],
      createdBy: product.createdByUser ? {
        id: product.createdByUser.id,
        firstName: product.createdByUser.firstName,
        lastName: product.createdByUser.lastName,
        email: product.createdByUser.email,
      } : undefined,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}