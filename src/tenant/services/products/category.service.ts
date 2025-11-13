import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryFilterDto,
  CategoryResponseDto,
  CategoryTreeDto,
  CategoryStatsDto,
} from '../../dto/products/category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: TenantPrismaService) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
    const { parentId, ...categoryData } = createCategoryDto;
    const client = await this.prisma.getTenantClient();

    // Verificar que la categoría padre existe si se especifica
    if (parentId) {
      const parentCategory = await client.category.findUnique({
        where: { id: parentId },
      });

      if (!parentCategory) {
        throw new NotFoundException('Parent category not found');
      }

      if (!parentCategory.isActive) {
        throw new BadRequestException('Parent category is not active');
      }
    }

    // Verificar que no existe una categoría con el mismo nombre en el mismo nivel
    const existingCategory = await client.category.findFirst({
      where: {
        name: categoryData.name,
        parentId: parentId || null,
      },
    });

    if (existingCategory) {
      throw new ConflictException('Category with this name already exists at this level');
    }

    const category = await client.category.create({
      data: {
        ...categoryData,
        parentId,
      },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: {
            products: { where: { isActive: true } },
          },
        },
      },
    });

    return this.mapToResponseDto(category);
  }

  async findMany(filterDto: CategoryFilterDto): Promise<{ data: CategoryResponseDto[]; pagination: any }> {
    const {
      page = 1,
      limit = 20,
      search,
      parentId,
      isActive,
      sortBy = 'sortOrder',
      sortOrder = 'asc',
    } = filterDto;
    const client = await this.prisma.getTenantClient();

    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (parentId !== undefined) {
      where.parentId = parentId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Ejecutar consultas
    const [categories, total] = await Promise.all([
      client.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          parent: true,
          children: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
          _count: {
            select: {
              products: { where: { isActive: true } },
              children: { where: { isActive: true } },
            },
          },
        },
      }),
      client.category.count({ where }),
    ]);

    const data = categories.map((category) => this.mapToResponseDto(category));

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

  async findById(id: string): Promise<CategoryResponseDto> {
    const client = await this.prisma.getTenantClient();
    const category = await client.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        products: {
          where: { isActive: true },
          take: 10,
          orderBy: { name: 'asc' },
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
        _count: {
          select: {
            products: { where: { isActive: true } },
            children: { where: { isActive: true } },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.mapToResponseDto(category);
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    const { parentId, ...categoryData } = updateCategoryDto;
    const client = await this.prisma.getTenantClient();

    // Verificar que la categoría existe
    const existingCategory = await client.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      throw new NotFoundException('Category not found');
    }

    // Verificar que la categoría padre existe si se especifica
    if (parentId) {
      // No puede ser su propio padre
      if (parentId === id) {
        throw new BadRequestException('Category cannot be its own parent');
      }

      const parentCategory = await client.category.findUnique({
        where: { id: parentId },
      });

      if (!parentCategory) {
        throw new NotFoundException('Parent category not found');
      }

      // Verificar que no se cree un ciclo
      const isDescendant = await this.isDescendant(parentId, id);
      if (isDescendant) {
        throw new BadRequestException('Cannot set a descendant category as parent');
      }
    }

    // Verificar nombre único en el mismo nivel si se está cambiando
    if (categoryData.name && categoryData.name !== existingCategory.name) {
      const nameExists = await client.category.findFirst({
        where: {
          name: categoryData.name,
          parentId: parentId !== undefined ? parentId : existingCategory.parentId,
          id: { not: id },
        },
      });

      if (nameExists) {
        throw new ConflictException('Category with this name already exists at this level');
      }
    }

    const category = await client.category.update({
      where: { id },
      data: {
        ...categoryData,
        ...(parentId !== undefined && { parentId }),
      },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: {
            products: { where: { isActive: true } },
          },
        },
      },
    });

    return this.mapToResponseDto(category);
  }

  async softDelete(id: string): Promise<void> {
    const client = await this.prisma.getTenantClient();
    const category = await client.category.findUnique({
      where: { id },
      include: {
        children: { where: { isActive: true } },
        products: { where: { isActive: true } },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Verificar que no tenga categorías hijas activas
    if (category.children.length > 0) {
      throw new BadRequestException('Cannot delete category with active subcategories');
    }

    // Verificar que no tenga productos activos
    if (category.products.length > 0) {
      throw new BadRequestException('Cannot delete category with active products');
    }

    await client.category.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  async activate(id: string): Promise<CategoryResponseDto> {
    const client = await this.prisma.getTenantClient();
    const category = await client.category.update({
      where: { id },
      data: {
        isActive: true,
        updatedAt: new Date(),
      },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: {
            products: { where: { isActive: true } },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.mapToResponseDto(category);
  }

  async getTree(): Promise<CategoryTreeDto[]> {
    const client = await this.prisma.getTenantClient();
    const categories = await client.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            products: { where: { isActive: true } },
          },
        },
      },
    });

    return this.buildTree(categories);
  }

  async getRootCategories(): Promise<CategoryResponseDto[]> {
    const client = await this.prisma.getTenantClient();
    const categories = await client.category.findMany({
      where: {
        parentId: null,
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: {
            products: { where: { isActive: true } },
            children: { where: { isActive: true } },
          },
        },
      },
    });

    return categories.map((category) => this.mapToResponseDto(category));
  }

  async getStats(): Promise<CategoryStatsDto> {
    const client = await this.prisma.getTenantClient();
    const [totalCategories, activeCategories, rootCategories] = await Promise.all([
      client.category.count(),
      client.category.count({ where: { isActive: true } }),
      client.category.count({ where: { parentId: null, isActive: true } }),
    ]);

    const categoriesWithProducts = await client.category.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            products: { where: { isActive: true } },
          },
        },
      },
    });

    const categoriesWithProductCount = categoriesWithProducts.filter(
      (cat) => cat._count.products > 0
    ).length;

    const averageProductsPerCategory = categoriesWithProducts.length > 0
      ? categoriesWithProducts.reduce((sum, cat) => sum + cat._count.products, 0) / categoriesWithProducts.length
      : 0;

    return {
      totalCategories,
      activeCategories,
      inactiveCategories: totalCategories - activeCategories,
      rootCategories,
      categoriesWithProducts: categoriesWithProductCount,
      averageProductsPerCategory: Math.round(averageProductsPerCategory * 100) / 100,
    };
  }

  async reorderCategories(categoryOrders: { id: string; sortOrder: number }[]): Promise<void> {
    const client = await this.prisma.getTenantClient();
    await client.$transaction(async (tx) => {
      for (const { id, sortOrder } of categoryOrders) {
        await tx.category.update({
          where: { id },
          data: { sortOrder },
        });
      }
    });
  }

  private async isDescendant(ancestorId: string, descendantId: string): Promise<boolean> {
    const client = await this.prisma.getTenantClient();
    const descendant = await client.category.findUnique({
      where: { id: descendantId },
      include: { parent: true },
    });

    if (!descendant || !descendant.parent) {
      return false;
    }

    if (descendant.parent.id === ancestorId) {
      return true;
    }

    return this.isDescendant(ancestorId, descendant.parent.id);
  }

  private buildTree(categories: any[], parentId: string | null = null): CategoryTreeDto[] {
    const children = categories.filter((cat) => cat.parentId === parentId);
    
    return children.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      imageUrl: category.imageUrl,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      productsCount: category._count.products,
      children: this.buildTree(categories, category.id),
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    }));
  }

  private mapToResponseDto(category: any): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      parentId: category.parentId,
      parent: category.parent ? {
        id: category.parent.id,
        name: category.parent.name,
      } : undefined,
      imageUrl: category.imageUrl,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      metadata: category.metadata,
      children: category.children?.map((child: any) => ({
        id: child.id,
        name: child.name,
        description: child.description,
        sortOrder: child.sortOrder,
        productsCount: child._count?.products || 0,
      })) || [],
      //   id: product.id,
      //   name: product.name,
      //   sku: product.sku,
      //   price: Number(product.price),
      //   imageUrl: product.imageUrl,
      //   stockQuantity: product.stockQuantity,
      //   trackInventory: product.trackInventory,
      // })) || [],
      productsCount: category._count?.products || 0,
      // childrenCount: category._count?.children || 0,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}