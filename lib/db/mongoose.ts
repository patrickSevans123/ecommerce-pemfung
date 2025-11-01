import mongoose from 'mongoose';

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // allow global caching across hot-reloads in development
  var _mongoose: MongooseCache | undefined;
}

const MONGO_USER = process.env.MONGO_USER;
const MONGO_PASS = process.env.MONGO_PASS;
const MONGO_HOST = process.env.MONGO_HOST || 'cluster0.example.mongodb.net';
const MONGO_DB = process.env.MONGO_DB || 'ecommerce';

if (!MONGO_USER || !MONGO_PASS) {
  // we don't throw here so that local type-checks and client-side imports don't fail
  // actual connection attempts will throw if variables are missing
}

const uri =
  process.env.MONGO_URI ||
  `mongodb+srv://${encodeURIComponent(MONGO_USER || '')}:${encodeURIComponent(MONGO_PASS || '')}@${MONGO_HOST}/${MONGO_DB}?retryWrites=true&w=majority`;

const cached: MongooseCache = global._mongoose || { conn: null, promise: null };
global._mongoose = cached;

export async function connect() {
  if (cached.conn) return cached.conn;
  if (!uri) throw new Error('MONGO_URI or MONGO_USER/MONGO_PASS must be set in environment');

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri).then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default mongoose;
