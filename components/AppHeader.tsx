'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  badge?: {
    label: string;
    variant?: 'accent' | 'emerald' | 'amber' | 'blue' | 'slate';
  };
  backLink?: {
    href: string;
    label: string;
  };
  children?: React.ReactNode;
  className?: string;
}

const badgeVariants = {
  accent: 'bg-[var(--qh-accent-main)]/10 text-[var(--qh-accent-deep)]',
  emerald: 'bg-emerald-500/10 text-emerald-600',
  amber: 'bg-amber-500/10 text-amber-600',
  blue: 'bg-blue-500/10 text-blue-600',
  slate: 'bg-slate-500/10 text-slate-600',
};

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  badge,
  backLink,
  children,
  className = '',
}) => {
  return (
    <header className={`border-b border-[var(--qh-border)] bg-[var(--qh-surface-card)] px-6 py-4 sticky top-0 z-20 shadow-sm ${className}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/logo.png"
              alt="QwantomHub"
              width={36}
              height={36}
              className="object-contain transition-transform group-hover:scale-105"
            />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-[var(--qh-ink)] leading-tight">{title}</h1>
              {badge && (
                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full uppercase tracking-wider ${badgeVariants[badge.variant || 'accent']}`}>
                  {badge.label}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-[var(--qh-slate-600)] mt-0.5">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {backLink && (
            <Link
              href={backLink.href}
              className="text-xs font-semibold text-[var(--qh-accent-deep)] hover:underline flex items-center gap-1 transition-colors"
            >
              {backLink.label}
            </Link>
          )}
          {children}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
