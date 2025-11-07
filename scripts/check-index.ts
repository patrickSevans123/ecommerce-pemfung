import dotenv from 'dotenv';
import path from 'path';
import { connect } from '../lib/db/mongoose';
import { User, Product, Cart, Order, Review, PromoCode, BalanceEvent } from '../lib/db/models';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyIndexes() {
  try {
    await connect();

    const models = { User, Product, Cart, Order, Review, PromoCode, BalanceEvent };

    for (const [name, model] of Object.entries(models)) {
      const indexes = await model.collection.getIndexes();
      console.log(`\n${name} Indexes:`);
      console.log(JSON.stringify(indexes, null, 2));
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verifyIndexes();