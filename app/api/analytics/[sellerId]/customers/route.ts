import { NextRequest, NextResponse } from 'next/server';
import { customerAnalyticsPipeline } from '@/lib/analytics/pipeline';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sellerId: string }> }
) {
  const { sellerId } = await params;

  const result = await customerAnalyticsPipeline(sellerId);

  return result.match(
    (data) => NextResponse.json(data),
    (error) => {
      const status = 
        error.code === 'INVALID_SELLER_ID' ? 400 :
        error.code === 'NO_ORDERS_FOUND' ? 404 :
        500;

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status }
      );
    }
  );
}
