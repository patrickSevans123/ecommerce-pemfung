import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connect } from '../../../lib/db/mongoose';
import PromoCode from '../../../lib/db/models/promoCode';

const discountSchema = z.object({
  kind: z.enum(['percentage', 'fixed', 'free_shipping', 'buy_x_get_y']),
  percent: z.number().min(0).max(100).optional(),
  amount: z.number().nonnegative().optional(),
  buyQuantity: z.number().int().positive().optional(),
  getQuantity: z.number().int().positive().optional(),
  productId: z.string().optional(),
});

const conditionSchema = z.object({
  kind: z.enum(['min_purchase_amount', 'category_includes', 'product_includes']),
  amount: z.number().nonnegative().optional(),
  categories: z.array(z.string()).optional(),
  productIds: z.array(z.string()).optional(),
});

const createPromoCodeSchema = z.object({
  code: z.string().min(1).max(50),
  description: z.string().optional(),
  discount: discountSchema,
  conditions: z.array(conditionSchema).optional(),
  freeShippingAmount: z.number().nonnegative().optional(),
  expiresAt: z.string().datetime().optional(),
  usageLimit: z.number().int().positive().optional(),
  active: z.boolean().optional(),
});

// GET /api/promo-codes - List all promo codes
export async function GET(request: NextRequest) {
  await connect();

  const { searchParams } = new URL(request.url);
  const active = searchParams.get('active');
  const code = searchParams.get('code');

  const filter: Record<string, unknown> = {};
  if (active !== null) {
    filter.active = active === 'true';
  }
  if (code) {
    filter.code = code;
  }

  const promoCodes = await PromoCode.find(filter).sort({ createdAt: -1 }).limit(100).lean();

  return NextResponse.json(promoCodes);
}

// POST /api/promo-codes - Create a new promo code
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createPromoCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
  }

  await connect();

  // Check if code already exists
  const existing = await PromoCode.findOne({ code: parsed.data.code });
  if (existing) {
    return NextResponse.json({ error: 'Promo code already exists' }, { status: 409 });
  }

  const created = await PromoCode.create({
    ...parsed.data,
    expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
    usedCount: 0,
    active: parsed.data.active ?? true,
  });

  return NextResponse.json(created, { status: 201 });
}
