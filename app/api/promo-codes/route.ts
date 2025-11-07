import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connect } from '../../../lib/db/mongoose';
import PromoCode from '../../../lib/db/models/promoCode';
import {
  validateRequestBody,
  handleValidation,
  successResponse,
  createdResponse,
  conflictError,
} from '@/lib/api';

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

const createPromoCodeSchema = z.object({
  code: z.string().min(1).max(50),
  description: z.string().optional(),
  discount: discountSchema,
  conditions: z.array(conditionSchema).optional(),
  freeShippingAmount: z.number().nonnegative().optional(),
  expiresAt: z.iso.datetime().optional(),
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

  return successResponse(promoCodes);
}

// POST /api/promo-codes - Create a new promo code
export async function POST(request: NextRequest) {
  return handleValidation(
    await validateRequestBody(request, createPromoCodeSchema),
    async (data) => {
      await connect();

      // Check if code already exists
      const existing = await PromoCode.findOne({ code: data.code });
      if (existing) {
        return conflictError('Promo code already exists');
      }

      const created = await PromoCode.create({
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        usedCount: 0,
        active: data.active ?? true,
      });

      return createdResponse(created);
    }
  );
}
