import dotenv from 'dotenv';
import path from 'path';
import { connect } from '../lib/db/mongoose';
import User from '../lib/db/models/user';
import Product from '../lib/db/models/product';
import Order from '../lib/db/models/order';
import { hashPassword } from '../lib/auth/password';

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
}

async function testNotifications() {
  try {
    await connect();
    console.log('Connected to MongoDB');

    // Hash password
    const password = await hashPassword('patrick');

    // Create or find users
    console.log('Creating/finding users...');
    let seller = await User.findOne({ email: 'susep@gmail.com' });
    if (!seller) {
      seller = await User.create({
        email: 'susep@gmail.com',
        name: 'Susep Seller',
        password,
        role: 'seller',
      });
      console.log('Created seller:', seller.email);
    } else {
      console.log('Found existing seller:', seller.email);
    }

    let buyer = await User.findOne({ email: 'usep@gmail.com' });
    if (!buyer) {
      buyer = await User.create({
        email: 'usep@gmail.com',
        name: 'Usep Buyer',
        password,
        role: 'buyer',
      });
      console.log('Created buyer:', buyer.email);
    } else {
      console.log('Found existing buyer:', buyer.email);
    }

    // Create a product for the seller
    console.log('Creating product...');
    const product = await Product.create({
      title: 'mang usep',
      description: 'High-performance gaming mouse with RGB lighting',
      price: 49.99,
      category: 'Electronics',
      images: ['https://images.unsplash.com/photo-1527814050087-3793815479db?w=500'],
      stock: 10,
      seller: seller._id,
      tags: ['gaming', 'mouse', 'rgb'],
      avgRating: 0,
      reviewsCount: 0,
    });
    console.log('Created product:', product.title);

    // Create an order (simulate purchase)
    console.log('Creating order...');
    const order = await Order.create({
      user: buyer._id,
      items: [{
        product: product._id,
        seller: seller._id,
        name: product.title,
        price: product.price,
        quantity: 1,
      }],
      subtotal: product.price,
      shipping: 10000,
      total: product.price + 10000,
      status: { status: 'pending' },
      shippingAddress: 'Jl. Test 123, Jakarta, DKI Jakarta, 12345, Indonesia',
    });
    console.log('Created order:', order._id);

    // Emit OrderPlaced notification
    await emitEventViaAPI({
      type: 'ORDER_PLACED',
      userId: (buyer._id as any).toString(),
      orderId: (order._id as any).toString(),
      total: product.price,
      sellerId: (seller._id as any).toString(),
      data: {
        productName: product.title,
        quantity: 1,
        totalAmount: product.price,
      },
    });
    console.log('Emitted OrderPlaced notification');

    // Simulate payment confirmation
    console.log('Simulating payment confirmation...');
    await Order.findByIdAndUpdate(order._id, { status: { status: 'paid', paidAt: new Date().toISOString() } });

    await emitEventViaAPI({
      type: 'PAYMENT_SUCCESS',
      userId: (buyer._id as any).toString(),
      orderId: (order._id as any).toString(),
      amount: product.price,
      sellerId: (seller._id as any).toString(),
      data: {
        orderId: (order._id as any).toString(),
        amount: product.price,
      },
    });
    console.log('Emitted PaymentConfirmed notification');

    // Simulate order shipping
    console.log('Simulating order shipping...');
    await Order.findByIdAndUpdate(order._id, { status: { status: 'shipped', shippedAt: new Date().toISOString(), tracking: 'TRK123456789' } });

    await emitEventViaAPI({
      type: 'ORDER_SHIPPED',
      userId: (buyer._id as any).toString(),
      orderId: (order._id as any).toString(),
      trackingNumber: 'TRK123456789',
      sellerId: (seller._id as any).toString(),
      data: {
        orderId: (order._id as any).toString(),
        trackingNumber: 'TRK123456789',
      },
    });
    console.log('Emitted OrderShipped notification');

    console.log('\n=== Test Data Created ===');
    console.log('Seller ID:', seller._id);
    console.log('Buyer ID:', buyer._id);
    console.log('Product ID:', product._id);
    console.log('Order ID:', order._id);

    console.log('\n=== API Endpoints to Test ===');
    console.log('Buyer notifications:', `GET /api/notifications/${buyer._id}`);
    console.log('Seller notifications:', `GET /api/notifications/seller/${seller._id}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testNotifications();