import { Suspense } from 'react';
import SessionPageClient from '@/components/spelling/SessionPageClient';
import SessionLoading from '@/components/spelling/session/SessionLoading';

export default function SessionPage() {
  return (
    <Suspense fallback={<SessionLoading />}>
      <SessionPageClient />
    </Suspense>
  );
}
