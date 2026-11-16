import { Module } from '@nestjs/common';
import { OrderApprovalService } from './order-approval.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, OrderApprovalService],
  exports: [OrdersService, OrderApprovalService],
})
export class OrdersModule {}
