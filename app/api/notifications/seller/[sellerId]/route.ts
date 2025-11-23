import { NextRequest, NextResponse } from 'next/server';
import { sellerNotifications$ } from '@/lib/notifications';
import { connect } from '@/lib/db/mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sellerId: string }> }
) {
  try {
    await connect();

    const { sellerId } = await params;
  // SSE: new seller connection

    // Set up Server-Sent Events
    const responseStream = new ReadableStream({
      start(controller) {
  // SSE: starting stream
        
        // Send initial connection message
        controller.enqueue(`data: ${JSON.stringify({ type: 'connected', message: 'Real-time notifications started' })}\n\n`);

        // Subscribe to seller notifications stream
  // SSE: setting up subscription
        const subscription = sellerNotifications$(sellerId).subscribe({
          next: (event) => {
            // SSE: event received for seller
            
            // Transform event to notification format for frontend
            const notification: Record<string, unknown> = {
              type: event.type,
              data: {},
            };

            // Add fields based on event type (all SystemEvent types have type, most have common fields)
            if ('orderId' in event) {
              notification.orderId = (event as { orderId?: string }).orderId;
            }
            if ('userId' in event) {
              notification.userId = (event as { userId?: string }).userId;
            }
            if ('sellerId' in event) {
              notification.sellerId = (event as { sellerId?: string }).sellerId;
            }
            if ('productId' in event) {
              notification.productId = (event as { productId?: string }).productId;
            }
            if ('data' in event && (event as { data?: Record<string, unknown> }).data) {
              notification.data = (event as { data?: Record<string, unknown> }).data;
            }

            const data = `data: ${JSON.stringify(notification)}\n\n`;
            controller.enqueue(data);
          },
          error: (err) => {
            console.error('Error in notifications stream:', err);
            controller.enqueue(`data: ${JSON.stringify({ type: 'error', message: 'Stream error' })}\n\n`);
            controller.close();
          },
          complete: () => {
            // SSE: stream completed
            controller.close();
          }
        });

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          // SSE: client disconnected
          subscription.unsubscribe();
          controller.close();
        });
      }
    });

    return new NextResponse(responseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error setting up notifications stream:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}