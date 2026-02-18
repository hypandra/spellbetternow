export const AGE_GATE_COOKIE_NAME = 'sbn_age_gate';
export const AGE_GATE_13_PLUS = '13_plus';
export const AGE_GATE_UNDER_13 = 'under_13';
export const AGE_GATE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type AgeGateDecision = typeof AGE_GATE_13_PLUS | typeof AGE_GATE_UNDER_13;

export function normalizeAgeGateDecision(value: string | undefined): AgeGateDecision | null {
  if (value === AGE_GATE_13_PLUS) return AGE_GATE_13_PLUS;
  if (value === AGE_GATE_UNDER_13) return AGE_GATE_UNDER_13;
  return null;
}

export function isAge13Plus(value: string | undefined): boolean {
  return normalizeAgeGateDecision(value) === AGE_GATE_13_PLUS;
}
