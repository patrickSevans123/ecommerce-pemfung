import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connect } from '../../../../lib/db/mongoose';
import User from '../../../../lib/db/models/user';

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
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(user);
}

// PATCH /api/users/[id] - Update a user
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
  }

  await connect();

  // If updating email, check for duplicates
  if (parsed.data.email) {
    const existing = await User.findOne({ email: parsed.data.email, _id: { $ne: id } });
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }
  }

  const updated = await User.findByIdAndUpdate(id, parsed.data, { new: true, runValidators: true }).lean();

  if (!updated) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

// DELETE /api/users/[id] - Delete a user
export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  await connect();

  const deleted = await User.findByIdAndDelete(id).lean();

  if (!deleted) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ message: 'User deleted successfully' });
}
