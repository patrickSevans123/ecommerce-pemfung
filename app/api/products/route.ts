import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connect } from '../../../lib/db/mongoose';
import Product from '../../../lib/db/models/product';

const createProductSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  category: z.string().optional(),
  images: z.array(z.string()).optional(),
  stock: z.number().int().min(0).optional(),
  sku: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET() {
  await connect();
  const products = await Product.find().limit(200).lean();
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
  }

  await connect();
  const created = await Product.create(parsed.data);
  return NextResponse.json(created, { status: 201 });
}
