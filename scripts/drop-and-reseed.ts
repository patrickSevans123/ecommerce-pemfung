import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { connect } from '../lib/db/mongoose';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function dropAndReseed() {
  try {
    console.log('Connecting to database...');
    await connect();

    console.log('⚠️  Dropping entire database...');
    await mongoose.connection.db?.dropDatabase();
    console.log('✓ Database dropped');

    console.log('\n🔄 Now run: npm run seed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

dropAndReseed();