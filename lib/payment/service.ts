import { ResultAsync, okAsync } from 'neverthrow';
import { Cart, Order, Product, PromoCode, BalanceEvent } from '@/lib/db/models';
import { OrderId, UserId, PaymentMethod, OrderStatus } from '@/lib/domain/types';
import mongoose from 'mongoose';
import { CartDocument, CartItemDocument } from '@/lib/db/models/cart';
import { ProductDocument } from '@/lib/db/models/product';
import { PromoCodeDocument } from '@/lib/db/models/promoCode';
import { OrderDocument } from '@/lib/db/models/order';

// Constants
export const FIXED_SHIPPING_COST = 10000;

// Payment Context - carries data through the railway
export interface PaymentContext {
  userId: UserId;
  cart: CartDocument;
  products: Map<string, ProductDocument>;
  promoCode?: PromoCodeDocument;
  paymentMethod: PaymentMethod;
  shippingAddress: string;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
}

// Payment Success Result
export interface PaymentSuccess {
  orderId: OrderId;
  order: OrderDocument;
  message: string;
}

// Error type
export interface PaymentError {
  code: string;
  message: string;
  details?: unknown;
}

// Step 1: Validate Cart
export const validateCart = (
  userId: UserId,
  paymentMethod: PaymentMethod,
  shippingAddress: string
): ResultAsync<Partial<PaymentContext>, PaymentError> => {
  return ResultAsync.fromPromise(
    (async () => {
      // Fetch cart
      const cart = await Cart.findOne({ user: userId }).populate('items.product');
      if (!cart) {
        throw { code: 'CART_NOT_FOUND', message: 'Cart not found' };
      }

      if (!cart.items || cart.items.length === 0) {
        throw { code: 'CART_EMPTY', message: 'Cart is empty' };
      }

      // Fetch all products and validate stock
      const productIds = cart.items.map((item: CartItemDocument) => item.product);
      const products = await Product.find({ _id: { $in: productIds } });

      if (products.length !== cart.items.length) {
        throw { code: 'PRODUCT_NOT_FOUND', message: 'Some products not found' };
      }

      // Create product map for easy lookup
      const productMap = new Map<string, ProductDocument>(
        products.map((p: ProductDocument) => [(p._id as mongoose.Types.ObjectId).toString(), p])
      );

      // Validate stock for all items
      for (const item of cart.items) {
        const product = productMap.get(item.product.toString());
        if (!product) {
          throw {
            code: 'PRODUCT_NOT_FOUND',
            message: `Product ${item.product} not found`
          };
        }

        if ((product.stock || 0) < item.quantity) {
          throw {
            code: 'INSUFFICIENT_STOCK',
            message: `Insufficient stock for product ${product.title}`,
            details: { product: product.title, available: product.stock, requested: item.quantity }
          };
        }
      }

      // Calculate subtotal
      const subtotal = cart.items.reduce((sum: number, item: CartItemDocument) => {
        const product = productMap.get(item.product.toString());
        return sum + (product?.price || 0) * item.quantity;
      }, 0);

      return {
        userId,
        cart,
        products: productMap,
        paymentMethod,
        shippingAddress,
        subtotal,
        shipping: FIXED_SHIPPING_COST,
        discount: 0,
        total: subtotal + FIXED_SHIPPING_COST,
      } as Partial<PaymentContext>;
    })(),
    (error: unknown) => error as PaymentError
  );
};

// Step 2: Apply Promo Code (optional)
export const applyPromoCode = (
  promoCodeStr?: string
) => (context: Partial<PaymentContext>): ResultAsync<Partial<PaymentContext>, PaymentError> => {
  if (!promoCodeStr) {
    return okAsync(context);
  }

  return ResultAsync.fromPromise(
    (async () => {
      const promoCode = await PromoCode.findOne({ code: promoCodeStr });

      if (!promoCode) {
        throw { code: 'PROMO_CODE_INVALID', message: 'Invalid promo code' };
      }

      if (!promoCode.active) {
        throw { code: 'PROMO_CODE_INACTIVE', message: 'Promo code is not active' };
      }

      if (promoCode.expiresAt && new Date(promoCode.expiresAt) < new Date()) {
        throw { code: 'PROMO_CODE_EXPIRED', message: 'Promo code has expired' };
      }

      if (promoCode.usageLimit && (promoCode.usedCount || 0) >= promoCode.usageLimit) {
        throw { code: 'PROMO_CODE_LIMIT_REACHED', message: 'Promo code usage limit reached' };
      }

      // Calculate discount
      let discount = 0;
      let shipping = context.shipping!;

      if (promoCode.discount.kind === 'percentage' && promoCode.discount.percent) {
        discount = (context.subtotal! * promoCode.discount.percent) / 100;
      } else if (promoCode.discount.kind === 'fixed' && promoCode.discount.amount) {
        discount = promoCode.discount.amount;
      } else if (promoCode.discount.kind === 'free_shipping') {
        shipping = 0;
      }

      // Recalculate total
      const total = context.subtotal! + shipping - discount;

      return {
        ...context,
        promoCode,
        discount,
        shipping,
        total,
      } as Partial<PaymentContext>;
    })(),
    (error: unknown) => error as PaymentError
  );
};

