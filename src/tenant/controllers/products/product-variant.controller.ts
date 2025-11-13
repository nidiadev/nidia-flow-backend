import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    HttpStatus,
    ParseUUIDPipe,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { TenantPrismaService } from '../../services/tenant-prisma.service';
import {
    CreateProductVariantDto,
    UpdateProductVariantDto,
    ProductVariantResponseDto,
} from '../../dto/products/product-variant.dto';

@ApiTags('Product Variants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('products/:productId/variants')
export class ProductVariantController {
    constructor(private readonly tenantPrisma: TenantPrismaService) { }

    @Post()
    @ApiOperation({
        summary: 'Create product variant',
        description: 'Creates a new variant for an existing product (e.g., different sizes, colors).'
    })
    @ApiParam({ name: 'productId', description: 'Product ID' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Product variant created successfully',
        type: ProductVariantResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Product not found',
    })
    @ApiResponse({
        status: HttpStatus.CONFLICT,
        description: 'Variant SKU already exists',
    })
    async create(
        @Param('productId', ParseUUIDPipe) productId: string,
        @Body() createVariantDto: CreateProductVariantDto,
    ): Promise<{ success: boolean; data: ProductVariantResponseDto; message: string }> {
        const prisma = await this.tenantPrisma.getTenantClient();

        // Verify product exists
        const product = await prisma.product.findUnique({
            where: { id: productId },
        });

        if (!product) {
            throw new Error('Product not found');
        }

        // Check if SKU already exists
        if (createVariantDto.sku) {
            const existingVariant = await prisma.productVariant.findUnique({
                where: { sku: createVariantDto.sku },
            });

            if (existingVariant) {
                throw new Error('Variant SKU already exists');
            }
        }

        const variant = await prisma.productVariant.create({
            data: {
                ...createVariantDto,
                productId,
                sku: createVariantDto.sku || `${product.sku}-${createVariantDto.name.replace(/\s+/g, '-').toLowerCase()}`,
            },
        });

        return {
            success: true,
            data: this.mapToResponseDto(variant),
            message: 'Product variant created successfully',
        };
    }

    @Get()
    @ApiOperation({
        summary: 'Get product variants',
        description: 'Retrieves all variants for a specific product.'
    })
    @ApiParam({ name: 'productId', description: 'Product ID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Product variants retrieved successfully',
        type: [ProductVariantResponseDto],
    })
    async findAll(
        @Param('productId', ParseUUIDPipe) productId: string,
    ): Promise<{ success: boolean; data: ProductVariantResponseDto[] }> {
        const prisma = await this.tenantPrisma.getTenantClient();

        const variants = await prisma.productVariant.findMany({
            where: { productId },
            orderBy: { name: 'asc' },
        });

        return {
            success: true,
            data: variants.map(variant => this.mapToResponseDto(variant)),
        };
    }

    @Get(':variantId')
    @ApiOperation({
        summary: 'Get product variant by ID',
        description: 'Retrieves detailed information about a specific product variant.'
    })
    @ApiParam({ name: 'productId', description: 'Product ID' })
    @ApiParam({ name: 'variantId', description: 'Variant ID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Product variant retrieved successfully',
        type: ProductVariantResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Product variant not found',
    })
    async findOne(
        @Param('productId', ParseUUIDPipe) productId: string,
        @Param('variantId', ParseUUIDPipe) variantId: string,
    ): Promise<{ success: boolean; data: ProductVariantResponseDto }> {
        const prisma = await this.tenantPrisma.getTenantClient();

        const variant = await prisma.productVariant.findFirst({
            where: {
                id: variantId,
                productId,
            },
        });

        if (!variant) {
            throw new Error('Product variant not found');
        }

        return {
            success: true,
            data: this.mapToResponseDto(variant),
        };
    }

    @Patch(':variantId')
    @ApiOperation({
        summary: 'Update product variant',
        description: 'Updates an existing product variant.'
    })
    @ApiParam({ name: 'productId', description: 'Product ID' })
    @ApiParam({ name: 'variantId', description: 'Variant ID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Product variant updated successfully',
        type: ProductVariantResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Product variant not found',
    })
    @ApiResponse({
        status: HttpStatus.CONFLICT,
        description: 'Variant SKU already exists',
    })
    async update(
        @Param('productId', ParseUUIDPipe) productId: string,
        @Param('variantId', ParseUUIDPipe) variantId: string,
        @Body() updateVariantDto: UpdateProductVariantDto,
    ): Promise<{ success: boolean; data: ProductVariantResponseDto; message: string }> {
        const prisma = await this.tenantPrisma.getTenantClient();

        // Check if variant exists
        const existingVariant = await prisma.productVariant.findFirst({
            where: {
                id: variantId,
                productId,
            },
        });

        if (!existingVariant) {
            throw new Error('Product variant not found');
        }

        // Check SKU uniqueness if being updated
        if (updateVariantDto.sku && updateVariantDto.sku !== existingVariant.sku) {
            const skuExists = await prisma.productVariant.findUnique({
                where: { sku: updateVariantDto.sku },
            });

            if (skuExists) {
                throw new Error('Variant SKU already exists');
            }
        }

        const variant = await prisma.productVariant.update({
            where: { id: variantId },
            data: updateVariantDto,
        });

        return {
            success: true,
            data: this.mapToResponseDto(variant),
            message: 'Product variant updated successfully',
        };
    }

    @Delete(':variantId')
    @ApiOperation({
        summary: 'Delete product variant',
        description: 'Soft deletes a product variant by setting isActive to false.'
    })
    @ApiParam({ name: 'productId', description: 'Product ID' })
    @ApiParam({ name: 'variantId', description: 'Variant ID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Product variant deleted successfully',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Product variant not found',
    })
    async remove(
        @Param('productId', ParseUUIDPipe) productId: string,
        @Param('variantId', ParseUUIDPipe) variantId: string,
    ): Promise<{ success: boolean; message: string }> {
        const prisma = await this.tenantPrisma.getTenantClient();

        const variant = await prisma.productVariant.findFirst({
            where: {
                id: variantId,
                productId,
            },
        });

        if (!variant) {
            throw new Error('Product variant not found');
        }

        await prisma.productVariant.update({
            where: { id: variantId },
            data: { isActive: false },
        });

        return {
            success: true,
            message: 'Product variant deleted successfully',
        };
    }

    private mapToResponseDto(variant: any): ProductVariantResponseDto {
        return {
            id: variant.id,
            productId: variant.productId,
            name: variant.name,
            sku: variant.sku,
            priceAdjustment: Number(variant.priceAdjustment || 0),
            stockQuantity: variant.stockQuantity || 0,
            option1Name: variant.option1Name,
            option1Value: variant.option1Value,
            option2Name: variant.option2Name,
            option2Value: variant.option2Value,
            isActive: variant.isActive,
            createdAt: variant.createdAt,
            updatedAt: variant.updatedAt,
        };
    }
}