import dotenv from 'dotenv';
import path from 'path';
import { connect } from '../lib/db/mongoose';
import Notification from '../lib/db/models/notification.js';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function clearNotifications() {
  try {
    await connect();
    console.log('Connected to MongoDB');

    const result = await Notification.deleteMany({});
    console.log(`Deleted ${result.deletedCount} notifications`);

    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error clearing notifications:', error);
  }
}

clearNotifications();