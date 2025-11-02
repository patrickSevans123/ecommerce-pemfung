import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connect } from '../../../../lib/db/mongoose';
import CartModel from '../../../../lib/db/models/cart';
import {
  cartDocToInput,
  buildCartAfterUpdate,
  persistCart,
  loadCart,
  serializeCartSnapshot,
} from '../../../../lib/cart/service';
import type { CartSnapshot } from '../../../../lib/cart/service';
import { isFailure } from '../../../../lib/fp/validation';

const updateSchema = z.object({
  userId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
  }

  await connect();

  const cartDoc = await CartModel.findOne({ user: parsed.data.userId }).lean<CartSnapshot>();
  const baseCartDoc: CartSnapshot = cartDoc ?? { user: parsed.data.userId, items: [] };
  const cartInput = cartDocToInput(baseCartDoc);
  const nextCartInput = buildCartAfterUpdate({
    userId: cartInput.userId,
    items: cartInput.items.map((item) => ({ ...item })),
  }, parsed.data);

  const validation = await persistCart(parsed.data.userId, nextCartInput, cartDoc?.items ?? []);
  if (isFailure(validation)) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const freshCart = await loadCart(parsed.data.userId);
  return NextResponse.json({ cart: serializeCartSnapshot(freshCart) }, { status: 200 });
}
