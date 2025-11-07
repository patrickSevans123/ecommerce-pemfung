import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connect } from '../../../../lib/db/mongoose';
import PromoCode from '../../../../lib/db/models/promoCode';
import {
  validateRequestBody,
  handleValidation,
  successResponse,
  notFoundError,
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
    return notFoundError('Promo code', id);
  }

  return successResponse(promoCode);
}

// PATCH /api/promo-codes/[id] - Update a promo code
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  return handleValidation(
    await validateRequestBody(request, updatePromoCodeSchema),
    async (data) => {
      await connect();

      // If updating code, check for duplicates
      if (data.code) {
        const existing = await PromoCode.findOne({ code: data.code, _id: { $ne: id } });
        if (existing) {
          return conflictError('Promo code already exists');
        }
      }

      const updateData = { ...data };

      const updated = await PromoCode.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      ).lean();

      if (!updated) {
        return notFoundError('Promo code', id);
      }

      return successResponse(updated);
    }
  );
}

// DELETE /api/promo-codes/[id] - Delete a promo code
export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  await connect();

  const deleted = await PromoCode.findByIdAndDelete(id);

  if (!deleted) {
    return notFoundError('Promo code', id);
  }

  return successResponse({ message: 'Promo code deleted successfully' });
}
