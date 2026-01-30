export const DEFAULT_ELO = 1500;
const K_FACTOR = 32;

export interface EloUpdate {
  newUserElo: number;
  newWordElo: number;
  userEloDelta: number;
  wordEloDelta: number;
}

const LEVEL_PERCENTILES = [
  { level: 1, max: 0.1 },
  { level: 2, max: 0.25 },
  { level: 3, max: 0.45 },
  { level: 4, max: 0.65 },
  { level: 5, max: 0.8 },
  { level: 6, max: 0.93 },
  { level: 7, max: 1 },
];

export const LEVEL_BASE_ELO: Record<number, number> = {
  1: 1100,
  2: 1250,
  3: 1400,
  4: 1550,
  5: 1700,
  6: 1850,
  7: 2000,
};

const LEVEL_PERCENTILE_BANDS = [
  { level: 1, min: 0, max: 10 },
  { level: 2, min: 10, max: 25 },
  { level: 3, min: 25, max: 45 },
  { level: 4, min: 45, max: 65 },
  { level: 5, min: 65, max: 80 },
  { level: 6, min: 80, max: 93 },
  { level: 7, min: 93, max: 100 },
];

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function calculateEloUpdate(
  userElo: number,
  wordElo: number,
  success: boolean
): EloUpdate {
  const actualScore = success ? 1 : 0;
  const expectedUserScore = expectedScore(userElo, wordElo);

  const userEloDelta = Math.round(K_FACTOR * (actualScore - expectedUserScore));
  const wordEloDelta = -userEloDelta;

  return {
    newUserElo: userElo + userEloDelta,
    newWordElo: wordElo + wordEloDelta,
    userEloDelta,
    wordEloDelta,
  };
}

export function percentileToLevel(percentile: number): number {
  const clamped = Math.min(Math.max(percentile, 0), 1);
  const band = LEVEL_PERCENTILES.find(entry => clamped <= entry.max);
  return band?.level ?? 1;
}

export function levelToPercentileMidpoint(level: number): number {
  const band = LEVEL_PERCENTILE_BANDS.find(entry => entry.level === level);
  if (!band) return 50;
  return Math.round((band.min + band.max) / 2);
}

export function levelToBaseElo(level: number): number {
  return LEVEL_BASE_ELO[level] ?? DEFAULT_ELO;
}

export function eloToPercentileApprox(elo: number): number {
  const minElo = LEVEL_BASE_ELO[1] ?? 1100;
  const maxElo = LEVEL_BASE_ELO[7] ?? 2000;
  const clamped = Math.min(Math.max(elo, minElo), maxElo);
  const ratio = (clamped - minElo) / (maxElo - minElo);
  return Math.round(ratio * 100);
}

export function percentileToDisplay(value: number): number {
  return Math.round(value);
}
