import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--qh-bg)] text-[var(--qh-ink)]">
      <AppHeader
        title="QwantomHub Pipeline"
        subtitle="Talent Pipeline Platform"
      >
        <nav className="flex items-center space-x-4">
          <SignedIn>
            <UserButton showName />
          </SignedIn>
          <SignedOut>
            <Link
              href="/sign-in"
              className="px-4 py-2 text-xs rounded-md bg-[var(--qh-ink)] text-white font-medium hover:bg-[var(--qh-accent-deep)] transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="px-4 py-2 text-xs rounded-md bg-[var(--qh-accent-main)] text-white font-medium hover:opacity-90 transition-opacity"
            >
              Register
            </Link>
          </SignedOut>
        </nav>
      </AppHeader>

      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4 text-[var(--qh-ink)]">
          QwantomHub Talent Pipeline Platform
        </h1>
        <p className="text-lg text-[var(--qh-muted)] mb-8 leading-relaxed">
          AI-Fluency & Production-Readiness Talent Assessment, Learning & Global Placement Architecture.
        </p>
      </main>
    </div>
  );
}
