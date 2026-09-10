import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { qwantomhubClerkTheme } from '@/modules/auth/clerk-theme';
import './globals.css';

export const metadata: Metadata = {
  title: 'QwantomHub Talent Pipeline Platform',
  description: 'AI Fluency & Production-Readiness Talent Pipeline Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider appearance={qwantomhubClerkTheme}>
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="min-h-screen antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
