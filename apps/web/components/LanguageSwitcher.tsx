'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@clerk/nextjs';
import { createApiClient } from '@/lib/api-client';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { getToken, isSignedIn } = useAuth();

  const switchLocale = async (newLocale: 'en' | 'ar') => {
    if (newLocale === locale) return;

    // 1. Persist to cookie
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;

    // 2. Persist to DB if signed in
    if (isSignedIn) {
      try {
        const client = createApiClient(getToken);
        await client.patch('/users/me/language', { language: newLocale });
      } catch (err) {
        console.error('Failed to sync language preference to DB:', err);
      }
    }

    // 3. Reconstruct path with/without locale prefix
    const withoutLocale = pathname.startsWith('/ar')
      ? pathname.slice(3) || '/'
      : pathname;

    const newPath =
      newLocale === 'ar' ? `/ar${withoutLocale}` : withoutLocale;

    router.push(newPath);
    router.refresh();
  };

  return (
    <div className="flex items-center gap-0.5 bg-secondary/50 rounded-lg p-0.5 border border-border">
      {(['en', 'ar'] as const).map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => switchLocale(loc)}
          className={cn(
            'px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer',
            locale === loc
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label={loc === 'en' ? 'Switch to English' : 'التبديل إلى العربية'}
        >
          {loc === 'en' ? '🇬🇧 EN' : '🇸🇦 AR'}
        </button>
      ))}
    </div>
  );
}
