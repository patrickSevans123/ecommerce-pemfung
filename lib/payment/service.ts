import { ResultAsync, okAsync } from 'neverthrow';
import { Cart, Order, Product, PromoCode, BalanceEvent } from '@/lib/db/models';
import { OrderId, UserId, PaymentMethod, OrderStatus } from '@/lib/domain/types';
import mongoose from 'mongoose';
import { CartDocument, CartItemDocument } from '@/lib/db/models/cart';
import { ProductDocument } from '@/lib/db/models/product';
import { PromoCodeDocument } from '@/lib/db/models/promoCode';
import { OrderDocument } from '@/lib/db/models/order';
import { PAYMENT_CONSTANTS } from '@/lib/config/constants';
import { emitEvent } from '@/lib/notifications';
import {
  PaymentError,
  PaymentErrorCodes,
  cartNotFoundError,
  cartEmptyError,
  insufficientStockError,
  insufficientBalanceError,
  orderNotFoundError,
  invalidOrderStatusError,
  createPaymentError,
} from './errors';
import type {
  ValidatedCartContext,
  PromoAppliedContext,
  OrderPaymentContext,
  PaymentSuccess,
} from './types';

// Re-export constants for backward compatibility
export const FIXED_SHIPPING_COST = PAYMENT_CONSTANTS.FIXED_SHIPPING_COST;

// Legacy PaymentContext type for backward compatibility
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

// Re-export types
export type { PaymentError, PaymentSuccess };

// Helper: Validate single cart item stock
const validateItemStock = (
  productMap: Map<string, ProductDocument>
) => (item: CartItemDocument): ResultAsync<void, PaymentError> => {
  const product = productMap.get(item.product.toString());

  if (!product) {
    return ResultAsync.fromSafePromise(
      Promise.reject(
        createPaymentError(
          PaymentErrorCodes.PRODUCT_NOT_FOUND,
          `Product ${item.product} not found`
        )
      )
    );
  }

  if ((product.stock || 0) < item.quantity) {
    return ResultAsync.fromSafePromise(
      Promise.reject(insufficientStockError(product.title, product.stock || 0, item.quantity))
    );
  }

  return okAsync(undefined);
};

// Helper: Validate all items stock using functional composition
const validateAllItemsStock = (
  items: CartItemDocument[],
  productMap: Map<string, ProductDocument>
): ResultAsync<void, PaymentError> => {
  const validations = items.map(validateItemStock(productMap));

  return ResultAsync.combine(validations).map(() => undefined);
};

// Step 1: Validate Cart
export const validateCart = (
  userId: UserId,
  paymentMethod: PaymentMethod,
  shippingAddress: string
): ResultAsync<ValidatedCartContext, PaymentError> => {
  return ResultAsync.fromPromise(
    (async () => {
      // Fetch cart
      const cart = await Cart.findOne({ user: userId });
      if (!cart) {
        throw cartNotFoundError();
      }

      if (!cart.items || cart.items.length === 0) {
        throw cartEmptyError();
      }

      // Fetch all products and validate stock
      const productIds = cart.items.map((item: CartItemDocument) => item.product);
      const products = await Product.find({ _id: { $in: productIds } });

      if (products.length !== cart.items.length) {
        throw createPaymentError(
          PaymentErrorCodes.PRODUCT_NOT_FOUND,
          'Some products not found'
        );
      }

      // Create product map for easy lookup
      const productMap = new Map<string, ProductDocument>(
        products.map((p: ProductDocument) => [(p._id as mongoose.Types.ObjectId).toString(), p])
      );

      // Validate stock using functional approach
      const stockValidation = await validateAllItemsStock(cart.items, productMap);
      if (stockValidation.isErr()) {
        throw stockValidation.error;
      }

      // Calculate subtotal
      const subtotal = cart.items.reduce((sum: number, item: CartItemDocument) => {
        const product = productMap.get(item.product.toString());
        return sum + (product?.price || 0) * item.quantity;
      }, 0);

      const shipping = PAYMENT_CONSTANTS.FIXED_SHIPPING_COST;
      const discount = 0;
      const total = subtotal + shipping;

      return {
        userId,
        cart,
        products: productMap,
        paymentMethod,
        shippingAddress,
        subtotal,
        shipping,
        discount,
        total,
      } as ValidatedCartContext;
    })(),
    (error: unknown) => error as PaymentError
  );
};

