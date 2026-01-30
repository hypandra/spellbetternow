import { NextResponse } from 'next/server';
import { z } from 'zod';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { extractCandidatesFromText } from '@/lib/spelling/custom-lists';

const ManualImportSchema = z.object({
  text: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = ManualImportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const candidates = extractCandidatesFromText(parsed.data.text);

    return NextResponse.json({ candidates, count: candidates.length });
  } catch (error) {
    console.error('[Spelling Manual Import POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
