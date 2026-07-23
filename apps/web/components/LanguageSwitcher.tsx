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
  const { getToken } = useAuth();

  const switchLocale = async (newLocale: 'en' | 'ar') => {
    if (newLocale === locale) return;

    // Persist to cookie (immediate)
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;

    // Persist to DB (async — don't await, best-effort)
    try {
      const client = createApiClient(getToken);
      await client.patch('/users/me/language', {
        language: newLocale,
      });
    } catch {
      // Non-critical: cookie still switches the UI
    }

    // Reconstruct path
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
