import { NextRequest, NextResponse } from 'next/server';
import { emitEvent } from '@/lib/notifications';
import { connect } from '@/lib/db/mongoose';
import { SystemEvent } from '@/lib/domain/types';

export async function POST(request: NextRequest) {
  try {
    await connect();

    const event: SystemEvent = await request.json();

    // Emit the event
    await emitEvent(event);

    return NextResponse.json({ success: true, message: 'Event emitted' });
  } catch (error) {
    console.error('Error emitting event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}