import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  getPublicSessionStats,
  getPublicSessionAttempts,
  getWordBankCount,
} from '@/lib/spelling/db/public-session';
import { DEFAULT_ELO } from '@/lib/spelling/elo';
import SharePageClient from '@/components/spelling/SharePageClient';

interface SharePageProps {
  params: Promise<{ sessionId: string }>;
}

export async function generateMetadata({
  params,
}: SharePageProps): Promise<Metadata> {
  const { sessionId } = await params;
  const stats = await getPublicSessionStats(sessionId);

  if (!stats) {
    return { title: 'Session not found — Spell Better Now' };
  }

  const title = `${stats.correctTotal}/${stats.attemptsTotal} correct — Spell Better Now`;

  return {
    title,
    openGraph: {
      title,
      description: 'Adaptive spelling practice with targeted feedback',
      images: [
        {
          url: `/api/og/share?sessionId=${sessionId}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      images: [`/api/og/share?sessionId=${sessionId}`],
    },
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { sessionId } = await params;
  const stats = await getPublicSessionStats(sessionId);

  if (!stats) {
    notFound();
  }

  const [attemptRows, totalWords] = await Promise.all([
    getPublicSessionAttempts(sessionId),
    getWordBankCount(),
  ]);

  const attempts = attemptRows
    .filter(row => row.created_at)
    .map((row, index) => {
      const before = row.user_elo_before ?? row.user_elo_after ?? DEFAULT_ELO;
      const after = row.user_elo_after ?? before;
      return {
        attemptNumber: index + 1,
        word: '',
        correct: row.correct === true,
        userEloBefore: before,
        userEloAfter: after,
        timestamp: row.created_at,
      };
    });

  return (
    <SharePageClient
      stats={stats}
      attempts={attempts}
      totalWords={totalWords}
    />
  );
}
