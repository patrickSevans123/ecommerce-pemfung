import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function emitEventViaAPI(event: any) {
  const response = await fetch('http://localhost:3001/api/test/emit-event', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });
  if (!response.ok) {
    throw new Error(`Failed to emit event: ${response.statusText}`);
  }
  console.log(`✓ Emitted event: ${event.type}`);
}

async function main() {
  const sellerId = process.argv[2];
  
  if (!sellerId) {
    console.error('Usage: npx tsx scripts/emit-event-with-delay.ts <sellerId>');
    console.error('Example: npx tsx scripts/emit-event-with-delay.ts 6919e71148c8f934330d0ecf');
    process.exit(1);
  }

  console.log(`\nEmitting events to seller: ${sellerId}`);
  console.log('Make sure your SSE listener is connected before this script continues!\n');
  console.log('Run this in another terminal:');
  console.log(`curl -N http://localhost:3001/api/notifications/seller/${sellerId}\n`);
  
  // Wait 5 seconds to allow listener to connect
  console.log('Waiting 5 seconds for listener to connect...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    // Emit test events with delays
    await emitEventViaAPI({
      type: 'ORDER_PLACED',
      userId: '6919e71248c8f934330d0edc',
      orderId: '6919fbc927f2e330498584e1',
      total: 49.99,
      sellerId,
      data: {
        productName: 'Test Product - Gaming Mouse',
        quantity: 1,
        totalAmount: 49.99,
      },
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    await emitEventViaAPI({
      type: 'PAYMENT_SUCCESS',
      userId: '6919e71248c8f934330d0edc',
      orderId: '6919fbc927f2e330498584e1',
      amount: 49.99,
      sellerId,
      data: {
        orderId: '6919fbc927f2e330498584e1',
        amount: 49.99,
      },
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    await emitEventViaAPI({
      type: 'ORDER_SHIPPED',
      userId: '6919e71248c8f934330d0edc',
      orderId: '6919fbc927f2e330498584e1',
      trackingNumber: 'TRK123456789',
      sellerId,
      data: {
        orderId: '6919fbc927f2e330498584e1',
        trackingNumber: 'TRK123456789',
      },
    });

    console.log('\n✓ All events emitted successfully!');
    console.log('Check your listener for the events above');

  } catch (error) {
    console.error('Error:', error);
  }
}

main();
