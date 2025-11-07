import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connect } from '../../../../lib/db/mongoose';
import Product from '../../../../lib/db/models/product';
import {
  validateRequestBody,
  handleValidation,
  successResponse,
  notFoundError,
  conflictError,
} from '@/lib/api';

const stockUpdateSchema = z.object({
  stockDelta: z.number().int(),
  version: z.number().int(),
});

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await connect();
  const p = await Product.findById(id).lean();
  if (!p) return notFoundError('Product', id);
  return successResponse(p);
}

// PATCH /api/products/[id] -> used for optimistic stock updates
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  return handleValidation(
    await validateRequestBody(request, stockUpdateSchema),
    async (data) => {
      const { stockDelta, version } = data;
      await connect();

      // optimistic locking: only update if current version matches provided version
      const updated = await Product.findOneAndUpdate(
        { _id: id, version },
        { $inc: { stock: stockDelta, version: 1 } },
        { new: true }
      ).lean();

      if (!updated) {
        // Could be not found OR version mismatch
        const exists = await Product.exists({ _id: id });
        if (!exists) return notFoundError('Product', id);
        return conflictError('Conflict - version mismatch');
      }

      return successResponse(updated);
    }
  );
}