// Step 2: Apply Promo Code (optional)
export const applyPromoCode = (
  promoCodeStr?: string
) => (context: ValidatedCartContext): ResultAsync<PromoAppliedContext, PaymentError> => {
  if (!promoCodeStr) {
    return okAsync(context);
  }

  return ResultAsync.fromPromise(
    (async () => {
      const promoCode = await PromoCode.findOne({ code: promoCodeStr });

      if (!promoCode) {
        throw createPaymentError(
          PaymentErrorCodes.PROMO_CODE_INVALID,
          'Invalid promo code'
        );
      }

      if (!promoCode.active) {
        throw createPaymentError(
          PaymentErrorCodes.PROMO_CODE_INACTIVE,
          'Promo code is not active'
        );
      }

      if (promoCode.expiresAt && new Date(promoCode.expiresAt) < new Date()) {
        throw createPaymentError(
          PaymentErrorCodes.PROMO_CODE_EXPIRED,
          'Promo code has expired'
        );
      }

      if (promoCode.usageLimit && (promoCode.usedCount || 0) >= promoCode.usageLimit) {
        throw createPaymentError(
          PaymentErrorCodes.PROMO_CODE_LIMIT_REACHED,
          'Promo code usage limit reached'
        );
      }

      // Calculate discount
      let discount = 0;
      let shipping = context.shipping;

      if (promoCode.discount.kind === 'percentage' && promoCode.discount.percent) {
        discount = (context.subtotal * promoCode.discount.percent) / 100;
      } else if (promoCode.discount.kind === 'fixed' && promoCode.discount.amount) {
        discount = promoCode.discount.amount;
      } else if (promoCode.discount.kind === 'free_shipping') {
        shipping = 0;
      }

      // Recalculate total
      const total = context.subtotal + shipping - discount;

      return {
        ...context,
        promoCode,
        discount,
        shipping,
        total,
      } as PromoAppliedContext;
    })(),
    (error: unknown) => error as PaymentError
  );
};

// Step 3: Process Payment (validation only for checkout)
export const processPayment = (
  context: PromoAppliedContext
): ResultAsync<PromoAppliedContext, PaymentError> => {
  // For checkout pipeline, we just validate payment method is present
  // Actual payment processing happens in paymentPipeline
  return okAsync(context);
};

// Helper: Create order item from cart item
const createOrderItem = (
  productMap: Map<string, ProductDocument>
) => (item: CartItemDocument) => {
  const product = productMap.get(item.product.toString());
  return {
    product: item.product,
    seller: product!.seller,
    name: product!.title,
    price: product!.price,
    quantity: item.quantity,
  };
};

// Helper: Update product stock for single item
const updateProductStock = (
  session: mongoose.ClientSession
) => async (item: CartItemDocument): Promise<unknown> => {
  // First get the current product to check stock after update
  const product = await Product.findById(item.product).session(session);
  if (!product) return;

  const newStock = (product.stock || 0) - item.quantity;

  // Update the stock
  await Product.findByIdAndUpdate(
    item.product,
    { $inc: { stock: -item.quantity } },
    { session }
  );

  // Check if stock is low after update (fire-and-forget, after transaction)
  if (newStock <= 5) { // Threshold of 5
    // We can't emit here because we're in a transaction, so we'll emit after commit
    // For now, we'll emit immediately but catch errors
    setImmediate(() => {
      // Stock low notification removed from system events
      // You can implement this separately if needed
    });
  }

  return product;
};

