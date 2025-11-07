import { NextResponse } from 'next/server';
import { connect } from '@/lib/db/mongoose';
import { checkoutPipeline } from '@/lib/payment/service';
import { PaymentMethod } from '@/lib/domain/types';
import { checkoutSchema, safeJsonParse, createValidationErrorResponse } from '@/lib/validation/schemas';

export async function POST(request: Request) {
  try {
    await connect();

    // Safely parse JSON
    const body = await safeJsonParse(request);
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Validate request with Zod
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        createValidationErrorResponse(parsed.error),
        { status: 400 }
      );
    }

    const { userId, paymentMethod, shippingAddress } = parsed.data;

    // Build payment method object
    const payment: PaymentMethod = paymentMethod === 'balance'
      ? { method: 'balance', userId }
      : { method: 'cash_on_delivery' };

    // Execute checkout pipeline (Railway Oriented Programming)
    // Step 1: validateCart → createOrder (status: pending)
    const result = await checkoutPipeline(
      userId,
      payment,
      shippingAddress
    );

    // Handle result
    if (result.isOk()) {
      return NextResponse.json(result.value, { status: 201 });
    } else {
      const error = result.error;
      const statusCode =
        error.code === 'CART_NOT_FOUND' || error.code === 'PRODUCT_NOT_FOUND' ? 404 :
          error.code === 'CART_EMPTY' || error.code === 'INSUFFICIENT_STOCK' ||
            error.code === 'PROMO_CODE_INVALID' || error.code === 'PROMO_CODE_INACTIVE' ||
            error.code === 'PROMO_CODE_EXPIRED' || error.code === 'PROMO_CODE_LIMIT_REACHED' ? 400 :
            500;

      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details
        },
        { status: statusCode }
      );
    }
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
