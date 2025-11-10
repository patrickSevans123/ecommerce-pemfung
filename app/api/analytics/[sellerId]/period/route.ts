import { NextRequest, NextResponse } from 'next/server';
import { calculateStatistics, serializeStats } from '@/lib/analytics/service';
import Order from '@/lib/db/models/order';
import mongoose from 'mongoose';
import { sub, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sellerId: string }> }
) {
  const { sellerId } = await params;
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'daily'; // daily, weekly, monthly
  const date = searchParams.get('date') ? new Date(searchParams.get('date')!) : new Date();

  if (!mongoose.Types.ObjectId.isValid(sellerId)) {
    return NextResponse.json({ error: 'Invalid sellerId' }, { status: 400 });
  }

  const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

  let startDate: Date;
  let endDate: Date;

  switch (period) {
    case 'weekly':
      startDate = startOfWeek(date);
      endDate = endOfWeek(date);
      break;
    case 'monthly':
      startDate = startOfMonth(date);
      endDate = endOfMonth(date);
      break;
    case 'daily':
    default:
      startDate = startOfDay(date);
      endDate = endOfDay(date);
      break;
  }

  const orders = await Order.find({
    'items.seller': sellerObjectId,
    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
  });

  if (!orders || orders.length === 0) {
    return NextResponse.json({ message: 'No orders found for this period' }, { status: 404 });
  }

  const stats = calculateStatistics(orders);
  const serialized = serializeStats(stats);

  return NextResponse.json({
    period,
    startDate,
    endDate,
    stats: serialized,
  });
}
