import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connect } from '../../../lib/db/mongoose';
import BalanceEvent from '../../../lib/db/models/balanceEvent';
import User from '../../../lib/db/models/user';

const createBalanceEventSchema = z.object({
  userId: z.string().min(1),
  amount: z.number(),
  type: z.enum(['deposit', 'withdrawn', 'payment']),
  reference: z.string().optional(),
});

// GET /api/balance-events - List balance events
export async function GET(request: NextRequest) {
  await connect();

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const type = searchParams.get('type');

  const filter: Record<string, unknown> = {};
  if (userId) {
    filter.user = userId;
  }
  if (type) {
    filter.type = type;
  }

  const balanceEvents = await BalanceEvent.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return NextResponse.json(balanceEvents);
}

// POST /api/balance-events - Create a new balance event
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createBalanceEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
  }

  await connect();

  // Verify user exists
  const userExists = await User.exists({ _id: parsed.data.userId });
  if (!userExists) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const created = await BalanceEvent.create({
    user: parsed.data.userId,
    amount: parsed.data.amount,
    type: parsed.data.type,
    reference: parsed.data.reference,
  });

  return NextResponse.json(created, { status: 201 });
}
