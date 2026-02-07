import { ImageResponse } from 'next/og';
import { type NextRequest } from 'next/server';
import {
  getPublicSessionStats,
  getPublicSessionAttempts,
} from '@/lib/spelling/db/public-session';
import {
  levelToPercentileMidpoint,
  eloToPercentileApprox,
  DEFAULT_ELO,
} from '@/lib/spelling/elo';

export const runtime = 'nodejs';

const CHART_HEIGHT = 160;
const BAR_GAP = 2;

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

    const attemptRows = await getPublicSessionAttempts(sessionId);

    const winRate =
      stats.attemptsTotal > 0
        ? Math.round((stats.correctTotal / stats.attemptsTotal) * 100)
        : 0;
    const percentile = levelToPercentileMidpoint(stats.levelEnd);

    // Build sparkline data — last 50 attempts max
    const recentAttempts = attemptRows.slice(-50);
    const chartPoints = recentAttempts.map((row) => {
      const elo = row.user_elo_after ?? row.user_elo_before ?? DEFAULT_ELO;
      return {
        pct: eloToPercentileApprox(elo),
        correct: row.correct,
      };
    });

    const barWidth =
      chartPoints.length > 0
        ? Math.max(4, Math.floor((1200 * 0.8 - chartPoints.length * BAR_GAP) / chartPoints.length))
        : 8;

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
            padding: '48px 60px',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: '24px',
              fontWeight: 500,
              opacity: 0.7,
              marginBottom: '24px',
            }}
          >
            Spell Better Now
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '12px',
              marginBottom: '12px',
            }}
          >
            <span style={{ fontSize: '64px', fontWeight: 700 }}>
              {stats.correctTotal}/{stats.attemptsTotal}
            </span>
            <span style={{ fontSize: '28px', opacity: 0.8 }}>correct</span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '32px',
              marginBottom: '32px',
              fontSize: '22px',
            }}
          >
            <span>{winRate}% win rate</span>
            <span>Top {100 - percentile}%</span>
          </div>

          {/* Sparkline chart */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              height: `${CHART_HEIGHT}px`,
              gap: `${BAR_GAP}px`,
              padding: '0 16px',
              marginBottom: '32px',
              borderBottom: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            {chartPoints.map((point, i) => {
              const barHeight = Math.max(4, Math.round((point.pct / 100) * (CHART_HEIGHT - 8)));
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    width: `${barWidth}px`,
                    height: `${barHeight}px`,
                    backgroundColor: point.correct
                      ? '#8FD4A4'
                      : 'rgba(255,120,120,0.7)',
                    borderRadius: '2px',
                  }}
                />
              );
            })}
          </div>

          <div
            style={{
              display: 'flex',
              fontSize: '18px',
              opacity: 0.5,
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
