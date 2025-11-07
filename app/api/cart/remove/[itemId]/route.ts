import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connect } from '../../../../../lib/db/mongoose';
import CartModel from '../../../../../lib/db/models/cart';
import {
  cartDocToInput,
  buildCartAfterRemove,
  persistCart,
  loadCart,
  serializeCartSnapshot,
} from '../../../../../lib/cart/service';
import type { CartSnapshot } from '../../../../../lib/cart/service';
import { isFailure } from '../../../../../lib/fp/validation';
import {
  validateRequestBody,
  handleValidation,
  successResponse,
  badRequestError,
} from '@/lib/api';

const removeSchema = z.object({
  userId: z.string().min(1),
});

export async function DELETE(request: NextRequest, context: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await context.params;

  return handleValidation(
    await validateRequestBody(request, removeSchema),
    async (data) => {
      await connect();

      const cartDoc = await CartModel.findOne({ user: data.userId }).lean<CartSnapshot>();
      if (!cartDoc) {
        return successResponse({ cart: serializeCartSnapshot({ user: data.userId, items: [] }) });
      }

      const cartInput = cartDocToInput(cartDoc);
      const nextCartInput = buildCartAfterRemove(cartInput, itemId);

      const validation = await persistCart(data.userId, nextCartInput, cartDoc.items ?? [], { allowEmpty: true });
      if (isFailure(validation)) {
        return badRequestError('Cart validation failed', validation.errors);
      }

      const freshCart = await loadCart(data.userId);
      return successResponse(serializeCartSnapshot(freshCart));
    }
  );
}
