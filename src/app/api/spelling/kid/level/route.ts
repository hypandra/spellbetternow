import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getKid, updateKidElo, updateKidLevel } from '@/lib/spelling/db/kids';
import { getMaxWordLevel } from '@/lib/spelling/db/words';
import { levelToBaseElo } from '@/lib/spelling/elo';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { kidId, level } = body;

    if (!kidId || typeof level !== 'number') {
      return NextResponse.json({ error: 'kidId and level are required' }, { status: 400 });
    }

    const kid = await getKid(kidId, { useServiceRole: true });
    if (!kid) {
      return NextResponse.json({ error: 'Kid not found' }, { status: 404 });
    }
    if (kid.parent_user_id !== session.user.id) {
      return NextResponse.json({ error: 'Kid not found' }, { status: 404 });
    }

    const maxLevel = await getMaxWordLevel();
    const nextLevel = Math.max(1, Math.min(level, maxLevel));

    await updateKidLevel(kidId, nextLevel);
    await updateKidElo(
      kidId,
      levelToBaseElo(nextLevel),
      kid.total_attempts ?? 0,
      kid.successful_attempts ?? 0
    );

    return NextResponse.json({ level: nextLevel, maxLevel });
  } catch (error) {
    console.error('Update kid level error:', error);
    return NextResponse.json({ error: 'Failed to update kid level' }, { status: 500 });
  }
}
