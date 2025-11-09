import { NextRequest, NextResponse } from 'next/server';
import Order from '@/lib/db/models/order';
import { calculateTimeSeriesMetrics } from '@/lib/analytics/specialized';
import mongoose from 'mongoose';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sellerId: string }> }
) {
  const { sellerId } = await params;
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const granularity = searchParams.get('granularity') || 'all'; // 'all' | 'daily' | 'weekly' | 'monthly'
  const date = searchParams.get('date'); // For specific period analysis

  if (!sellerId) {
    return NextResponse.json(
      { error: 'Seller ID is required' },
      { status: 400 }
    );
  }

  if (!mongoose.Types.ObjectId.isValid(sellerId)) {
    return NextResponse.json({ error: 'Invalid sellerId' }, { status: 400 });
  }

  const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

  // Build query filter
  const query: any = { 'items.seller': sellerObjectId };
  
  // Handle specific period (replaces /period endpoint functionality)
  if (date && granularity !== 'all') {
    const targetDate = new Date(date);
    let periodStart: Date;
    let periodEnd: Date;

    switch (granularity) {
      case 'weekly':
        periodStart = startOfWeek(targetDate);
        periodEnd = endOfWeek(targetDate);
        break;
      case 'monthly':
        periodStart = startOfMonth(targetDate);
        periodEnd = endOfMonth(targetDate);
        break;
      case 'daily':
      default:
        periodStart = startOfDay(targetDate);
        periodEnd = endOfDay(targetDate);
        break;
    }

    query.createdAt = {
      $gte: periodStart,
      $lte: periodEnd,
    };
  } 
  // Handle date range filtering
  else if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const orders = await Order.find(query).lean() as any[];

  if (!orders || orders.length === 0) {
    return NextResponse.json({ 
      success: false,
      message: 'No orders found for this period' 
    }, { status: 404 });
  }

  // For specific period analysis, return aggregated stats
  if (date && granularity !== 'all') {
    const { calculateStatistics, serializeStats } = await import('@/lib/analytics/service');
    const stats = calculateStatistics(orders);
    const serialized = serializeStats(stats);

    return NextResponse.json({
      success: true,
      period: granularity,
      date: date,
      startDate: query.createdAt.$gte,
      endDate: query.createdAt.$lte,
      stats: serialized
    });
  }

  // For time-series analysis, return daily/monthly metrics
  const metrics = calculateTimeSeriesMetrics(orders as any);

  return NextResponse.json({
    success: true,
    granularity: 'all',
    data: metrics,
    summary: {
      totalDataPoints: {
        daily: metrics.daily.length,
        monthly: metrics.monthly.length
      },
      dateRange: {
        start: startDate || 'all time',
        end: endDate || 'present'
      }
    }
  });
}
