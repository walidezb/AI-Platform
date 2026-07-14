import { UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { Logo } from '../ui/Logo';

export default async function Header() {
  const { userId } = await auth();

  return (
    <header className="border-b border-border bg-card/85 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <Logo size="sm" />
        </Link>

        {/* Auth Buttons */}
        <div className="flex items-center gap-4">
          {userId ? (
            <UserButton />
          ) : (
            <>
              <Link
                href="/sign-in"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="text-sm font-semibold bg-gradient-primary text-white border-0 px-4 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-glow-sm"
              >
                Start Free Trial
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
