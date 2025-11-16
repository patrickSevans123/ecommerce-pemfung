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
    console.log(`[SSE] New seller connection: ${sellerId}`);

    // Set up Server-Sent Events
    const responseStream = new ReadableStream({
      start(controller) {
        console.log(`[SSE] Starting stream for seller: ${sellerId}`);
        
        // Send initial connection message
        controller.enqueue(`data: ${JSON.stringify({ type: 'connected', message: 'Real-time notifications started' })}\n\n`);

        // Subscribe to seller notifications stream
        console.log(`[SSE] Setting up subscription for seller: ${sellerId}`);
        const subscription = sellerNotifications$(sellerId).subscribe({
          next: (event) => {
            console.log(`[SSE] ✅ Event received for seller ${sellerId}:`, event.type);
            
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
            console.log(`[SSE] Stream completed for seller: ${sellerId}`);
            controller.close();
          }
        });

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          console.log(`[SSE] Client disconnected for seller: ${sellerId}`);
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