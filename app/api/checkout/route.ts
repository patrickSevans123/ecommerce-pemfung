import { NextResponse } from 'next/server';
import { connect } from '@/lib/db/mongoose';
import { checkoutPipeline } from '@/lib/payment/service';
import { PaymentMethod } from '@/lib/domain/types';

export async function POST(request: Request) {
  try {
    await connect();

    const body = await request.json();
    const { userId, paymentMethod, shippingAddress } = body;

    // Validate request
    if (!userId || !paymentMethod || !shippingAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, paymentMethod, shippingAddress' },
        { status: 400 }
      );
    }

    // Validate payment method
    if (paymentMethod !== 'balance' && paymentMethod !== 'cash_on_delivery') {
      return NextResponse.json(
        { error: 'Invalid payment method. Must be "balance" or "cash_on_delivery"' },
        { status: 400 }
      );
    }

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
