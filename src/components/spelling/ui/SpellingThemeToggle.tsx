'use client';

import { useEffect, useRef, useState } from 'react';
import { useSpellingTheme } from '@/features/spelling/contexts/SpellingThemeContext';
import { SPELLING_THEME_OPTIONS, THEME_CONTENT } from '@/features/spelling/constants/theme-content';

export default function SpellingThemeToggle() {
  const { theme, setTheme, mounted } = useSpellingTheme();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusItem = (index: number) => {
    const items = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
    if (items.length === 0) return;
    const targetIndex = (index + items.length) % items.length;
    items[targetIndex]?.focus();
  };

  useEffect(() => {
    if (!open) return;

    function handleDocumentClick(event: MouseEvent) {
      const target = event.target as Node | null;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const selectedIndex = SPELLING_THEME_OPTIONS.findIndex(option => option.theme === theme);
    const nextIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const focusSelected = () => focusItem(nextIndex);
    const frame = requestAnimationFrame(focusSelected);
    return () => cancelAnimationFrame(frame);
  }, [open, theme]);

  if (!mounted) {
    return null;
  }

  const currentTheme = THEME_CONTENT[theme];

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        ref={buttonRef}
        type="button"
        className="flex h-12 w-12 items-center justify-center rounded-full border border-spelling-border bg-spelling-surface text-2xl text-spelling-text shadow-lg transition-colors hover:bg-spelling-secondary"
        style={{ borderStyle: 'var(--spelling-border-style)' }}
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Choose spelling theme"
      >
        <span aria-hidden>{currentTheme.themeIcon}</span>
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute right-0 mt-2 w-44 rounded-xl border border-spelling-border bg-spelling-surface p-1 text-sm text-spelling-text shadow-lg"
          style={{ borderStyle: 'var(--spelling-border-style)' }}
          onKeyDown={event => {
            const items = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
            if (items.length === 0) return;
            const activeIndex = items.findIndex(item => item === document.activeElement);

            if (event.key === 'ArrowDown') {
              event.preventDefault();
              focusItem(activeIndex + 1);
            }

            if (event.key === 'ArrowUp') {
              event.preventDefault();
              focusItem(activeIndex - 1);
            }

            if (event.key === 'Home') {
              event.preventDefault();
              focusItem(0);
            }

            if (event.key === 'End') {
              event.preventDefault();
              focusItem(items.length - 1);
            }

            if (event.key === 'Tab') {
              event.preventDefault();
              if (event.shiftKey) {
                focusItem(activeIndex <= 0 ? items.length - 1 : activeIndex - 1);
              } else {
                focusItem(activeIndex === items.length - 1 ? 0 : activeIndex + 1);
              }
            }
          }}
        >
          {SPELLING_THEME_OPTIONS.map((option, index) => (
            <button
              key={option.theme}
              type="button"
              role="menuitemradio"
              aria-checked={theme === option.theme}
              ref={node => {
                itemRefs.current[index] = node;
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-spelling-secondary ${
                theme === option.theme ? 'bg-spelling-secondary font-semibold' : ''
              }`}
              onClick={() => {
                setTheme(option.theme);
                setOpen(false);
                buttonRef.current?.focus();
              }}
            >
              <span className="text-lg" aria-hidden>
                {option.icon}
              </span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
