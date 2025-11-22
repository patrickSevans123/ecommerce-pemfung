import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connect } from '../../../../lib/db/mongoose';
import CartModel from '../../../../lib/db/models/cart';
import { successResponse } from '@/lib/api';
import { validateRequestBody, handleValidation } from '@/lib/api';
import { extractProductId } from '@/lib/fp/cart-helpers';

const removeSchema = z.object({
  userId: z.string().min(1),
  productId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  return handleValidation(
    await validateRequestBody(request, removeSchema),
    async (data) => {
      await connect();

      // Find cart and remove the item
      const cart = await CartModel.findOne({ user: data.userId });

      if (!cart) {
        return successResponse({ user: data.userId, items: [] });
      }

      // Filter out the item to remove using functional approach
      cart.items = cart.items.filter((item) => {
        const itemProductId = extractProductId(item as { product?: string | { toString(): string }; productId?: string | { toString(): string } });
        return itemProductId !== data.productId;
      });

      await cart.save();

      return successResponse(cart.toObject());
    }
  );
}
