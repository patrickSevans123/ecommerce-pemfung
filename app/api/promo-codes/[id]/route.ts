import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connect } from '../../../../lib/db/mongoose';
import PromoCode from '../../../../lib/db/models/promoCode';

const discountSchema = z.object({
  kind: z.enum(['percentage', 'fixed', 'free_shipping']),
  percent: z.number().min(0).max(100).optional(),
  amount: z.number().nonnegative().optional(),
});

const conditionSchema = z.object({
  kind: z.enum(['min_purchase_amount', 'category_includes']),
  amount: z.number().nonnegative().optional(),
  categories: z.array(z.string()).optional(),
});

const updatePromoCodeSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  description: z.string().optional(),
  discount: discountSchema.optional(),
  conditions: z.array(conditionSchema).optional(),
  freeShippingAmount: z.number().nonnegative().optional(),
  expiresAt: z.iso.datetime().optional(),
  usageLimit: z.number().int().positive().optional(),
  active: z.boolean().optional(),
});

// GET /api/promo-codes/[id] - Get a single promo code
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  await connect();

  const promoCode = await PromoCode.findById(id).lean();

  if (!promoCode) {
    return NextResponse.json({ error: 'Promo code not found' }, { status: 404 });
  }

  return NextResponse.json(promoCode);
}

// PATCH /api/promo-codes/[id] - Update a promo code
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updatePromoCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
  }

  await connect();

  // If updating code, check for duplicates
  if (parsed.data.code) {
    const existing = await PromoCode.findOne({ code: parsed.data.code, _id: { $ne: id } });
    if (existing) {
      return NextResponse.json({ error: 'Promo code already exists' }, { status: 409 });
    }
  }

  const updateData = { ...parsed.data };

  const updated = await PromoCode.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).lean();

  if (!updated) {
    return NextResponse.json({ error: 'Promo code not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

// DELETE /api/promo-codes/[id] - Delete a promo code
export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  await connect();

  const deleted = await PromoCode.findByIdAndDelete(id);

  if (!deleted) {
    return NextResponse.json({ error: 'Promo code not found' }, { status: 404 });
  }

  return NextResponse.json({ message: 'Promo code deleted successfully' });
}
