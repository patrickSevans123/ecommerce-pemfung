import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connect } from '@/lib/db/mongoose';
import User from '@/lib/db/models/user';
import { hashPassword } from '@/lib/auth/password';
import { generateToken } from '@/lib/auth/jwt';
import {
  badRequestError,
  createdResponse,
  handleZodError,
  internalServerError,
} from '@/lib/api/errors';

const registerSchema = z.object({
  email: z.email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['seller', 'buyer']),
});

export async function POST(req: NextRequest) {
  try {
    await connect();

    const body = await req.json();
    const validationResult = registerSchema.safeParse(body);

    if (!validationResult.success) {
      return handleZodError(validationResult.error);
    }
    const validatedData = validationResult.data;

    // Check if user already exists
    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      return badRequestError('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Create user
    const user = await User.create({
      email: validatedData.email,
      name: validatedData.name,
      password: hashedPassword,
      role: validatedData.role,
    });

    // Generate JWT token
    const token = generateToken({
      userId: String(user._id),
      email: user.email,
      role: user.role,
    });

    return createdResponse({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleZodError(error);
    }

    console.error('Registration error:', error);
    return internalServerError('An unexpected error occurred during registration.');
  }
}