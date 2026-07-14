import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/register(.*)',
  '/onboarding/setup',
  '/onboarding/:token*',
  '/api/webhooks(.*)',
  '/design-system(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  const { userId, sessionClaims } = await auth();

  // If it's not a public route, enforce authentication
  if (!isPublicRoute(request)) {
    await auth.protect();

    // Check if the user has a role assigned in their public metadata
    const metadata = (sessionClaims?.publicMetadata || {}) as Record<string, unknown>;
    const role = metadata.role;

    // If signed in but no role is assigned yet, redirect to onboarding setup
    if (userId && !role && request.nextUrl.pathname !== '/onboarding/setup') {
      return NextResponse.redirect(new URL('/onboarding/setup', request.url));
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html|css|js(?!on)|jpeg|jpg|png|gif|svg|ico|csv|docx|xlsx|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
