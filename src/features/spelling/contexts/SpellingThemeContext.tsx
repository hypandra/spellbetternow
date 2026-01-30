'use client';

import { createContext, useContext, useMemo } from 'react';

export type SpellingTheme = 'focus';

type SpellingThemeContextValue = {
  theme: SpellingTheme;
  setTheme: (theme: SpellingTheme) => void;
  mounted: boolean;
};

const SpellingThemeContext = createContext<SpellingThemeContextValue | undefined>(undefined);

export function SpellingThemeProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo(
    () => ({
      theme: 'focus' as const,
      setTheme: () => {},
      mounted: true,
    }),
    []
  );

  return (
    <SpellingThemeContext.Provider value={value}>
      <div data-spelling-theme="focus">{children}</div>
    </SpellingThemeContext.Provider>
  );
}

export function useSpellingTheme() {
  const context = useContext(SpellingThemeContext);
  if (!context) {
    throw new Error('useSpellingTheme must be used within SpellingThemeProvider');
  }
  return context;
}
