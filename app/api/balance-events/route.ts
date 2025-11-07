import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connect } from '../../../lib/db/mongoose';
import BalanceEvent from '../../../lib/db/models/balanceEvent';
import User from '../../../lib/db/models/user';
import {
  validateRequestBody,
  handleValidation,
  successResponse,
  createdResponse,
  notFoundError,
} from '@/lib/api';

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

  return successResponse(balanceEvents);
}

// POST /api/balance-events - Create a new balance event
export async function POST(request: NextRequest) {
  return handleValidation(
    await validateRequestBody(request, createBalanceEventSchema),
    async (data) => {
      await connect();

      // Verify user exists
      const userExists = await User.exists({ _id: data.userId });
      if (!userExists) {
        return notFoundError('User', data.userId);
      }

      const created = await BalanceEvent.create({
        user: data.userId,
        amount: data.amount,
        type: data.type,
        reference: data.reference,
      });

      return createdResponse(created);
    }
  );
}
