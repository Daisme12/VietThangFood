import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { RecipesModule } from './modules/recipes/recipes.module';
import { CustomersModule } from './modules/customers/customers.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ProductionModule } from './modules/production/production.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    SuppliersModule,
    MaterialsModule,
    CategoriesModule,
    ProductsModule,
    RecipesModule,
    CustomersModule,
    OrdersModule,
    ProductionModule,
    InventoryModule,
    ReportsModule,
    SettingsModule,
  ],
})
export class AppModule {}

