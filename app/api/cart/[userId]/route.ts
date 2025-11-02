import { NextRequest, NextResponse } from 'next/server';
import { connect } from '../../../../lib/db/mongoose';
import CartModel from '../../../../lib/db/models/cart';
import { serializeCartSnapshot } from '../../../../lib/cart/service';
import type { CartSnapshot } from '../../../../lib/cart/service';

const CART_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

const computeExpiresAt = () => new Date(Date.now() + CART_EXPIRATION_MS);

export async function GET(_request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;

  await connect();

  const cartDoc = (await CartModel.findOne({ user: userId }).lean<CartSnapshot>()) ?? null;

  if (!cartDoc) {
    const created = await CartModel.create({ user: userId, items: [], expiresAt: computeExpiresAt() });
    return NextResponse.json({ cart: serializeCartSnapshot(created.toObject() as CartSnapshot) }, { status: 200 });
  }

  const now = new Date();
  if (cartDoc.expiresAt && cartDoc.expiresAt < now) {
    const newExpiry = computeExpiresAt();
    await CartModel.updateOne(
      { _id: cartDoc._id },
      { $set: { items: [], expiresAt: newExpiry, updatedAt: now } }
    );
    return NextResponse.json(
      { cart: serializeCartSnapshot({ ...cartDoc, items: [], expiresAt: newExpiry }) },
      { status: 200 }
    );
  }

  return NextResponse.json({ cart: serializeCartSnapshot(cartDoc) }, { status: 200 });
}
