import { NextRequest, NextResponse } from 'next/server';
import {
  AGE_GATE_13_PLUS,
  AGE_GATE_COOKIE_MAX_AGE_SECONDS,
  AGE_GATE_COOKIE_NAME,
  normalizeAgeGateDecision,
} from '@/lib/age-gate';

type AgeGateBody = {
  decision?: string;
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as AgeGateBody | null;
  const decision = normalizeAgeGateDecision(body?.decision);

  if (!decision) {
    return NextResponse.json(
      { error: 'Invalid age gate decision. Expected under_13 or 13_plus.' },
      { status: 400 }
    );
  }

  const response = NextResponse.json({
    ok: true,
    nextPath: decision === AGE_GATE_13_PLUS ? '/landing' : '/under-13',
  });

  response.cookies.set({
    name: AGE_GATE_COOKIE_NAME,
    value: decision,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: AGE_GATE_COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}
