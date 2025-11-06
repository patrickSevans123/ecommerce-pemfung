import dotenv from 'dotenv';
import path from 'path';
import { connect } from '../lib/db/mongoose';
import User from '../lib/db/models/user';
import Product from '../lib/db/models/product';
import Review from '../lib/db/models/review';
import PromoCode from '../lib/db/models/promoCode';
import BalanceEvent from '../lib/db/models/balanceEvent';
import Cart from '../lib/db/models/cart';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Seed data
const users = [
  { email: 'john@example.com', name: 'John Doe' },
  { email: 'jane@example.com', name: 'Jane Smith' },
  { email: 'bob@example.com', name: 'Bob Johnson' },
  { email: 'alice@example.com', name: 'Alice Williams' },
  { email: 'charlie@example.com', name: 'Charlie Brown' },
];

const products = [
  {
    title: 'Gaming Laptop Pro',
    description: 'High-performance gaming laptop with RTX 4090',
    price: 25000000,
    category: 'Electronics',
    images: ['https://via.placeholder.com/300?text=Gaming+Laptop'],
    stock: 15,
    sku: 'LAPTOP-001',
    tags: ['gaming', 'laptop', 'high-performance'],
  },
  {
    title: 'Wireless Headphones',
    description: 'Premium noise-cancelling wireless headphones',
    price: 2500000,
    category: 'Electronics',
    images: ['https://via.placeholder.com/300?text=Headphones'],
    stock: 50,
    sku: 'AUDIO-001',
    tags: ['audio', 'wireless', 'noise-cancelling'],
  },
  {
    title: 'USB-C Hub',
    description: '7-in-1 USB-C hub with multiple ports',
    price: 450000,
    category: 'Accessories',
    images: ['https://via.placeholder.com/300?text=USB+Hub'],
    stock: 100,
    sku: 'ACC-001',
    tags: ['usb', 'hub', 'accessories'],
  },
  {
    title: 'Mechanical Keyboard',
    description: 'RGB Mechanical Keyboard with Cherry MX switches',
    price: 1500000,
    category: 'Electronics',
    images: ['https://via.placeholder.com/300?text=Keyboard'],
    stock: 30,
    sku: 'KEYS-001',
    tags: ['keyboard', 'mechanical', 'gaming'],
  },
  {
    title: 'External SSD 1TB',
    description: 'High-speed external SSD with 1TB capacity',
    price: 1200000,
    category: 'Storage',
    images: ['https://via.placeholder.com/300?text=External+SSD'],
    stock: 25,
    sku: 'STOR-001',
    tags: ['storage', 'ssd', 'external'],
  },
  {
    title: '4K Webcam',
    description: 'Professional 4K webcam for streaming',
    price: 3000000,
    category: 'Electronics',
    images: ['https://via.placeholder.com/300?text=Webcam'],
    stock: 20,
    sku: 'WEB-001',
    tags: ['webcam', '4k', 'streaming'],
  },
  {
    title: 'Laptop Stand',
    description: 'Ergonomic aluminum laptop stand',
    price: 350000,
    category: 'Accessories',
    images: ['https://via.placeholder.com/300?text=Laptop+Stand'],
    stock: 60,
    sku: 'ACC-002',
    tags: ['stand', 'ergonomic', 'accessories'],
  },
  {
    title: 'Portable Monitor',
    description: '15.6 inch portable USB-C monitor',
    price: 2800000,
    category: 'Electronics',
    images: ['https://via.placeholder.com/300?text=Portable+Monitor'],
    stock: 12,
    sku: 'MON-001',
    tags: ['monitor', 'portable', 'usb-c'],
  },
];

