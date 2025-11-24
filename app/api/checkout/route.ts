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

        const { userId, paymentMethod, shippingAddress } = data;

        // Build payment method object
        const payment: PaymentMethod = paymentMethod === 'balance'
          ? { method: 'balance', userId }
          : { method: 'cash_on_delivery' };

        // Execute checkout pipeline (Railway Oriented Programming)
        const result = await checkoutPipeline(
          userId,
          payment,
          shippingAddress
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

        // If checkout succeeded and payment method is balance, process payment immediately
        const checkoutValue = result.value;
        if (payment.method === 'balance') {
          const payResult = await paymentPipeline(checkoutValue.orderId, data.promoCode);
            if (payResult.isOk()) {
            return successResponse(payResult.value);
          } else {
            const error = payResult.error;
            // Debug: log payment processing error
            try {
              console.error('paymentPipeline failed:', error);
            } catch {
              console.error('paymentPipeline failed (unserializable error)');
            }
            const statusCode =
              error.code === 'ORDER_NOT_FOUND' ? HttpStatus.NOT_FOUND :
                error.code === 'INVALID_ORDER_STATUS' || error.code === 'INSUFFICIENT_BALANCE' ? HttpStatus.BAD_REQUEST :
                  HttpStatus.INTERNAL_SERVER_ERROR;

            if (statusCode === HttpStatus.NOT_FOUND) {
              return notFoundError(error.message);
            } else if (statusCode === HttpStatus.BAD_REQUEST) {
              return badRequestError(error.message, error.details);
            } else {
              return internalServerError(error.message);
            }
          }
        }

        // Otherwise return created order (payment pending or COD)
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
