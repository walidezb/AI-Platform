import { ClerkProvider } from '@clerk/nextjs';
import { Inter, Plus_Jakarta_Sans, Geist } from 'next/font/google';
import { PostHogProvider } from '../providers/posthog-provider';
import { PageViewTracker } from '../components/analytics/PageViewTracker';
import { Suspense } from 'react';
import { Toaster } from 'sonner';
import './globals.css';
import { QueryProvider } from '../providers/query-provider';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
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
    <ClerkProvider>
      <html lang="en" className={cn("dark", "font-sans", geist.variable)}>
        <body className={`${inter.variable} ${plusJakarta.variable} font-sans antialiased bg-slate-950 text-slate-50 min-h-screen`}>
          <QueryProvider>
            <PostHogProvider>
              <Suspense fallback={null}>
                <PageViewTracker />
              </Suspense>
              {children}
              <Toaster
                theme="dark"
                position="bottom-right"
                toastOptions={{
                  style: {
                    background: 'hsl(216 32% 15%)',
                    border: '1px solid hsl(216 32% 21%)',
                    color: 'hsl(213 67% 96%)',
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
