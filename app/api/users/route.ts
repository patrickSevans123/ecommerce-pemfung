import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connect } from '../../../lib/db/mongoose';
import User from '../../../lib/db/models/user';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(['seller', 'buyer']).default('buyer'),
});

// GET /api/users - List all users
export async function GET(request: NextRequest) {
  await connect();

  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  const filter: Record<string, unknown> = {};
  if (email) {
    filter.email = email;
  }

  const users = await User.find(filter).sort({ createdAt: -1 }).limit(100).lean();

  return NextResponse.json(users);
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
  }

  await connect();

  // Check if user already exists
  const existing = await User.findOne({ email: parsed.data.email });
  if (existing) {
    return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
  }

  const created = await User.create(parsed.data);

  return NextResponse.json(created, { status: 201 });
}
