#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function emit() {
  console.log('📤 Emitting PAYMENT_SUCCESS event...');
  try {
    const response = await fetch('http://localhost:3000/api/test/emit-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'PAYMENT_SUCCESS',
        userId: '6919e71248c8f934330d0edc',
        sellerId: '6919e71148c8f934330d0ecf',
        orderId: '691a0c964e18a767bde2c8b9',
        amount: 10021.8,
        data: {
          orderId: '691a0c964e18a767bde2c8b9',
          amount: 10021.8,
          productName: 'test product',
          quantity: 2,
        },
      }),
    });
    console.log('✅ Event emitted:', response.status);
  } catch (error) {
    console.error('❌ Error:', error);
  }
  process.exit(0);
}

emit();
