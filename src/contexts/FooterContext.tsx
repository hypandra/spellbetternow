'use client';

import { createContext, useContext, useState } from 'react';

type FooterControl = {
  hideFooter: boolean;
  setHideFooter: (hidden: boolean) => void;
};

const FooterContext = createContext<FooterControl>({
  hideFooter: false,
  setHideFooter: () => {},
});

export function FooterProvider({ children }: { children: React.ReactNode }) {
  const [hideFooter, setHideFooter] = useState(false);

  return (
    <FooterContext.Provider value={{ hideFooter, setHideFooter }}>
      {children}
    </FooterContext.Provider>
  );
}

export function useFooterControl() {
  return useContext(FooterContext);
}
