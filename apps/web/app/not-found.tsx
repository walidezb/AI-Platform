import React from 'react';
import Link from 'next/link';
import { MapPin } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-5">
        {/* Large 404 */}
        <div className="relative">
          <p className="text-[120px] font-black text-primary/5 leading-none select-none">
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center">
              <MapPin className="h-10 w-10 text-primary" />
            </div>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold mb-2">Page not found</h1>
          <p className="text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90"
          >
            Go Home
          </Link>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary/50"
          >
            Go Back
          </Link>
        </div>
      </div>
    </div>
  );
}
