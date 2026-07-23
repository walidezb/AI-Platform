import {
  clerkMiddleware,
  createRouteMatcher,
} from '@clerk/nextjs/server';
import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

const locales = ['en', 'ar'];
const defaultLocale = 'en';

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
});

// ── Public routes (no auth required) ──
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
  '/security-policy',
  '/.well-known/security.txt',
  '/security.txt',
  '/api/health',
  '/api/webhooks(.*)',
  '/design-system(.*)',
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { pathname } = req.nextUrl;

  // Protect all /admin/* routes before serving page shell
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/ar/admin')
  ) {
    const { userId } = await auth();
    if (!userId) {
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', req.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Skip intl middleware for API routes or static files
  if (
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/_next/') &&
    !pathname.includes('.')
  ) {
    const intlResponse = intlMiddleware(req);
    if (intlResponse.status !== 200) {
      return intlResponse;
    }
  }

  // Protect all non-public routes
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
