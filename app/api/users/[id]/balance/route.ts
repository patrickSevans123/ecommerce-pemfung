import { NextRequest } from 'next/server';
import { connect } from '../../../../../lib/db/mongoose';
import BalanceEvent from '../../../../../lib/db/models/balanceEvent';
import User from '../../../../../lib/db/models/user';
import { sumBalanceEvents } from '@/lib/balance';
import { successResponse, notFoundError } from '@/lib/api';

// GET /api/users/[id]/balance - Get user's current balance
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  await connect();

  // Verify user exists
  const userExists = await User.exists({ _id: id });
  if (!userExists) {
    return notFoundError('User', id);
  }

  // Fetch all balance events for the user
  const balanceEvents = await BalanceEvent.find({ user: id })
    .select('amount type')
    .lean();

  // Calculate current balance using functional approach
  const currentBalance = sumBalanceEvents(balanceEvents);

  return successResponse({
    userId: id,
    balance: currentBalance,
    eventCount: balanceEvents.length,
  });
}