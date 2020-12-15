import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer does not exists.');
    }

    const productsFindedById = await this.productsRepository.findAllById(
      products,
    );

    if (productsFindedById.length === 0) {
      throw new AppError('Product does not exists.');
    }

    const verifyProducts = products.find((product, index) => {
      if (product.quantity > productsFindedById[index].quantity) {
        return true;
      }
    });

    if (verifyProducts) {
      throw new AppError('Quantity does not enough');
    }

    const quantityUpdated = products.map((product, index) => ({
      id: product.id,
      quantity: productsFindedById[index].quantity - product.quantity,
    }));

    await this.productsRepository.updateQuantity(quantityUpdated);

    const newProducts = products.map((product, index) => ({
      product_id: product.id,
      price: productsFindedById[index].price,
      quantity: product.quantity,
    }));

    const order = await this.ordersRepository.create({
      customer,
      products: newProducts,
    });

    return order;
  }
}

export default CreateOrderService;
