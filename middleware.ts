import { NextResponse, type NextRequest } from 'next/server';
import {
  AGE_GATE_13_PLUS,
  AGE_GATE_COOKIE_NAME,
  AGE_GATE_UNDER_13,
  normalizeAgeGateDecision,
} from '@/lib/age-gate';

const ALLOWED_WITHOUT_DECISION = new Set(['/age-gate']);
const ALLOWED_UNDER_13_PATHS = new Set(['/age-gate', '/under-13']);

function isProtectedWriteApi(pathname: string, method: string): boolean {
  if (!['POST', 'PATCH', 'DELETE', 'PUT'].includes(method)) return false;
  if (pathname.startsWith('/api/auth/')) return true;
  if (pathname.startsWith('/api/spelling/')) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();
  const decision = normalizeAgeGateDecision(request.cookies.get(AGE_GATE_COOKIE_NAME)?.value);

  if (pathname.startsWith('/api/age-gate')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    if (!isProtectedWriteApi(pathname, method)) {
      return NextResponse.next();
    }

    if (decision !== AGE_GATE_13_PLUS) {
      return NextResponse.json(
        { error: 'Age gate required: account and persistence are only available for 13+.' },
        { status: 403 }
      );
    }

    return NextResponse.next();
  }

  if (!decision && !ALLOWED_WITHOUT_DECISION.has(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/age-gate';
    return NextResponse.redirect(url);
  }

  if (decision === AGE_GATE_UNDER_13 && !ALLOWED_UNDER_13_PATHS.has(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/under-13';
    return NextResponse.redirect(url);
  }

  if (decision === AGE_GATE_13_PLUS && pathname === '/under-13') {
    const url = request.nextUrl.clone();
    url.pathname = '/landing';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
