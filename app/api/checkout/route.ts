import { connect } from '@/lib/db/mongoose';
import { checkoutPipeline } from '@/lib/payment/service';
import { PaymentMethod } from '@/lib/domain/types';
import { checkoutSchema } from '@/lib/validation/schemas';
import {
  validateRequestBody,
  handleValidation,
  createdResponse,
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

        // Handle result
        if (result.isOk()) {
          return createdResponse(result.value);
        } else {
          const error = result.error;
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
      }
    );
  } catch (error) {
    console.error('Checkout error:', error);
    return internalServerError(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
