'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFooterControl } from '@/contexts/FooterContext';

export function Footer() {
  const { hideFooter } = useFooterControl();
  const pathname = usePathname();

  if (hideFooter) {
    return null;
  }

  return (
    <footer className="border-t border-spelling-border bg-spelling-accent">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4 text-sm text-spelling-text">
        <span className="font-medium">Spell Better Now</span>
        <div className="flex flex-wrap items-center gap-4">
          {pathname === '/landing' ? (
            <Link href="/app" className="text-spelling-text-muted hover:text-spelling-text">
              Dashboard
            </Link>
          ) : (
            <Link href="/landing" className="text-spelling-primary hover:underline">
              View landing page
            </Link>
          )}
        </div>
      </div>
    </footer>
  );
}
