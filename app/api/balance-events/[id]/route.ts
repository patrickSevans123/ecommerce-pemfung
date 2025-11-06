import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connect } from '../../../../lib/db/mongoose';
import BalanceEvent from '../../../../lib/db/models/balanceEvent';

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
    return NextResponse.json({ error: 'Balance event not found' }, { status: 404 });
  }

  return NextResponse.json(balanceEvent);
}

// PATCH /api/balance-events/[id] - Update a balance event
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateBalanceEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
  }

  await connect();

  const updated = await BalanceEvent.findByIdAndUpdate(
    id,
    { $set: parsed.data },
    { new: true, runValidators: true }
  ).lean();

  if (!updated) {
    return NextResponse.json({ error: 'Balance event not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

// DELETE /api/balance-events/[id] - Delete a balance event
export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  await connect();

  const deleted = await BalanceEvent.findByIdAndDelete(id);

  if (!deleted) {
    return NextResponse.json({ error: 'Balance event not found' }, { status: 404 });
  }

  return NextResponse.json({ message: 'Balance event deleted successfully' });
}
