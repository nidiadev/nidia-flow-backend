import { Module, forwardRef } from '@nestjs/common';
import { ProductController, CategoryController, ProductVariantController, InventoryController } from '../controllers/products';
import {
  ProductService,
  CategoryService,
  InventoryService,
  StockAlertService,
} from '../services/products';
import { TenantPrismaService } from '../services/tenant-prisma.service';
import { TenantService } from '../tenant.service';
import { PlansModule } from '../../plans/plans.module';

@Module({
  imports: [forwardRef(() => PlansModule)],
  controllers: [ProductController, CategoryController, ProductVariantController, InventoryController],
  providers: [
    ProductService,
    CategoryService,
    InventoryService,
    StockAlertService,
    TenantPrismaService,
    TenantService,
  ],
  exports: [
    ProductService,
    CategoryService,
    InventoryService,
    StockAlertService,
  ],
})
export class ProductsModule {}