// Step 3: Process Payment
export const processPayment = (
  context: Partial<PaymentContext>
): ResultAsync<Partial<PaymentContext>, PaymentError> => {
  return ResultAsync.fromPromise(
    (async () => {
      const { paymentMethod, total, userId } = context;

      if (paymentMethod!.method === 'balance') {
        // Calculate user's current balance
        const balanceEvents = await BalanceEvent.find({ user: userId });
        const currentBalance = balanceEvents.reduce((sum, event) => {
          if (event.type === 'deposit') {
            return sum + event.amount;
          } else if (event.type === 'withdrawn' || event.type === 'payment') {
            return sum - event.amount;
          }
          return sum;
        }, 0);

        if (currentBalance < total!) {
          throw {
            code: 'INSUFFICIENT_BALANCE',
            message: 'Insufficient balance',
            details: { balance: currentBalance, required: total }
          };
        }

        // Payment will be recorded after order creation
      }

      // For cash_on_delivery, no payment processing needed at this stage
      return context;
    })(),
    (error: unknown) => error as PaymentError
  );
};

// Step 4: Create Order
export const createOrder = (
  context: Partial<PaymentContext>
): ResultAsync<PaymentSuccess, PaymentError> => {
  return ResultAsync.fromPromise(
    (async () => {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const { cart, products, userId, subtotal, shipping, discount, total, promoCode, shippingAddress, paymentMethod } = context;

        // Create order items with product details at time of purchase
        const orderItems = cart!.items.map((item: CartItemDocument) => {
          const product = products!.get(item.product.toString());
          return {
            product: item.product,
            seller: product!.seller,
            name: product!.title,
            price: product!.price,
            quantity: item.quantity,
          };
        });

        // Create order with pending status
        const order = await Order.create([{
          user: userId,
          items: orderItems,
          subtotal,
          shipping,
          discount,
          promoCode: promoCode?._id,
          promoCodeApplied: promoCode?.code,
          total,
          status: { status: 'pending' } as OrderStatus,
          payment: paymentMethod,
          shippingAddress,
        }], { session });

        // Update product stock
        for (const item of cart!.items) {
          await Product.findByIdAndUpdate(
            item.product,
            { $inc: { stock: -item.quantity } },
            { session }
          );
        }

        // Update promo code usage if applied
        if (promoCode) {
          await PromoCode.findByIdAndUpdate(
            promoCode._id,
            {
              $inc: { usedCount: 1 },
              $push: { appliesTo: order[0]._id }
            },
            { session }
          );
        }

        // Clear cart
        await Cart.findByIdAndUpdate(
          cart!._id,
          { $set: { items: [] } },
          { session }
        );

        await session.commitTransaction();

        const createdOrder = order[0] as OrderDocument;
        return {
          orderId: (createdOrder._id as mongoose.Types.ObjectId).toString(),
          order: createdOrder,
          message: 'Order created successfully. Please proceed with payment.',
        };
      } catch (error: unknown) {
        await session.abortTransaction();
        throw {
          code: 'ORDER_CREATION_FAILED',
          message: 'Failed to create order',
          details: error instanceof Error ? error.message : 'Unknown error'
        };
      } finally {
        session.endSession();
      }
    })(),
    (error: unknown) => error as PaymentError
  );
};

// Railway Oriented Programming: Checkout Pipeline
// Step 1: validateCart → createOrder (status: pending)
export const checkoutPipeline = (
  userId: UserId,
  paymentMethod: PaymentMethod,
  shippingAddress: string
): ResultAsync<PaymentSuccess, PaymentError> => {
  return validateCart(userId, paymentMethod, shippingAddress)
    .andThen(createOrder);
};

// Helper: Fetch and validate order
const fetchAndValidateOrder = (
  orderId: OrderId
): ResultAsync<OrderDocument, PaymentError> => {
  return ResultAsync.fromPromise(
    (async () => {
      const order = await Order.findById(orderId);
      if (!order) {
        throw { code: 'ORDER_NOT_FOUND', message: 'Order not found' };
      }

      if (order.status.status !== 'pending') {
        throw {
          code: 'INVALID_ORDER_STATUS',
          message: `Cannot process payment for order with status: ${order.status.status}`
        };
      }

      return order;
    })(),
    (error: unknown) => error as PaymentError
  );
};

