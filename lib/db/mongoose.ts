import mongoose from 'mongoose';

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var _mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongoose || { conn: null, promise: null };
global._mongoose = cached;

export async function connect() {
  if (cached.conn) return cached.conn;

  // Read environment variables at runtime, not at module load time
  const MONGO_USER = (process.env.MONGO_USER || '').trim();
  const MONGO_PASS = (process.env.MONGO_PASS || '').trim();
  const MONGO_HOST = (process.env.MONGO_HOST || 'cluster0.example.mongodb.net').trim();
  const MONGO_DB = (process.env.MONGO_DB || 'ecommerce').trim();

  // Prioritize MONGO_URI if available, otherwise construct from user/pass
  let uri = '';

  if (process.env.MONGO_URI) {
    uri = process.env.MONGO_URI.trim();
  } else if (MONGO_USER && MONGO_PASS) {
    uri = `mongodb+srv://${encodeURIComponent(MONGO_USER)}:${encodeURIComponent(MONGO_PASS)}@${MONGO_HOST}/${MONGO_DB}?retryWrites=true&w=majority`;
  }

  if (!uri) throw new Error('MONGO_URI or MONGO_USER/MONGO_PASS must be set in environment');

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, { dbName: MONGO_DB }).then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default mongoose;
