'use client';

import { Header } from '@/components/v3/shared/Header/Header';
import { useFooterControl } from '@/contexts/FooterContext';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SpellingThemeProvider } from '@/features/spelling/contexts/SpellingThemeContext';
import { FeedbackWidget } from '@/features/feedback';

export default function SpellingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setHideFooter } = useFooterControl();
  const pathname = usePathname();
  const shouldHideFooter = pathname?.startsWith('/session');

  // Hide footer for focused session view.
  useEffect(() => {
    setHideFooter(Boolean(shouldHideFooter));
    return () => {
      setHideFooter(false);
    };
  }, [setHideFooter, shouldHideFooter]);

  return (
    <SpellingThemeProvider>
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <FeedbackWidget />
      </div>
    </SpellingThemeProvider>
  );
}
