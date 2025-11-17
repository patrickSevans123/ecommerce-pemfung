import { NextRequest, NextResponse } from 'next/server';
import { getNotificationsForSeller } from '@/lib/notifications';
import { connect } from '@/lib/db/mongoose';

export async function GET(request: NextRequest) {
  try {
    await connect();

    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('sellerId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!sellerId) {
      return NextResponse.json(
        { error: 'sellerId parameter is required' },
        { status: 400 }
      );
    }

    const notifications = await getNotificationsForSeller(sellerId, limit);

    // Apply offset if specified
    const paginatedNotifications = notifications.slice(offset, offset + limit);

    return NextResponse.json({
      notifications: paginatedNotifications,
      total: notifications.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching seller notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
