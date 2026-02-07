'use client';

import Link from 'next/link';
import { useSession, signOut } from '@/lib/auth-client';
import { DoorOpen } from 'lucide-react';

export function Header() {
  const { data: session, isPending } = useSession();

  return (
    <header className="border-b border-[#1F3B2E] bg-[#2D5341] text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/landing" className="group flex flex-col sm:flex-row sm:items-center sm:gap-3">
          <span className="text-xl font-medium text-white tracking-tight">
            Spell Better Now
          </span>
          <span className="text-sm text-white/70">
            Adaptive practice with targeted feedback
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {isPending ? (
            <span className="text-sm text-white/70">...</span>
          ) : session?.user ? (
            <>
              <Link
                href="/app"
                className="text-sm px-3 py-1.5 text-white/80 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={() => signOut()}
                aria-label="Sign out"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-3 py-1.5 text-sm text-white hover:border-white/60 hover:bg-white/10 transition-colors focus:outline-none"
              >
                <DoorOpen className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm px-3 py-1.5 bg-white text-[#2D5341] rounded hover:bg-[#E3F0E8] transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
