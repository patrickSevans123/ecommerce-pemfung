import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connect } from '@/lib/db/mongoose';
import User from '@/lib/db/models/user';
import { comparePassword } from '@/lib/auth/password';
import { generateToken } from '@/lib/auth/jwt';
import {
  handleZodError,
  internalServerError,
  successResponse,
  unauthorizedError,
} from '@/lib/api/errors';

const loginSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(req: NextRequest) {
  try {
    await connect();

    const body = await req.json();
    const validationResult = loginSchema.safeParse(body);

    if (!validationResult.success) {
      return handleZodError(validationResult.error);
    }
    const validatedData = validationResult.data;

    // Find user with password field included
    const user = await User.findOne({ email: validatedData.email }).select(
      '+password'
    );

    if (!user) {
      return unauthorizedError('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await comparePassword(
      validatedData.password,
      user.password
    );

    if (!isValidPassword) {
      return unauthorizedError('Invalid email or password');
    }

    // Generate JWT token
    const token = generateToken({
      userId: String(user._id),
      email: user.email,
      role: user.role,
    });

    return successResponse({
      message: 'Login successful',
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

    console.error('Login error:', error);
    return internalServerError('An unexpected error occurred during login.');
  }
}