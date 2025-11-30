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
  MultiOrderPaymentSuccess, // Add this
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
  shippingAddress: string,
  selectedItemIds?: string[]
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

      // If selectedItemIds provided, filter cart items to only those selected
      const selectedItems: CartItemDocument[] | undefined = selectedItemIds && selectedItemIds.length > 0
        ? cart.items.filter((it: CartItemDocument) => selectedItemIds.includes((it.product as mongoose.Types.ObjectId).toString()))
        : undefined;

      const itemsToValidate = selectedItems && selectedItems.length > 0 ? selectedItems : cart.items;

      if (!itemsToValidate || itemsToValidate.length === 0) {
        throw cartEmptyError();
      }

      // Fetch products for the items we will validate
      const productIds = itemsToValidate.map((item: CartItemDocument) => item.product);
      const products = await Product.find({ _id: { $in: productIds } });

      if (products.length !== itemsToValidate.length) {
        throw createPaymentError(
          PaymentErrorCodes.PRODUCT_NOT_FOUND,
          'Some products not found'
        );
      }

      // Create product map for easy lookup
      const productMap = new Map<string, ProductDocument>(
        products.map((p: ProductDocument) => [(p._id as mongoose.Types.ObjectId).toString(), p])
      );

      // Validate stock using functional approach (only validate the items we're ordering)
      const stockValidation = await validateAllItemsStock(itemsToValidate, productMap);
      if (stockValidation.isErr()) {
        throw stockValidation.error;
      }

      // Calculate subtotal for selected items (or full cart if none selected)
      const subtotal = itemsToValidate.reduce((sum: number, item: CartItemDocument) => {
        const product = productMap.get(item.product.toString());
        return sum + (product?.price || 0) * item.quantity;
      }, 0);

      const shipping = PAYMENT_CONSTANTS.FIXED_SHIPPING_COST;
      const discount = 0;
      const total = subtotal + shipping;

      return {
        userId,
        cart,
        selectedItems: selectedItems && selectedItems.length > 0 ? selectedItems : undefined,
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

export const validateItems = (
  userId: UserId,
  paymentMethod: PaymentMethod,
  shippingAddress: string,
  selectedItemIds?: string[]
): ResultAsync<ValidatedCartContext, PaymentError> => {
  return ResultAsync.fromPromise(
    (async () => {
      // Fetch cart
      const cart = await Cart.findOne({ user: userId });
      if (!cart) {
        throw cartNotFoundError();
      }

      const itemsToValidate: CartItemDocument[] = (selectedItemIds ?? []).map((itemId) => {
        const [id, quantityStr] = itemId.split(':');

        return {
          product: new mongoose.Types.ObjectId(id),
          quantity: Number(quantityStr),
          addedAt: new Date(),
        };
      });

      // Fetch products for the items we will validate
      const productIds = itemsToValidate.map((item: CartItemDocument) => item.product);
      const products = await Product.find({ _id: { $in: productIds } });

      if (products.length !== itemsToValidate.length) {
        throw createPaymentError(
          PaymentErrorCodes.PRODUCT_NOT_FOUND,
          'Some products not found'
        );
      }

      // Create product map for easy lookup
      const productMap = new Map<string, ProductDocument>(
        products.map((p: ProductDocument) => [(p._id as mongoose.Types.ObjectId).toString(), p])
      );

      // Validate stock using functional approach (only validate the items we're ordering)
      const stockValidation = await validateAllItemsStock(itemsToValidate, productMap);
      if (stockValidation.isErr()) {
        throw stockValidation.error;
      }

      // Calculate subtotal for selected items (or full cart if none selected)
      const subtotal = itemsToValidate.reduce((sum: number, item: CartItemDocument) => {
        const product = productMap.get(item.product.toString());
        return sum + (product?.price || 0) * item.quantity;
      }, 0);

      const shipping = PAYMENT_CONSTANTS.FIXED_SHIPPING_COST;
      const discount = 0;
      const total = subtotal + shipping;

      return {
        userId,
        cart,
        selectedItems: selectedItemIds && selectedItemIds.length > 0 ? itemsToValidate : undefined,
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
): ResultAsync<MultiOrderPaymentSuccess, PaymentError> => {
  return ResultAsync.fromPromise(
    (async () => {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const { cart, selectedItems, products, userId, promoCode, shippingAddress, paymentMethod } = context;

        // Determine which items to order: selectedItems if provided, otherwise full cart
        const itemsToOrder = selectedItems && selectedItems.length > 0 ? selectedItems : cart.items;

        if (!itemsToOrder || itemsToOrder.length === 0) {
          throw cartEmptyError();
        }

        const ordersCreated: PaymentSuccess[] = [];
        const allCreatedOrderIds: mongoose.Types.ObjectId[] = [];
        const orderedProductObjectIds: mongoose.Types.ObjectId[] = []; // To track all products ordered for cart removal

        // Group items by seller
        const sellerGroupedItems = new Map<string, CartItemDocument[]>();
        itemsToOrder.forEach(item => {
          const product = products.get(item.product.toString());
          if (product && product.seller) {
            const sellerId = product.seller.toString();
            if (!sellerGroupedItems.has(sellerId)) {
              sellerGroupedItems.set(sellerId, []);
            }
            sellerGroupedItems.get(sellerId)!.push(item);
            orderedProductObjectIds.push(item.product as mongoose.Types.ObjectId);
          } else {
            // This case should ideally not happen if validateCart/validateItems passed
            throw createPaymentError(
              PaymentErrorCodes.PRODUCT_NOT_FOUND,
              `Product ${item.product} for seller grouping not found or has no seller`
            );
          }
        });

        // Calculate overall subtotal for proration if a fixed discount is applied across the whole cart
        const overallSubtotalForProration = context.subtotal;

        for (const [sellerId, sellerItems] of sellerGroupedItems.entries()) {
          // Calculate subtotal for the current seller's items
          const sellerSubtotal = sellerItems.reduce((sum: number, item: CartItemDocument) => {
            const product = products.get(item.product.toString());
            return sum + (product?.price || 0) * item.quantity;
          }, 0);

          let sellerShipping: number = PAYMENT_CONSTANTS.FIXED_SHIPPING_COST;
          let sellerDiscount = 0;

          if (promoCode) {
            if (promoCode.discount.kind === 'percentage' && promoCode.discount.percent) {
              sellerDiscount = (sellerSubtotal * promoCode.discount.percent) / 100;
            } else if (promoCode.discount.kind === 'fixed' && promoCode.discount.amount) {
              // Prorate fixed discount based on this seller's subtotal relative to the overall original subtotal
              if (overallSubtotalForProration > 0) {
                sellerDiscount = (sellerSubtotal / overallSubtotalForProration) * promoCode.discount.amount;
              } else {
                sellerDiscount = 0; // Avoid division by zero if cart was empty or items had 0 price
              }
            } else if (promoCode.discount.kind === 'free_shipping') {
              sellerShipping = 0;
            }
          }

          // Ensure discount doesn't make total negative
          sellerDiscount = Math.min(sellerDiscount, sellerSubtotal + sellerShipping);

          const sellerTotal = sellerSubtotal + sellerShipping - sellerDiscount;

          // Create order items for this seller
          const orderItems = sellerItems.map(createOrderItem(products));

          // Create order with pending status for this seller
          const order = await Order.create([{
            user: userId,
            items: orderItems,
            subtotal: sellerSubtotal,
            shipping: sellerShipping,
            discount: sellerDiscount,
            promoCode: promoCode?._id,
            promoCodeApplied: promoCode?.code,
            total: sellerTotal,
            status: { status: 'pending' } as OrderStatus,
            payment: paymentMethod,
            shippingAddress,
          }], { session });

          const createdOrder = order[0] as OrderDocument;
          allCreatedOrderIds.push(createdOrder._id as mongoose.Types.ObjectId);
          ordersCreated.push({
            orderId: (createdOrder._id as mongoose.Types.ObjectId).toString(),
            order: createdOrder,
            message: `Order for seller ${sellerId} created successfully.`,
          });

          // Update product stock for ordered items from this seller
          await updateAllProductStocks(sellerItems, session);
        }

        // Update promo code usage if applied (for all created orders from this transaction)
        if (promoCode && allCreatedOrderIds.length > 0) {
          await PromoCode.findByIdAndUpdate(
            promoCode._id,
            {
              $inc: { usedCount: 1 }, // Increment by 1 for the whole checkout transaction
              $push: { appliesTo: { $each: allCreatedOrderIds } } // Push all order IDs
            },
            { session }
          );
        }

        // Remove ordered items from the user's cart (keep remaining items)
        const originalItems = (cart.items || []) as CartItemDocument[];
        const remainingItems = originalItems.filter((orig) => {
          return !orderedProductObjectIds.some((orderedProductId) => orderedProductId.equals(orig.product));
        });

        await Cart.findByIdAndUpdate(
          cart._id,
          { $set: { items: remainingItems } },
          { session }
        );

        await session.commitTransaction();

        // Emit OrderPlaced notification for EACH created order (fire-and-forget)
        ordersCreated.forEach(orderSuccess => {
          const createdOrder = orderSuccess.order;
          emitEvent({
            type: 'ORDER_PLACED',
            userId,
            orderId: orderSuccess.orderId,
            total: createdOrder.total,
            sellerId: createdOrder.items[0]?.seller?.toString() || '', // Assuming at least one item per order
            data: {
              productName: createdOrder.items[0]?.name || 'Product',
              quantity: createdOrder.items[0]?.quantity || 1,
              totalAmount: createdOrder.total,
            },
          }).catch(error => console.error(`Failed to emit OrderPlaced event for order ${orderSuccess.orderId}:`, error));
        });

        return {
          orders: ordersCreated,
          message: `${ordersCreated.length} orders created successfully. Please proceed with payment.`,
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
  shippingAddress: string,
  selectedItemIds?: string[],
  isDirectCheckout?: boolean
): ResultAsync<MultiOrderPaymentSuccess, PaymentError> => {
  if (isDirectCheckout) {
    return validateItems(userId, paymentMethod, shippingAddress, selectedItemIds)
      .andThen(createOrder);
  }
  return validateCart(userId, paymentMethod, shippingAddress, selectedItemIds)
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