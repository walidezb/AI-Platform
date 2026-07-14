import { ClerkProvider } from '@clerk/nextjs';
import { Outfit, Manrope, DM_Sans } from 'next/font/google';
import { PostHogProvider } from '../providers/posthog-provider';
import { PageViewTracker } from '../components/analytics/PageViewTracker';
import { Suspense } from 'react';
import { Toaster } from 'sonner';
import './globals.css';
import { QueryProvider } from '../providers/query-provider';
import { cn } from "@/lib/utils";

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

export const metadata = {
  title: 'AI-Powered B2B Learning Platform',
  description: 'AI-Powered Employee Onboarding & Personalized Learning Paths for Enterprises',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#0E6396',
          colorBackground: '#FFFFFF',
        }
      }}
    >
      <html lang="en" className={cn("light", "font-sans", outfit.variable, manrope.variable, dmSans.variable)}>
        <body className="font-sans antialiased bg-background text-foreground min-h-screen">
          <QueryProvider>
            <PostHogProvider>
              <Suspense fallback={null}>
                <PageViewTracker />
              </Suspense>
              {children}
              <Toaster
                theme="light"
                position="bottom-right"
                toastOptions={{
                  style: {
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    color: 'hsl(var(--foreground))',
                  },
                }}
              />
            </PostHogProvider>
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
