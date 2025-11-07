import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connect } from '../../../../lib/db/mongoose';
import CartModel from '../../../../lib/db/models/cart';
import {
  cartDocToInput,
  buildCartAfterAdd,
  persistCart,
  loadCart,
  serializeCartSnapshot,
} from '../../../../lib/cart/service';
import type { CartSnapshot } from '../../../../lib/cart/service';
import { isFailure } from '../../../../lib/fp/validation';
import {
  validateRequestBody,
  handleValidation,
  successResponse,
  badRequestError,
} from '@/lib/api';

const addSchema = z.object({
  userId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  return handleValidation(
    await validateRequestBody(request, addSchema),
    async (data) => {
      await connect();

      const cartDoc = await CartModel.findOne({ user: data.userId }).lean<CartSnapshot>();
      const baseCartDoc: CartSnapshot = cartDoc ?? { user: data.userId, items: [] };
      const cartInput = cartDocToInput(baseCartDoc);
      const nextCartInput = buildCartAfterAdd({
        userId: cartInput.userId,
        items: cartInput.items.map((item) => ({ ...item })),
      }, data);

      const validation = await persistCart(data.userId, nextCartInput, cartDoc?.items ?? []);
      if (isFailure(validation)) {
        return badRequestError('Cart validation failed', validation.errors);
      }

      const freshCart = await loadCart(data.userId);
      return successResponse(serializeCartSnapshot(freshCart));
    }
  );
}