// Helper: Build payment context from order
const buildPaymentContextFromOrder = (
  order: OrderDocument
): Partial<PaymentContext> => {
  return {
    userId: order.user?.toString() as UserId,
    paymentMethod: order.payment as PaymentMethod,
    shippingAddress: order.shippingAddress || '',
    subtotal: order.subtotal,
    shipping: order.shipping,
    discount: order.discount || 0,
    total: order.total,
  };
};

// Helper: Process balance payment
const processBalancePayment = (
  order: OrderDocument,
  totalAmount: number,
  session: mongoose.ClientSession
): ResultAsync<void, PaymentError> => {
  if (order.payment?.method !== 'balance') {
    return okAsync(undefined);
  }

  return ResultAsync.fromPromise(
    (async () => {
      // Calculate user's current balance
      const balanceEvents = await BalanceEvent.find({ user: order.user });
      const currentBalance = balanceEvents.reduce((sum, event) => {
        if (event.type === 'deposit') {
          return sum + event.amount;
        } else if (event.type === 'withdrawn' || event.type === 'payment') {
          return sum - event.amount;
        }
        return sum;
      }, 0);

      if (currentBalance < totalAmount) {
        throw {
          code: 'INSUFFICIENT_BALANCE',
          message: 'Insufficient balance',
          details: { balance: currentBalance, required: totalAmount }
        };
      }

      // Create balance event for payment
      await BalanceEvent.create([{
        user: order.user,
        amount: totalAmount,
        type: 'payment',
        reference: `Order payment: ${order._id}`,
      }], { session });
    })(),
    (error: unknown) => error as PaymentError
  );
};

// Helper: Update order with promo code and discount
const updateOrderWithPromo = (
  order: OrderDocument,
  context: Partial<PaymentContext>,
  session: mongoose.ClientSession
): ResultAsync<void, PaymentError> => {
  if (!context.discount || context.discount === 0) {
    return okAsync(undefined);
  }

  return ResultAsync.fromPromise(
    (async () => {
      order.discount = context.discount;
      order.total = context.total!;

      if (context.promoCode) {
        order.promoCode = context.promoCode._id as mongoose.Types.ObjectId;
        order.promoCodeApplied = context.promoCode.code;

        // Update promo code usage
        await PromoCode.findByIdAndUpdate(
          context.promoCode._id,
          {
            $inc: { usedCount: 1 },
            $push: { appliesTo: order._id }
          },
          { session }
        );
      }
    })(),
    (error: unknown) => error as PaymentError
  );
};

// Helper: Update order with shipping discount
const updateOrderWithShipping = (
  order: OrderDocument,
  context: Partial<PaymentContext>
): void => {
  if (context.shipping !== order.shipping) {
    order.shipping = context.shipping!;
    order.total = context.total!;
  }
};

// Helper: Mark order as paid
const markOrderAsPaid = (order: OrderDocument): void => {
  order.status = {
    status: 'paid',
    paidAt: new Date().toISOString(),
  };
};

// Refactored: Payment Pipeline (after checkout)
// Step 1: applyPromo → Step 2: processPayment → Step 3: updateOrder (status: paid)
export const paymentPipeline = (
  orderId: OrderId,
  promoCodeStr?: string
): ResultAsync<PaymentSuccess, PaymentError> => {
  return fetchAndValidateOrder(orderId)
    .andThen(order => {
      const context = buildPaymentContextFromOrder(order);
      return applyPromoCode(promoCodeStr)(context).map(updatedContext => ({ order, context: updatedContext }));
    })
    .andThen(({ order, context }) =>
      ResultAsync.fromPromise(
        (async () => {
          const session = await mongoose.startSession();
          session.startTransaction();

          try {
            // Step 1: Process balance payment
            await processBalancePayment(order, context.total!, session).mapErr(err => {
              throw err;
            }).match(
              () => undefined,
              (err) => { throw err; }
            );

            // Step 2: Update order with promo code
            await updateOrderWithPromo(order, context, session).match(
              () => undefined,
              (err) => { throw err; }
            );

            // Step 3: Update shipping if applicable
            updateOrderWithShipping(order, context);

            // Step 4: Mark order as paid
            markOrderAsPaid(order);

            // Save updated order
            await order.save({ session });
            await session.commitTransaction();

            return {
              orderId: (order._id as mongoose.Types.ObjectId).toString(),
              order,
              message: 'Payment processed successfully',
            } as PaymentSuccess;
          } catch (error: unknown) {
            await session.abortTransaction();
            const paymentError = error as PaymentError;
            throw paymentError.code ? paymentError : {
              code: 'PAYMENT_PROCESSING_FAILED',
              message: 'Failed to process payment',
              details: error instanceof Error ? error.message : 'Unknown error'
            };
          } finally {
            session.endSession();
          }
        })(),
        (error: unknown) => error as PaymentError
      )
    );
};
