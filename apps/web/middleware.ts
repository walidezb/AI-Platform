import { clerkMiddleware, createRouteMatcher, clerkClient } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
});

const isPublicRoute = createRouteMatcher([
  '/',
  '/(ar)?',
  '/sign-in(.*)',
  '/(ar)?/sign-in(.*)',
  '/sign-up(.*)',
  '/(ar)?/sign-up(.*)',
  '/register(.*)',
  '/(ar)?/register(.*)',
  '/onboarding/setup',
  '/(ar)?/onboarding/setup',
  '/onboarding/:token*',
  '/(ar)?/onboarding/:token*',
  '/api/webhooks(.*)',
  '/design-system(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;

  // Skip intl middleware for API routes, Next.js internals, admin routes, or static files
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/admin') ||
    pathname.includes('.')
  ) {
    return;
  }

  // If it's not a public route, enforce authentication
  if (!isPublicRoute(request)) {
    await auth.protect();

    const { userId, sessionClaims } = await auth();
    const metadata = (sessionClaims?.publicMetadata || {}) as Record<string, unknown>;
    let role = metadata.role;

    if (userId && !role) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        role = user.publicMetadata?.role;
      } catch (err) {
        console.error('Error fetching Clerk user metadata fallback:', err);
      }
    }

    if (userId && !role && !pathname.endsWith('/onboarding/setup')) {
      const redirectUrl = new URL('/onboarding/setup', request.url);
      return intlMiddleware(new NextRequest(redirectUrl, request));
    }
  }

  return intlMiddleware(request);
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