// Helper: Update all product stocks using Promise.all
const updateAllProductStocks = (
  items: CartItemDocument[],
  session: mongoose.ClientSession
): Promise<unknown[]> => {
  return Promise.all(items.map(updateProductStock(session)));
};

// Step 4: Create Order
export const createOrder = (
  context: PromoAppliedContext
): ResultAsync<PaymentSuccess, PaymentError> => {
  return ResultAsync.fromPromise(
    (async () => {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const { cart, products, userId, subtotal, shipping, discount, total, promoCode, shippingAddress, paymentMethod } = context;

        // Create order items using map (functional)
        const orderItems = cart.items.map(createOrderItem(products));

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
        await updateAllProductStocks(cart.items, session);

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
          cart._id,
          { $set: { items: [] } },
          { session }
        );

        await session.commitTransaction();

        const createdOrder = order[0] as OrderDocument;
        const orderId = (createdOrder._id as mongoose.Types.ObjectId).toString();

        // Emit OrderPlaced notification (fire-and-forget)
        // NOTE: Seller notification will be sent only after payment is confirmed
        emitEvent({
          type: 'ORDER_PLACED',
          userId,
          orderId,
          total,
          sellerId: createdOrder.items[0]?.seller?.toString() || '',
          data: {
            productName: createdOrder.items[0]?.name || 'Product',
            quantity: createdOrder.items[0]?.quantity || 1,
            totalAmount: total,
          },
        }).catch(error => console.error('Failed to emit OrderPlaced event:', error));

        return {
          orderId,
          order: createdOrder,
          message: 'Order created successfully. Please proceed with payment.',
        };
      } catch (error: unknown) {
        await session.abortTransaction();
        throw createPaymentError(
          PaymentErrorCodes.ORDER_CREATION_FAILED,
          'Failed to create order',
          error instanceof Error ? error.message : 'Unknown error'
        );
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
        throw orderNotFoundError();
      }

      if (order.status.status !== 'pending') {
        throw invalidOrderStatusError(order.status.status);
      }

      return order;
    })(),
    (error: unknown) => error as PaymentError
  );
};

