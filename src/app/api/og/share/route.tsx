import { ImageResponse } from 'next/og';
import { type NextRequest } from 'next/server';
import { getPublicSessionStats } from '@/lib/spelling/db/public-session';
import { levelToPercentileMidpoint } from '@/lib/spelling/elo';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return new Response('Missing sessionId', { status: 400 });
  }

  try {
    const stats = await getPublicSessionStats(sessionId);

    if (!stats) {
      return new Response('Session not found', { status: 404 });
    }

    const winRate =
      stats.attemptsTotal > 0
        ? Math.round((stats.correctTotal / stats.attemptsTotal) * 100)
        : 0;
    const percentile = levelToPercentileMidpoint(stats.levelEnd);
    const progressPct =
      stats.attemptsTotal > 0
        ? Math.round((stats.correctTotal / stats.attemptsTotal) * 100)
        : 0;

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            backgroundColor: '#2D5341',
            color: 'white',
            fontFamily: 'sans-serif',
            padding: '60px',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: '28px',
              fontWeight: 500,
              opacity: 0.8,
              marginBottom: '40px',
            }}
          >
            Spell Better Now
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <span style={{ fontSize: '72px', fontWeight: 700 }}>
              {stats.correctTotal}/{stats.attemptsTotal}
            </span>
            <span style={{ fontSize: '32px', opacity: 0.8 }}>correct</span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '40px',
              marginBottom: '48px',
              fontSize: '24px',
            }}
          >
            <span>{winRate}% win rate</span>
            <span>Top {100 - percentile}%</span>
          </div>

          <div
            style={{
              display: 'flex',
              width: '80%',
              height: '24px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '12px',
              overflow: 'hidden',
              marginBottom: '48px',
            }}
          >
            <div
              style={{
                display: 'flex',
                width: `${progressPct}%`,
                height: '100%',
                backgroundColor: '#8FD4A4',
                borderRadius: '12px',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              fontSize: '20px',
              opacity: 0.6,
            }}
          >
            spellbetternow.cb.hypandra.com
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': 'public, max-age=0, must-revalidate',
        },
      }
    );
  } catch {
    return new Response('Failed to generate image', { status: 500 });
  }
}
