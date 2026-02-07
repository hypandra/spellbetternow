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
const CHART_WIDTH = 900;
const DOT_SIZE = 10;

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

    // Position dots evenly across chart width
    const dotSpacing =
      chartPoints.length > 1
        ? CHART_WIDTH / (chartPoints.length - 1)
        : CHART_WIDTH;

    // Build SVG path for connecting line
    const linePoints = chartPoints.map((point, i) => {
      const x = chartPoints.length > 1 ? i * dotSpacing : CHART_WIDTH / 2;
      const y = CHART_HEIGHT - (point.pct / 100) * CHART_HEIGHT;
      return `${x},${y}`;
    });
    const linePath = linePoints.length > 1
      ? `M ${linePoints.join(' L ')}`
      : '';

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

          {/* Dot chart */}
          <div
            style={{
              display: 'flex',
              position: 'relative',
              width: `${CHART_WIDTH}px`,
              height: `${CHART_HEIGHT}px`,
              marginBottom: '32px',
              borderBottom: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            {linePath ? (
              <svg
                width={CHART_WIDTH}
                height={CHART_HEIGHT}
                style={{ position: 'absolute', top: 0, left: 0 }}
              >
                <path
                  d={linePath}
                  fill="none"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="2"
                />
              </svg>
            ) : null}
            {chartPoints.map((point, i) => {
              const x = chartPoints.length > 1 ? i * dotSpacing : CHART_WIDTH / 2;
              const y = CHART_HEIGHT - (point.pct / 100) * CHART_HEIGHT;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    position: 'absolute',
                    left: `${x - DOT_SIZE / 2}px`,
                    top: `${y - DOT_SIZE / 2}px`,
                    width: `${DOT_SIZE}px`,
                    height: `${DOT_SIZE}px`,
                    borderRadius: '50%',
                    backgroundColor: point.correct ? '#8FD4A4' : '#FF7878',
                    border: '2px solid white',
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
