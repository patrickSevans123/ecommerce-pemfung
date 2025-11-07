import { NextRequest } from 'next/server';
import { connect } from '../../../../lib/db/mongoose';
import CartModel from '../../../../lib/db/models/cart';
import { serializeCartSnapshot } from '../../../../lib/cart/service';
import type { CartSnapshot } from '../../../../lib/cart/service';
import { successResponse } from '@/lib/api';

export async function GET(_request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;

  await connect();

  const cartDoc = (await CartModel.findOne({ user: userId }).lean<CartSnapshot>()) ?? null;

  if (!cartDoc) {
    const created = await CartModel.create({ user: userId, items: [] });
    return successResponse({ cart: serializeCartSnapshot(created.toObject() as CartSnapshot) });
  }

  return successResponse({ cart: serializeCartSnapshot(cartDoc) });
}