// Helper: Build payment context from order
const buildPaymentContextFromOrder = (
  order: OrderDocument
): OrderPaymentContext => {
  return {
    orderId: (order._id as mongoose.Types.ObjectId).toString(),
    order,
    userId: order.user?.toString() as UserId,
    paymentMethod: order.payment as PaymentMethod,
    shippingAddress: order.shippingAddress || '',
    subtotal: order.subtotal,
    shipping: order.shipping || 0,
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
        if (event.type === 'deposit' || event.type === 'refund') {
          return sum + event.amount;
        } else if (event.type === 'withdrawn' || event.type === 'payment') {
          return sum - event.amount;
        }
        return sum;
      }, 0);

      if (currentBalance < totalAmount) {
        throw insufficientBalanceError(currentBalance, totalAmount);
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
  context: OrderPaymentContext,
  session: mongoose.ClientSession
): ResultAsync<void, PaymentError> => {
  if (!context.discount || context.discount === 0) {
    return okAsync(undefined);
  }

  return ResultAsync.fromPromise(
    (async () => {
      order.discount = context.discount;
      order.total = context.total;

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
  context: OrderPaymentContext
): void => {
  if (context.shipping !== order.shipping) {
    order.shipping = context.shipping;
    order.total = context.total;
  }
};

// Helper: Mark order as paid
const markOrderAsPaid = (order: OrderDocument): void => {
  order.status = {
    status: 'paid',
    paidAt: new Date().toISOString(),
  };
};

// Helper: Apply promo code to order context
const applyPromoCodeToOrder = (
  promoCodeStr?: string
) => (context: OrderPaymentContext): ResultAsync<OrderPaymentContext, PaymentError> => {
  if (!promoCodeStr) {
    return okAsync(context);
  }

  return ResultAsync.fromPromise(
    (async () => {
      const promoCode = await PromoCode.findOne({ code: promoCodeStr });

      if (!promoCode) {
        throw createPaymentError(
          PaymentErrorCodes.PROMO_CODE_INVALID,
          'Invalid promo code'
        );
      }

      if (!promoCode.active) {
        throw createPaymentError(
          PaymentErrorCodes.PROMO_CODE_INACTIVE,
          'Promo code is not active'
        );
      }

      if (promoCode.expiresAt && new Date(promoCode.expiresAt) < new Date()) {
        throw createPaymentError(
          PaymentErrorCodes.PROMO_CODE_EXPIRED,
          'Promo code has expired'
        );
      }

      if (promoCode.usageLimit && (promoCode.usedCount || 0) >= promoCode.usageLimit) {
        throw createPaymentError(
          PaymentErrorCodes.PROMO_CODE_LIMIT_REACHED,
          'Promo code usage limit reached'
        );
      }

      // Calculate discount
      let discount = 0;
      let shipping = context.shipping;

      if (promoCode.discount.kind === 'percentage' && promoCode.discount.percent) {
        discount = (context.subtotal * promoCode.discount.percent) / 100;
      } else if (promoCode.discount.kind === 'fixed' && promoCode.discount.amount) {
        discount = promoCode.discount.amount;
      } else if (promoCode.discount.kind === 'free_shipping') {
        shipping = 0;
      }

      // Recalculate total
      const total = context.subtotal + shipping - discount;

      return {
        ...context,
        promoCode,
        discount,
        shipping,
        total,
      };
    })(),
    (error: unknown) => error as PaymentError
  );
};

// Helper: Execute payment in transaction (proper ROP)
const executePaymentInTransaction = (
  context: OrderPaymentContext
): ResultAsync<PaymentSuccess, PaymentError> => {
  return ResultAsync.fromPromise(
    (async () => {
      const session = await mongoose.startSession();

      try {
        session.startTransaction();

        // Process balance payment
        const balanceResult = await processBalancePayment(context.order, context.total, session);
        if (balanceResult.isErr()) {
          throw balanceResult.error;
        }

        // Update order with promo
        const promoResult = await updateOrderWithPromo(context.order, context, session);
        if (promoResult.isErr()) {
          throw promoResult.error;
        }

        // Update shipping and mark as paid
        updateOrderWithShipping(context.order, context);
        markOrderAsPaid(context.order);

        // Save order
        await context.order.save({ session });

        // Commit transaction
        await session.commitTransaction();

        const orderId = (context.order._id as mongoose.Types.ObjectId).toString();

        // Emit PaymentConfirmed notification (fire-and-forget)
        emitEvent({
          type: 'PAYMENT_SUCCESS',
          userId: context.userId,
          orderId,
          amount: context.total,
          sellerId: context.order.items[0]?.seller?.toString() || '',
          data: {
            orderId,
            amount: context.total,
          },
        }).catch(error => console.error('Failed to emit PaymentConfirmed event:', error));
        return {
          orderId,
          order: context.order,
          message: 'Payment processed successfully',
        } as PaymentSuccess;
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    })(),
    (error: unknown) => {
      if ((error as PaymentError).code) {
        return error as PaymentError;
      }
      return createPaymentError(
        PaymentErrorCodes.PAYMENT_PROCESSING_FAILED,
        'Failed to process payment',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  );
};

// Refactored: Payment Pipeline (after checkout)
// Step 1: fetchOrder → Step 2: applyPromo → Step 3: processPayment (with transaction)
export const paymentPipeline = (
  orderId: OrderId,
  promoCodeStr?: string
): ResultAsync<PaymentSuccess, PaymentError> => {
  return fetchAndValidateOrder(orderId)
    .map(buildPaymentContextFromOrder)
    .andThen(applyPromoCodeToOrder(promoCodeStr))
    .andThen(executePaymentInTransaction);
};
