'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f0f1a',
          color: 'white',
          fontFamily: 'sans-serif',
          gap: '16px'
        }}>
          <h1 style={{ fontSize: '2rem' }}>⚠️ Something went wrong</h1>
          <p style={{ color: '#94a3b8' }}>
            Our team has been notified. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              background: '#6366f1',
              color: 'white',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
