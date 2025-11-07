import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connect } from '../../../../lib/db/mongoose';
import User from '../../../../lib/db/models/user';
import {
  validateRequestBody,
  handleValidation,
  successResponse,
  notFoundError,
  conflictError,
} from '@/lib/api';

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
});

// GET /api/users/[id] - Get a single user
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  await connect();

  const user = await User.findById(id).lean();

  if (!user) {
    return notFoundError('User', id);
  }

  return successResponse(user);
}

// PATCH /api/users/[id] - Update a user
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  return handleValidation(
    await validateRequestBody(request, updateUserSchema),
    async (data) => {
      await connect();

      // If updating email, check for duplicates
      if (data.email) {
        const existing = await User.findOne({ email: data.email, _id: { $ne: id } });
        if (existing) {
          return conflictError('Email already in use');
        }
      }

      const updated = await User.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();

      if (!updated) {
        return notFoundError('User', id);
      }

      return successResponse(updated);
    }
  );
}

// DELETE /api/users/[id] - Delete a user
export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  await connect();

  const deleted = await User.findByIdAndDelete(id).lean();

  if (!deleted) {
    return notFoundError('User', id);
  }

  return successResponse({ message: 'User deleted successfully' });
}
