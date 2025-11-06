import { NextRequest, NextResponse } from 'next/server';
import { connect } from '../../../../lib/db/mongoose';
import CartModel from '../../../../lib/db/models/cart';
import { serializeCartSnapshot } from '../../../../lib/cart/service';
import type { CartSnapshot } from '../../../../lib/cart/service';

export async function GET(_request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;

  await connect();

  const cartDoc = (await CartModel.findOne({ user: userId }).lean<CartSnapshot>()) ?? null;

  if (!cartDoc) {
    const created = await CartModel.create({ user: userId, items: [] });
    return NextResponse.json({ cart: serializeCartSnapshot(created.toObject() as CartSnapshot) }, { status: 200 });
  }

  return NextResponse.json({ cart: serializeCartSnapshot(cartDoc) }, { status: 200 });
}
