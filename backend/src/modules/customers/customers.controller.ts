import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import {
  CreateCustomerDto,
  CreateCustomerLocationDto,
  QueryCustomersDto,
  UpdateCustomerDto,
  UpdateCustomerLocationDto,
} from './dto/customers.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async listCustomers(@Query() query: QueryCustomersDto) {
    return this.customersService.listCustomers(query);
  }

  @Post()
  async createCustomer(@Body() dto: CreateCustomerDto) {
    return this.customersService.createCustomer(dto);
  }

  @Patch(':id')
  async updateCustomer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.updateCustomer(id, dto);
  }

  @Post(':customerId/locations')
  async addLocation(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() dto: CreateCustomerLocationDto,
  ) {
    return this.customersService.addCustomerLocation(customerId, dto);
  }

  @Patch('locations/:locationId')
  async updateLocation(
    @Param('locationId', ParseIntPipe) locationId: number,
    @Body() dto: UpdateCustomerLocationDto,
  ) {
    return this.customersService.updateCustomerLocation(locationId, dto);
  }
}

