import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connect } from '../../../../lib/db/mongoose';
import BalanceEvent from '../../../../lib/db/models/balanceEvent';
import {
  validateRequestBody,
  handleValidation,
  successResponse,
  notFoundError,
} from '@/lib/api';

const updateBalanceEventSchema = z.object({
  amount: z.number().optional(),
  type: z.enum(['deposit', 'withdrawn', 'payment']).optional(),
  reference: z.string().optional(),
});

// GET /api/balance-events/[id] - Get a single balance event
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  await connect();

  const balanceEvent = await BalanceEvent.findById(id).lean();

  if (!balanceEvent) {
    return notFoundError('Balance event', id);
  }

  return successResponse(balanceEvent);
}

// PATCH /api/balance-events/[id] - Update a balance event
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  return handleValidation(
    await validateRequestBody(request, updateBalanceEventSchema),
    async (data) => {
      await connect();

      const updated = await BalanceEvent.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
      ).lean();

      if (!updated) {
        return notFoundError('Balance event', id);
      }

      return successResponse(updated);
    }
  );
}

// DELETE /api/balance-events/[id] - Delete a balance event
export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  await connect();

  const deleted = await BalanceEvent.findByIdAndDelete(id);

  if (!deleted) {
    return notFoundError('Balance event', id);
  }

  return successResponse({ message: 'Balance event deleted successfully' });
}
