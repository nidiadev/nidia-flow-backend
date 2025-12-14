import { Module, forwardRef } from '@nestjs/common';
import {
  ProductController,
  CategoryController,
  ProductVariantController,
  InventoryController,
  AttributeController,
  WarehouseController,
} from '../controllers/products';
import {
  ProductService,
  CategoryService,
  InventoryService,
  StockAlertService,
  AttributeService,
  WarehouseService,
} from '../services/products';
import { PlansModule } from '../../plans/plans.module';
// TenantPrismaService, TenantProvisioningService, TenantService se obtienen del TenantModule (global)
// No deben registrarse aquí para evitar múltiples instancias con scope REQUEST

@Module({
  imports: [forwardRef(() => PlansModule)],
  controllers: [
    ProductController,
    CategoryController,
    ProductVariantController,
    InventoryController,
    AttributeController,
    WarehouseController,
  ],
  providers: [
    ProductService,
    CategoryService,
    InventoryService,
    StockAlertService,
    AttributeService,
    WarehouseService,
  ],
  exports: [
    ProductService,
    CategoryService,
    InventoryService,
    StockAlertService,
    AttributeService,
    WarehouseService,
  ],
})
export class ProductsModule {}
