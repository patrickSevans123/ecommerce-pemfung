import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connect } from '../../../../lib/db/mongoose';
import { validateCart } from '../../../../lib/cart/validation';
import { isFailure } from '../../../../lib/fp/validation';

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
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const parsed = cartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
  }

  await connect();

  const result = await validateCart(parsed.data);
  if (isFailure(result)) {
    return NextResponse.json({ valid: false, errors: result.errors }, { status: 200 });
  }

  return NextResponse.json({ valid: true, errors: [] }, { status: 200 });
}
