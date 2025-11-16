import { NextRequest, NextResponse } from 'next/server';
import { getNotificationsForUser } from '@/lib/notifications';
import { connect } from '@/lib/db/mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await connect();

    const { userId } = await params;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const notifications = await getNotificationsForUser(userId, limit);

    // Apply offset if specified
    const paginatedNotifications = notifications.slice(offset, offset + limit);

    return NextResponse.json({
      notifications: paginatedNotifications,
      total: notifications.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}