const promoCodes = [
  {
    code: 'WELCOME20',
    description: '20% off for new users',
    discount: { kind: 'percentage', percent: 20 },
    conditions: [{ kind: 'min_purchase_amount', amount: 500000 }],
    usageLimit: 1000,
    active: true,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  },
  {
    code: 'SUMMER25',
    description: '25% off summer sale',
    discount: { kind: 'percentage', percent: 25 },
    conditions: [{ kind: 'category_includes', categories: ['Electronics'] }],
    usageLimit: 500,
    active: true,
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
  },
  {
    code: 'FREESHIP50',
    description: 'Free shipping on orders over 50k',
    discount: { kind: 'free_shipping' },
    conditions: [{ kind: 'min_purchase_amount', amount: 5000000 }],
    freeShippingAmount: 5000000,
    usageLimit: 2000,
    active: true,
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
  },
  {
    code: 'FIXED500K',
    description: 'Flat 500k off',
    discount: { kind: 'fixed', amount: 500000 },
    conditions: [{ kind: 'min_purchase_amount', amount: 3000000 }],
    usageLimit: 300,
    active: true,
    expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
  },
  {
    code: 'EXPIRED10',
    description: 'Expired promo (10% off)',
    discount: { kind: 'percentage', percent: 10 },
    conditions: [],
    usageLimit: 100,
    active: false,
    expiresAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
  },
];

async function seedDatabase() {
  try {
    console.log('Connecting to database...');
    await connect();

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Product.deleteMany({});
    await Review.deleteMany({});
    await PromoCode.deleteMany({});
    await BalanceEvent.deleteMany({});
    await Cart.deleteMany({});

    // Seed users
    console.log('Seeding users...');
    const createdUsers = await User.insertMany(users);
    console.log(`✓ Created ${createdUsers.length} users`);

    // Seed products
    console.log('Seeding products...');
    const createdProducts = await Product.insertMany(products);
    console.log(`✓ Created ${createdProducts.length} products`);

    // Seed reviews
    console.log('Seeding reviews...');
    const reviews = [];
    for (let i = 0; i < createdProducts.length; i++) {
      const product = createdProducts[i];
      const reviewCount = Math.floor(Math.random() * 5) + 1; // 1-5 reviews per product

      for (let j = 0; j < reviewCount; j++) {
        const randomUser = createdUsers[Math.floor(Math.random() * createdUsers.length)];
        reviews.push({
          product: product._id,
          user: randomUser._id,
          rating: Math.floor(Math.random() * 5) + 1,
          title: `Review ${j + 1}`,
          comment: `This is a great product! I really enjoyed using it. Rating: ${Math.floor(Math.random() * 5) + 1}/5`,
        });
      }
    }
    await Review.insertMany(reviews);
    console.log(`✓ Created ${reviews.length} reviews`);

    // Seed promo codes
    console.log('Seeding promo codes...');
    const createdPromoCodes = await PromoCode.insertMany(promoCodes);
    console.log(`✓ Created ${createdPromoCodes.length} promo codes`);

    // Seed balance events
    console.log('Seeding balance events...');
    const balanceEvents = [];
    for (const user of createdUsers) {
      // Each user gets some balance events
      const eventCount = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < eventCount; i++) {
        const eventType = ['credit', 'debit'][Math.floor(Math.random() * 2)];
        balanceEvents.push({
          user: user._id,
          amount: Math.floor(Math.random() * 1000000) + 100000,
          type: eventType,
          reference: `REF-${Date.now()}-${i}`,
        });
      }
    }
    await BalanceEvent.insertMany(balanceEvents);
    console.log(`✓ Created ${balanceEvents.length} balance events`);

    // Seed carts (empty carts for each user)
    console.log('Seeding carts...');
    const carts = createdUsers.map((user) => ({
      user: user._id,
      items: [],
    }));
    await Cart.insertMany(carts);
    console.log(`✓ Created ${carts.length} empty carts`);

    console.log('\n✅ Database seeded successfully!');
    console.log('\nSeed Summary:');
    console.log(`  - Users: ${createdUsers.length}`);
    console.log(`  - Products: ${createdProducts.length}`);
    console.log(`  - Reviews: ${reviews.length}`);
    console.log(`  - Promo Codes: ${createdPromoCodes.length}`);
    console.log(`  - Balance Events: ${balanceEvents.length}`);
    console.log(`  - Carts: ${carts.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();