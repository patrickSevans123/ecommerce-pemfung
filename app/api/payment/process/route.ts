import { connect } from '@/lib/db/mongoose';
import { paymentPipeline } from '@/lib/payment/service';
import { paymentProcessSchema } from '@/lib/validation/schemas';
import { validateRequestBody, handleValidation, successResponse, notFoundError, badRequestError, internalServerError, HttpStatus } from '@/lib/api';

export async function POST(request: Request) {
  try {
    await connect();

    // Use our new validation utility
    return await handleValidation(
      await validateRequestBody(request, paymentProcessSchema),
      async (data) => {
        const { orderId, promoCode } = data;

        // Execute payment pipeline (Railway Oriented Programming)
        const result = await paymentPipeline(orderId, promoCode);

        // Handle result
        if (result.isOk()) {
          return successResponse(result.value);
        } else {
          const error = result.error;
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
    );
  } catch (error) {
    console.error('Payment processing error:', error);
    return internalServerError(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
