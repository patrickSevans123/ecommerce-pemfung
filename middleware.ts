import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Get the pathname
  const path = request.nextUrl.pathname;

  // Define public paths that don't require authentication
  const publicPaths = ['/', '/login', '/register', '/products'];
  const isPublicPath = publicPaths.some((p) => path === p || path.startsWith('/api/'));

  // Allow public paths
  if (isPublicPath) {
    return NextResponse.next();
  }

  // For protected routes, we'll handle authentication on the client side
  // since we're using localStorage for token storage
  // The dashboard pages have their own client-side protection
  return NextResponse.next();
}

// Specify which routes this middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
