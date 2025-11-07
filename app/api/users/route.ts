import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connect } from '../../../lib/db/mongoose';
import User from '../../../lib/db/models/user';
import {
  validateRequestBody,
  handleValidation,
  createdResponse,
  successResponse,
  conflictError,
} from '@/lib/api';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(['seller', 'buyer']).default('buyer'),
});

// GET /api/users - List all users
export async function GET(request: NextRequest) {
  await connect();

  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  const filter: Record<string, unknown> = {};
  if (email) {
    filter.email = email;
  }

  const users = await User.find(filter).sort({ createdAt: -1 }).limit(100).lean();

  return successResponse(users);
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  return handleValidation(
    await validateRequestBody(request, createUserSchema),
    async (data) => {
      await connect();

      // Check if user already exists
      const existing = await User.findOne({ email: data.email });
      if (existing) {
        return conflictError('User with this email already exists');
      }

      const created = await User.create(data);
      return createdResponse(created);
    }
  );
}
