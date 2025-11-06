import dotenv from 'dotenv';
import path from 'path';
import { connect } from '../lib/db/mongoose';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testConnection() {
  try {
    console.log('🔌 Testing MongoDB connection...');
    console.log(`Connection URI: ${process.env.MONGO_URI}`);

    const conn = await connect();
    console.log('✅ Connected successfully!');

    // Get database info
    const admin = conn.connection.db?.admin();
    if (admin) {
      const status = await admin.ping();
      console.log('✅ Database ping successful:', status);
    }

    // List collections
    const collections = await conn.connection.db?.listCollections().toArray();
    console.log('\n📦 Existing collections:');
    if (collections && collections.length > 0) {
      collections.forEach((col) => console.log(`  - ${col.name}`));
    } else {
      console.log('  (none)');
    }

    console.log('\n✅ Connection test passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    process.exit(1);
  }
}

testConnection();