import dotenv from 'dotenv';
import path from 'path';
import { connect } from '../lib/db/mongoose';
import User from '../lib/db/models/user';
import Product from '../lib/db/models/product';
import Review from '../lib/db/models/review';
import PromoCode from '../lib/db/models/promoCode';
import Order from '../lib/db/models/order';
import BalanceEvent from '../lib/db/models/balanceEvent';
import Cart from '../lib/db/models/cart';
import { hashPassword } from '../lib/auth/password';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function seed() {
  try {
    await connect();
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Review.deleteMany({}),
      PromoCode.deleteMany({}),
      Order.deleteMany({}),
      BalanceEvent.deleteMany({}),
      Cart.deleteMany({}),
    ]);
    console.log('Existing data cleared');

    // Hash password for demo users
    console.log('Hashing passwords...');
    const defaultPassword = await hashPassword('password123');
    console.log('Passwords hashed');

    // Create Users
    console.log('Creating users...');
    const users = await User.insertMany([
      {
        email: 'seller1@example.com',
        name: 'John Seller',
        password: defaultPassword,
        role: 'seller',
      },
      {
        email: 'seller2@example.com',
        name: 'Jane Merchant',
        password: defaultPassword,
        role: 'seller',
      },
      {
        email: 'buyer1@example.com',
        name: 'Alice Buyer',
        password: defaultPassword,
        role: 'buyer',
      },
      {
        email: 'buyer2@example.com',
        name: 'Bob Customer',
        password: defaultPassword,
        role: 'buyer',
      },
      {
        email: 'buyer3@example.com',
        name: 'Charlie Shopper',
        password: defaultPassword,
        role: 'buyer',
      },
    ]);
    console.log(`Created ${users.length} users`);

    const [seller1, seller2, buyer1, buyer2, buyer3] = users;

    // Create Products
    console.log('Creating products...');
    const products = await Product.insertMany([
      {
        title: 'Wireless Bluetooth Headphones',
        description: 'High-quality wireless headphones with noise cancellation and 30-hour battery life',
        price: 89.99,
        category: 'Electronics',
        images: [
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
          'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500',
        ],
        stock: 50,
        seller: seller1._id,
        tags: ['bluetooth', 'wireless', 'audio', 'headphones'],
        avgRating: 0,
        reviewsCount: 0,
      },
      {
        title: 'Smart Watch Series 5',
        description: 'Advanced smartwatch with fitness tracking, heart rate monitor, and GPS',
        price: 249.99,
        category: 'Electronics',
        images: [
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
          'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500',
        ],
        stock: 30,
        seller: seller1._id,
        tags: ['smartwatch', 'fitness', 'wearable', 'health'],
        avgRating: 0,
        reviewsCount: 0,
      },
      {
        title: 'Ergonomic Office Chair',
        description: 'Comfortable office chair with lumbar support and adjustable height',
        price: 199.99,
        category: 'Furniture',
        images: ['https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=500'],
        stock: 20,
        seller: seller2._id,
        tags: ['office', 'chair', 'furniture', 'ergonomic'],
        avgRating: 0,
        reviewsCount: 0,
      },
      {
        title: 'Laptop Stand Aluminum',
        description: 'Sleek aluminum laptop stand for improved posture and cooling',
        price: 39.99,
        category: 'Electronics',
        images: ['https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500'],
        stock: 100,
        seller: seller2._id,
        tags: ['laptop', 'stand', 'aluminum', 'desk'],
        avgRating: 0,
        reviewsCount: 0,
      },
      {
        title: 'Mechanical Keyboard RGB',
        description: 'Gaming mechanical keyboard with RGB lighting and custom switches',
        price: 129.99,
        category: 'Electronics',
        images: [
          'https://images.unsplash.com/photo-1595225476474-87563907a212?w=500',
          'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=500',
        ],
        stock: 45,
        seller: seller1._id,
        tags: ['keyboard', 'mechanical', 'gaming', 'rgb'],
        avgRating: 0,
        reviewsCount: 0,
      },
      {
        title: 'Wireless Mouse',
        description: 'Precision wireless mouse with ergonomic design and long battery life',
        price: 29.99,
        category: 'Electronics',
        images: ['https://images.unsplash.com/photo-1527814050087-3793815479db?w=500'],
        stock: 75,
        seller: seller1._id,
        tags: ['mouse', 'wireless', 'ergonomic', 'computer'],
        avgRating: 0,
        reviewsCount: 0,
      },
      {
        title: 'Desk Lamp LED',
        description: 'Modern LED desk lamp with adjustable brightness and color temperature',
        price: 49.99,
        category: 'Furniture',
        images: ['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500'],
        stock: 60,
        seller: seller2._id,
        tags: ['lamp', 'led', 'desk', 'lighting'],
        avgRating: 0,
        reviewsCount: 0,
      },
      {
        title: 'USB-C Hub 7-in-1',
        description: '7-in-1 USB-C hub with HDMI, USB 3.0, SD card reader, and more',
        price: 34.99,
        category: 'Electronics',
        images: ['https://images.unsplash.com/photo-1625948515291-69613efd103f?w=500'],
        stock: 80,
        seller: seller1._id,
        tags: ['usb', 'hub', 'adapter', 'connectivity'],
        avgRating: 0,
        reviewsCount: 0,
      },
      {
        title: 'Webcam 1080p HD',
        description: 'Full HD webcam with auto-focus and noise-cancelling microphone',
        price: 69.99,
        category: 'Electronics',
        images: ['https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=500'],
        stock: 40,
        seller: seller2._id,
        tags: ['webcam', 'camera', 'video', 'streaming'],
        avgRating: 0,
        reviewsCount: 0,
      },
      {
        title: 'Portable External SSD 1TB',
        description: 'Fast and compact 1TB external SSD with USB 3.2 Gen 2',
        price: 119.99,
        category: 'Electronics',
        images: ['https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=500'],
        stock: 35,
        seller: seller1._id,
        tags: ['ssd', 'storage', 'external', 'portable'],
        avgRating: 0,
        reviewsCount: 0,
      },
    ]);
    console.log(`Created ${products.length} products`);

    // Create Reviews
    console.log('Creating reviews...');
    const reviews = await Review.insertMany([
      {
        product: products[0]._id as string,
        user: buyer1._id,
        rating: 5,
        comment: 'Excellent sound quality! Very comfortable to wear for long periods.',
      },
      {
        product: products[0]._id as string,
        user: buyer2._id,
        rating: 4,
        comment: 'Great headphones, but the battery life could be better.',
      },
      {
        product: products[0]._id as string,
        user: buyer3._id,
        rating: 5,
        comment: 'Best headphones I have ever owned. Highly recommend!',
      },
      {
        product: products[1]._id as string,
        user: buyer1._id,
        rating: 5,
        comment: 'Amazing smartwatch with all the features I need.',
      },
      {
        product: products[1]._id as string,
        user: buyer3._id,
        rating: 4,
        comment: 'Good watch, but a bit pricey for what it offers.',
      },
      {
        product: products[2]._id as string,
        user: buyer2._id,
        rating: 5,
        comment: 'Very comfortable chair. My back pain is gone!',
      },
      {
        product: products[3]._id as string,
        user: buyer1._id,
        rating: 4,
        comment: 'Solid laptop stand. Does what it is supposed to do.',
      },
      {
        product: products[4]._id as string,
        user: buyer2._id,
        rating: 5,
        comment: 'The RGB lighting is amazing and the switches feel great!',
      },
      {
        product: products[4]._id as string,
        user: buyer3._id,
        rating: 5,
        comment: 'Perfect for gaming. Very responsive keys.',
      },
      {
        product: products[5]._id as string,
        user: buyer1._id,
        rating: 4,
        comment: 'Good mouse, but could be a bit more ergonomic.',
      },
    ]);
    console.log(`Created ${reviews.length} reviews`);

    // Update product ratings based on reviews
    console.log('Updating product ratings...');
    const reviewsByProduct = reviews.reduce((acc, review) => {
      const productId = review.product.toString();
      if (!acc[productId]) {
        acc[productId] = [];
      }
      acc[productId].push(review);
      return acc;
    }, {} as Record<string, typeof reviews>);

    for (const [productId, productReviews] of Object.entries(reviewsByProduct)) {
      const avgRating = productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;
      await Product.findByIdAndUpdate(productId, {
        avgRating: Number(avgRating.toFixed(2)),
        reviewsCount: productReviews.length,
      });
    }
    console.log('Product ratings updated');

    // Create Promo Codes
    console.log('Creating promo codes...');
    const promoCodes = await PromoCode.insertMany([
      {
        code: 'WELCOME10',
        description: '10% off for new customers',
        discount: {
          kind: 'percentage',
          percent: 10,
        },
        conditions: [
          {
            kind: 'min_purchase_amount',
            amount: 50,
            categories: [],
          },
        ],
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        usageLimit: 100,
        usedCount: 0,
        active: true,
      },
      {
        code: 'SAVE20',
        description: '$20 off on orders over $100',
        discount: {
          kind: 'fixed',
          amount: 20,
        },
        conditions: [
          {
            kind: 'min_purchase_amount',
            amount: 100,
            categories: [],
          },
        ],
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        usageLimit: 50,
        usedCount: 0,
        active: true,
      },
      {
        code: 'ELECTRONICS15',
        description: '15% off on all electronics',
        discount: {
          kind: 'percentage',
          percent: 15,
        },
        conditions: [
          {
            kind: 'category_includes',
            categories: ['Electronics'],
            amount: 0,
          },
        ],
        expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
        usageLimit: 200,
        usedCount: 5,
        active: true,
      },
      {
        code: 'FREESHIP',
        description: 'Free shipping on all orders',
        discount: {
          kind: 'free_shipping',
        },
        conditions: [],
        freeShippingAmount: 10000,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        usageLimit: 500,
        usedCount: 25,
        active: true,
      },
      {
        code: 'EXPIRED50',
        description: 'Expired promo code',
        discount: {
          kind: 'percentage',
          percent: 50,
        },
        conditions: [],
        expiresAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Expired 7 days ago
        usageLimit: 10,
        usedCount: 8,
        active: false,
      },
    ]);
    console.log(`Created ${promoCodes.length} promo codes`);

    // Create Balance Events
    console.log('Creating balance events...');
    const balanceEvents = await BalanceEvent.insertMany([
      {
        user: buyer1._id,
        amount: 500.0,
        type: 'deposit',
        reference: 'Initial deposit',
      },
      {
        user: buyer2._id,
        amount: 1000.0,
        type: 'deposit',
        reference: 'Initial deposit',
      },
      {
        user: buyer3._id,
        amount: 750.0,
        type: 'deposit',
        reference: 'Initial deposit',
      },
      {
        user: buyer1._id,
        amount: 250.0,
        type: 'deposit',
        reference: 'Top-up balance',
      },
    ]);
    console.log(`Created ${balanceEvents.length} balance events`);

    // Create Orders
    console.log('Creating orders...');
    const orders = await Order.insertMany([
      {
        user: buyer1._id,
        items: [
          {
            product: products[0]._id,
            seller: seller1._id,
            name: products[0].title,
            price: products[0].price,
            quantity: 1,
          },
          {
            product: products[5]._id,
            seller: seller1._id,
            name: products[5].title,
            price: products[5].price,
            quantity: 2,
          },
        ],
        subtotal: 89.99 + 29.99 * 2,
        shipping: 10000,
        discount: 0,
        total: 89.99 + 29.99 * 2 + 10000,
        status: {
          status: 'delivered',
          paidAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          shippedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          deliveredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        shippingAddress: '123 Main St, City, State 12345',
      },
      {
        user: buyer2._id,
        items: [
          {
            product: products[2]._id,
            seller: seller2._id,
            name: products[2].title,
            price: products[2].price,
            quantity: 1,
          },
        ],
        subtotal: 199.99,
        shipping: 10000,
        discount: 20,
        promoCode: promoCodes[1]._id,
        promoCodeApplied: 'SAVE20',
        total: 199.99 - 20 + 10000,
        status: {
          status: 'shipped',
          paidAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          shippedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          tracking: 'TRACK123456789',
        },
        shippingAddress: '456 Oak Ave, Town, State 67890',
      },
      {
        user: buyer3._id,
        items: [
          {
            product: products[1]._id,
            seller: seller1._id,
            name: products[1].title,
            price: products[1].price,
            quantity: 1,
          },
        ],
        subtotal: 249.99,
        shipping: 10000,
        discount: 0,
        total: 249.99 + 10000,
        status: {
          status: 'paid',
          paidAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        shippingAddress: '789 Pine Rd, Village, State 13579',
      },
      {
        user: buyer1._id,
        items: [
          {
            product: products[4]._id,
            seller: seller1._id,
            name: products[4].title,
            price: products[4].price,
            quantity: 1,
          },
          {
            product: products[3]._id,
            seller: seller2._id,
            name: products[3].title,
            price: products[3].price,
            quantity: 1,
          },
        ],
        subtotal: 129.99 + 39.99,
        shipping: 0,
        discount: 0,
        promoCode: promoCodes[3]._id,
        promoCodeApplied: 'FREESHIP',
        total: 129.99 + 39.99,
        status: {
          status: 'pending',
        },
        shippingAddress: '123 Main St, City, State 12345',
      },
      {
        user: buyer2._id,
        items: [
          {
            product: products[9]._id,
            seller: seller1._id,
            name: products[9].title,
            price: products[9].price,
            quantity: 1,
          },
        ],
        subtotal: 119.99,
        shipping: 10000,
        discount: 17.99,
        promoCode: promoCodes[2]._id,
        promoCodeApplied: 'ELECTRONICS15',
        total: 119.99 - 17.99 + 10000,
        status: {
          status: 'cancelled',
          reason: 'Customer requested cancellation',
        },
        shippingAddress: '456 Oak Ave, Town, State 67890',
      },
    ]);
    console.log(`Created ${orders.length} orders`);

    // Add payment balance events for paid orders
    console.log('Creating payment balance events...');
    const paidOrders = orders.filter((order) =>
      ['paid', 'shipped', 'delivered'].includes(order.status.status)
    );
    const paymentEvents = await BalanceEvent.insertMany(
      paidOrders.map((order) => ({
        user: order.user,
        amount: -order.total,
        type: 'payment',
        reference: `Payment for order ${order._id}`,
      }))
    );
    console.log(`Created ${paymentEvents.length} payment balance events`);

    // Update promo code usage counts
    console.log('Updating promo code usage counts...');
    for (const order of orders) {
      if (order.promoCode) {
        await PromoCode.findByIdAndUpdate(order.promoCode, {
          $inc: { usedCount: 1 },
        });
      }
    }
    console.log('Promo code usage counts updated');

    // Create Carts
    console.log('Creating carts...');
    const carts = await Cart.insertMany([
      {
        user: buyer1._id,
        items: [
          {
            product: products[6]._id,
            quantity: 1,
            addedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          },
          {
            product: products[7]._id,
            quantity: 2,
            addedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          },
        ],
      },
      {
        user: buyer2._id,
        items: [
          {
            product: products[8]._id,
            quantity: 1,
            addedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
          },
        ],
      },
      {
        user: buyer3._id,
        items: [
          {
            product: products[0]._id,
            quantity: 1,
            addedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          },
          {
            product: products[4]._id,
            quantity: 1,
            addedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
          },
          {
            product: products[9]._id,
            quantity: 1,
            addedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          },
        ],
      },
    ]);
    console.log(`Created ${carts.length} carts`);

    console.log('\n✅ Database seeded successfully!');
    console.log('\nSummary:');
    console.log(`- Users: ${users.length}`);
    console.log(`- Products: ${products.length}`);
    console.log(`- Reviews: ${reviews.length}`);
    console.log(`- Promo Codes: ${promoCodes.length}`);
    console.log(`- Orders: ${orders.length}`);
    console.log(`- Carts: ${carts.length}`);
    console.log(`- Balance Events: ${balanceEvents.length + paymentEvents.length}`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();
