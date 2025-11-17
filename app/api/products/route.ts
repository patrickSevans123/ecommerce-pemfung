import { z } from 'zod';
import { connect } from '../../../lib/db/mongoose';
import Product from '../../../lib/db/models/product';
import {
  validateRequestBody,
  handleValidation,
  successResponse,
  createdResponse,
} from '@/lib/api';

const createProductSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  category: z.string().optional(),
  images: z.array(z.string()).optional(),
  stock: z.number().int().min(0).optional(),
  seller: z.string().min(1),
  tags: z.array(z.string()).optional(),
});

export async function GET(request: Request) {
  await connect();

  const { searchParams } = new URL(request.url);
  const sellerId = searchParams.get('seller');

  const query = sellerId ? { seller: sellerId } : {};
  const products = await Product.find(query).limit(200).lean();

  return successResponse(products);
}

export async function POST(request: Request) {
  return handleValidation(
    await validateRequestBody(request, createProductSchema),
    async (data) => {
      await connect();
      const created = await Product.create(data);
      return createdResponse(created);
    }
  );
}
