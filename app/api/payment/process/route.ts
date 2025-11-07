import { NextResponse } from 'next/server';
import { connect } from '@/lib/db/mongoose';
import { paymentPipeline } from '@/lib/payment/service';

export async function POST(request: Request) {
  try {
    await connect();

    const body = await request.json();
    const { orderId, promoCode } = body;

    // Validate request
    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing required field: orderId' },
        { status: 400 }
      );
    }

    // Execute payment pipeline (Railway Oriented Programming)
    // Step 2: applyPromo → processPayment → updateOrder (status: paid)
    const result = await paymentPipeline(orderId, promoCode);

    // Handle result
    if (result.isOk()) {
      return NextResponse.json(result.value, { status: 200 });
    } else {
      const error = result.error;
      const statusCode =
        error.code === 'ORDER_NOT_FOUND' ? 404 :
          error.code === 'INVALID_ORDER_STATUS' || error.code === 'INSUFFICIENT_BALANCE' ? 400 :
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
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
