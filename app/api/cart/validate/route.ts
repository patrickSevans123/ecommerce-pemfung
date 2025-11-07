import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connect } from '../../../../lib/db/mongoose';
import { validateCart } from '../../../../lib/cart/validation';
import { isFailure } from '../../../../lib/fp/validation';
import {
  validateRequestBody,
  handleValidation,
  successResponse,
} from '@/lib/api';

const cartSchema = z.object({
  userId: z.string().min(1),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int(),
      })
    )
    .default([]),
});

export async function POST(request: NextRequest) {
  return handleValidation(
    await validateRequestBody(request, cartSchema),
    async (data) => {
      await connect();

      const result = await validateCart(data);
      if (isFailure(result)) {
        return successResponse({ valid: false, errors: result.errors });
      }

      return successResponse({ valid: true, errors: [] });
    }
  );
}
