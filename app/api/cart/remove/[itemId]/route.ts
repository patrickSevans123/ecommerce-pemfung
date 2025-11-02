import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connect } from '../../../../../lib/db/mongoose';
import CartModel from '../../../../../lib/db/models/cart';
import {
  cartDocToInput,
  buildCartAfterRemove,
  persistCart,
  loadCart,
  serializeCartSnapshot,
} from '../../../../../lib/cart/service';
import type { CartSnapshot } from '../../../../../lib/cart/service';
import { isFailure } from '../../../../../lib/fp/validation';

const removeSchema = z.object({
  userId: z.string().min(1),
});

export async function DELETE(request: NextRequest, context: { params: Promise<{ itemId: string }> }) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const parsed = removeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
  }

  const { itemId } = await context.params;

  await connect();

  const cartDoc = await CartModel.findOne({ user: parsed.data.userId }).lean<CartSnapshot>();
  if (!cartDoc) {
    return NextResponse.json({ cart: serializeCartSnapshot({ user: parsed.data.userId, items: [] }) }, { status: 200 });
  }

  const cartInput = cartDocToInput(cartDoc);
  const nextCartInput = buildCartAfterRemove(cartInput, itemId);

  const validation = await persistCart(parsed.data.userId, nextCartInput, cartDoc.items ?? [], { allowEmpty: true });
  if (isFailure(validation)) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const freshCart = await loadCart(parsed.data.userId);
  return NextResponse.json({ cart: serializeCartSnapshot(freshCart) }, { status: 200 });
}
