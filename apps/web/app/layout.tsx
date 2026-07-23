import { ClerkProvider } from '@clerk/nextjs';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { IBM_Plex_Sans_Arabic, Inter, Outfit, Manrope, DM_Sans } from 'next/font/google';
import { PostHogProvider } from '../providers/posthog-provider';
import { PageViewTracker } from '../components/analytics/PageViewTracker';
import { Suspense } from 'react';
import { Toaster } from 'sonner';
import './globals.css';
import { QueryProvider } from '../providers/query-provider';
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  weight: ['300', '400', '500', '700', '900'],
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
});

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | LearnAI Platform',
    default: 'LearnAI Platform — AI-Powered B2B Learning',
  },
  description: 'AI-powered personalized learning paths and onboarding for enterprise teams.',
  keywords: ['learning', 'AI', 'employee training', 'B2B', 'upskilling'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'LearnAI Platform',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const isRtl = locale === 'ar';

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#0E6396',
          colorBackground: '#FFFFFF',
        },
      }}
    >
      <html
        lang={locale}
        dir={isRtl ? 'rtl' : 'ltr'}
        className={cn(
          'light',
          inter.variable,
          ibmPlexArabic.variable,
          outfit.variable,
          manrope.variable,
          dmSans.variable
        )}
        suppressHydrationWarning
      >
        <body
          className={cn(
            isRtl ? 'font-arabic' : 'font-sans',
            'antialiased bg-background text-foreground min-h-screen'
          )}
        >
          <NextIntlClientProvider locale={locale} messages={messages}>
            <QueryProvider>
              <PostHogProvider>
                <Suspense fallback={null}>
                  <PageViewTracker />
                </Suspense>
                {children}
                <Toaster
                  position={isRtl ? 'bottom-left' : 'bottom-right'}
                  richColors
                  closeButton
                  toastOptions={{
                    duration: 4000,
                    classNames: {
                      toast: 'bg-[#1a1a2e] border border-white/[0.08] text-foreground',
                      title: 'text-sm font-semibold',
                      description: 'text-xs text-muted-foreground',
                      actionButton: 'bg-primary text-white text-xs',
                      cancelButton: 'bg-secondary text-muted-foreground text-xs',
                      closeButton: 'bg-secondary border-border',
                    },
                  }}
                  expand={false}
                  visibleToasts={3}
                />
              </PostHogProvider>
            </QueryProvider>
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
