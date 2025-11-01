import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connect } from '../../../../lib/db/mongoose';
import Product from '../../../../lib/db/models/product';

const stockUpdateSchema = z.object({
  stockDelta: z.number().int(),
  version: z.number().int(),
});

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await connect();
  const p = await Product.findById(id).lean();
  if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(p);
}

// PATCH /api/products/[id] -> used for optimistic stock updates
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const parsed = stockUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });

  const { stockDelta, version } = parsed.data;
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
    if (!exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ error: 'Conflict - version mismatch' }, { status: 409 });
  }

  return NextResponse.json(updated);
}
