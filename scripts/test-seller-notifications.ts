#!/usr/bin/env node

/**
 * Test Seller Notification Flow
 * 
 * This script tests the complete notification flow:
 * 1. Create a product
 * 2. Create an order (ORDER_PLACED event)
 * 3. Process payment (PAYMENT_SUCCESS event - seller gets notified)
 * 4. Verify notifications in database
 */

import dotenv from 'dotenv';
import path from 'path';
import { connect } from '../lib/db/mongoose';
import User from '../lib/db/models/user';
import Product from '../lib/db/models/product';
import Order from '../lib/db/models/order';
import Notification from '../lib/db/models/notification';
import { hashPassword } from '../lib/auth/password';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testSellerNotifications() {
  try {
    await connect();
    console.log('✓ Connected to MongoDB\n');

    // 1. Create or find users
    console.log('📝 Step 1: Creating/finding users...');
    const password = await hashPassword('patrick');

    let seller = await User.findOne({ email: 'susep@gmail.com' });
    if (!seller) {
      seller = await User.create({
        email: 'susep@gmail.com',
        name: 'Susep Seller',
        password,
        role: 'seller',
      });
      console.log('  ✓ Created seller:', seller.email);
    } else {
      console.log('  ✓ Found existing seller:', seller.email);
    }

    let buyer = await User.findOne({ email: 'usep@gmail.com' });
    if (!buyer) {
      buyer = await User.create({
        email: 'usep@gmail.com',
        name: 'Usep Buyer',
        password,
        role: 'buyer',
      });
      console.log('  ✓ Created buyer:', buyer.email);
    } else {
      console.log('  ✓ Found existing buyer:', buyer.email);
    }

    // 2. Create product
    console.log('\n📦 Step 2: Creating product...');
    const product = await Product.create({
      title: 'usluck3',
      description: 'Product for seller notification test',
      price: 10.9,
      category: 'Electronics',
      images: ['https://via.placeholder.com/300'],
      stock: 10,
      seller: (seller as any)._id,
      tags: ['test'],
      avgRating: 0,
      reviewsCount: 0,
    });
    console.log('  ✓ Created product:', product.title);

    // 3. Create order (ORDER_PLACED - no seller notification yet)
    console.log('\n📋 Step 3: Creating order...');
    const order = await Order.create({
      user: (buyer as any)._id,
      items: [{
        product: (product as any)._id,
        seller: (seller as any)._id,
        name: product.title,
        price: product.price,
        quantity: 2,
      }],
      subtotal: product.price * 2,
      shipping: 10000,
      total: product.price * 2 + 10000,
      status: { status: 'pending' },
      payment: { method: 'cash_on_delivery' },
      shippingAddress: 'Jl. Test 123, Jakarta',
    });
    console.log('  ✓ Created order:', (order as any)._id.toString());

    // 4. Clear old notifications to see new ones
    console.log('\n🧹 Step 4: Clearing old notifications for this seller...');
    const deletedOld = await Notification.deleteMany({ sellerId: (seller as any)._id.toString() });
    console.log('  ✓ Deleted', deletedOld.deletedCount, 'old notifications');

    // 5. Simulate payment confirmation
    console.log('\n💳 Step 5: Simulating payment confirmation...');
    await Order.findByIdAndUpdate((order as any)._id, {
      status: { status: 'paid', paidAt: new Date().toISOString() }
    });
    console.log('  ✓ Order marked as paid');

    // Emit PAYMENT_SUCCESS event
    console.log('  📤 Emitting PAYMENT_SUCCESS event to seller...');
    const response = await fetch('http://localhost:3000/api/test/emit-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'PAYMENT_SUCCESS',
        userId: (buyer as any)._id.toString(),
        orderId: (order as any)._id.toString(),
        amount: order.total,
        sellerId: (seller as any)._id.toString(),
        data: {
          orderId: (order as any)._id.toString(),
          amount: order.total,
          productName: product.title,     // ← Add product name
          quantity: 2,                     // ← Add quantity
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to emit event');
    }
    console.log('  ✓ PAYMENT_SUCCESS event emitted');

    // Wait for database to save
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 6. Verify notifications
    console.log('\n📬 Step 6: Verifying seller notifications...');
    const sellerNotifications = await Notification.find({
      sellerId: (seller as any)._id.toString(),
    }).sort({ createdAt: -1 });

    console.log(`  ✓ Found ${sellerNotifications.length} notification(s) for seller\n`);

    if (sellerNotifications.length > 0) {
      sellerNotifications.slice(0, 3).forEach((notif, idx) => {
        console.log(`  [${idx + 1}] Type: ${notif.type}`);
        console.log(`      Order: ${notif.orderId}`);
        console.log(`      Data: ${JSON.stringify(notif.data)}`);
        console.log(`      Created: ${notif.createdAt?.toLocaleString()}\n`);
      });
    }

    // 7. Test API endpoint
    console.log('🌐 Step 7: Testing API endpoint...');
    const apiResponse = await fetch(
      `http://localhost:3000/api/notifications/seller-notifications?sellerId=${(seller as any)._id}&limit=5`
    );

    if (apiResponse.ok) {
      const apiData = await apiResponse.json();
      console.log(`  ✓ API returned ${apiData.notifications.length} notifications`);
      
      if (apiData.notifications.length > 0) {
        const latestNotif = apiData.notifications[0];
        console.log(`    Latest: ${latestNotif.type} for order ${latestNotif.orderId}`);
      }
    } else {
      console.log('  ✗ API request failed');
    }

    console.log('\n✅ Test completed!\n');
    console.log('Summary:');
    console.log(`  Seller ID: ${(seller as any)._id}`);
    console.log(`  Buyer ID: ${(buyer as any)._id}`);
    console.log(`  Product ID: ${(product as any)._id}`);
    console.log(`  Order ID: ${(order as any)._id}`);
    console.log('\nNext steps:');
    console.log(`  1. View seller notifications: GET /api/notifications/seller-notifications?sellerId=${(seller as any)._id}`);
    console.log(`  2. Connect SSE listener: curl -N http://localhost:3000/api/notifications/seller/${(seller as any)._id}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testSellerNotifications();
