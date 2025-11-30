import { connect } from '@/lib/db/mongoose';
import { checkoutPipeline, paymentPipeline } from '@/lib/payment/service';
import { PaymentMethod } from '@/lib/domain/types';
import { checkoutSchema } from '@/lib/validation/schemas';
import {
  validateRequestBody,
  handleValidation,
  createdResponse,
  successResponse,
  badRequestError,
  notFoundError,
  internalServerError,
  HttpStatus,
} from '@/lib/api';

export async function POST(request: Request) {
  try {
    await connect();

    // Use our new validation utility
    return await handleValidation(
      await validateRequestBody(request, checkoutSchema),
      async (data) => {

        const { userId, paymentMethod, shippingAddress, items, isDirectCheckout, promoCode } = data as {
          userId: string;
          paymentMethod: string;
          shippingAddress: string;
          items?: string[];
          isDirectCheckout?: boolean;
          promoCode?: string;
        };

        // Build payment method object
        const payment: PaymentMethod = paymentMethod === 'balance'
          ? { method: 'balance', userId }
          : { method: 'cash_on_delivery' };

        // Execute checkout pipeline (Railway Oriented Programming)
        const result = await checkoutPipeline(
          userId,
          payment,
          shippingAddress,
          items, // optional selected item IDs to limit checkout
          isDirectCheckout
        );

        // Handle checkout result
        if (!result.isOk()) {
          const error = result.error;
          // Debug: log payment service error for visibility
          try {
            console.error('checkoutPipeline failed:', error);
          } catch {
            console.error('checkoutPipeline failed (unserializable error)');
          }
          const statusCode =
            error.code === 'CART_NOT_FOUND' || error.code === 'PRODUCT_NOT_FOUND' ? HttpStatus.NOT_FOUND :
              error.code === 'CART_EMPTY' || error.code === 'INSUFFICIENT_STOCK' ||
                error.code === 'PROMO_CODE_INVALID' || error.code === 'PROMO_CODE_INACTIVE' ||
                error.code === 'PROMO_CODE_EXPIRED' || error.code === 'PROMO_CODE_LIMIT_REACHED' ? HttpStatus.BAD_REQUEST :
                HttpStatus.INTERNAL_SERVER_ERROR;

          if (statusCode === HttpStatus.NOT_FOUND) {
            return notFoundError(error.message);
          } else if (statusCode === HttpStatus.BAD_REQUEST) {
            return badRequestError(error.message, error.details);
          } else {
            return internalServerError(error.message);
          }
        }

        // If checkout succeeded and payment method is balance, process payment immediately for ALL created orders
        const checkoutValue = result.value;

        if (payment.method === 'balance') {
          const paymentResults = await Promise.all(
            checkoutValue.orders.map(async (orderSuccess) => {
              // Pass the promoCode from the initial data to apply it to each individual order's payment
              const payResult = await paymentPipeline(orderSuccess.orderId, promoCode);
              return payResult;
            })
          );

          // Correctly extract errors from ResultAsync objects
          const errors = paymentResults.filter(res => res.isErr()).map(res => res.error);
          if (errors.length > 0) {
            const error = errors[0];
            try {
              console.error('paymentPipeline failed for one or more orders:', errors);
            } catch {
              console.error('paymentPipeline failed (unserializable error)');
            }
            const statusCode =
              error.code === 'ORDER_NOT_FOUND' ? HttpStatus.NOT_FOUND :
                error.code === 'INVALID_ORDER_STATUS' || error.code === 'INSUFFICIENT_BALANCE' ||
                  error.code === 'PROMO_CODE_INVALID' || error.code === 'PROMO_CODE_INACTIVE' ||
                  error.code === 'PROMO_CODE_EXPIRED' || error.code === 'PROMO_CODE_LIMIT_REACHED' ? HttpStatus.BAD_REQUEST :
                  HttpStatus.INTERNAL_SERVER_ERROR;

            if (statusCode === HttpStatus.NOT_FOUND) {
              return notFoundError(error.message);
            } else if (statusCode === HttpStatus.BAD_REQUEST) {
              return badRequestError(error.message, error.details);
            } else {
              return internalServerError(error.message);
            }
          }

          // If all payments succeeded
          // Filter for successful results and map to their values.
          const successfulPayments = paymentResults
            .filter(res => res.isOk())
            .map(res => res.value);

          return successResponse({
            orders: successfulPayments,
            message: 'All orders processed and paid successfully.'
          });
        }

        // Otherwise return created orders (payment pending or COD)
        return createdResponse(checkoutValue);
      }
    );
  } catch (error) {
    console.error('Checkout error:', error);
    return internalServerError(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
