'use client';

import { useEffect } from 'react';

// Last-resort boundary for errors thrown by the root layout itself
// (app/[locale]/layout.tsx). It replaces that layout entirely, so it runs
// without the next-intl provider or a known locale — hence self-contained
// markup, inline brand styling, and bilingual copy rather than message keys.
//
// check-tokens-disable-file: replaces the root layout, so globals.css and the
// @theme tokens are not loaded here — raw brand hex literals are unavoidable.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: '#0D1B2A',
          color: '#E0E1DD',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
          حدث خطأ ما
        </h1>
        <p style={{ color: '#9298A0', margin: 0 }}>
          عذرًا، حدث خطأ غير متوقع. يُرجى المحاولة مرة أخرى.
          <br />
          Sorry, an unexpected error occurred. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: '0.5rem',
            padding: '0.5rem 1.5rem',
            borderRadius: '0.75rem',
            border: 'none',
            fontWeight: 500,
            cursor: 'pointer',
            backgroundColor: '#14B8A6',
            color: '#0D1B2A',
          }}
        >
          إعادة المحاولة / Try again
        </button>
      </body>
    </html>
  );
}
