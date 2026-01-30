import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getKidPercentile } from '@/lib/spelling/db/kids';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getServiceClient() {
  if (!supabaseServiceKey) {
    throw new Error('Missing Supabase service role key');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('spelling_kids')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Kid not found' }, { status: 404 });
    }

    if (data.parent_user_id !== session.user.id) {
      return NextResponse.json({ error: 'Kid not found' }, { status: 404 });
    }

    const percentile = await getKidPercentile(data.id);
    return NextResponse.json({ kid: { ...data, percentile: Math.round(percentile * 100) } });
  } catch (error) {
    console.error('[Spelling Kids] GET by id error:', error);
    return NextResponse.json({ error: 'Failed to load kid' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();

    // Verify kid belongs to user
    const { data: kid, error: fetchError } = await supabase
      .from('spelling_kids')
      .select('id, parent_user_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!kid || kid.parent_user_id !== session.user.id) {
      return NextResponse.json({ error: 'Kid not found' }, { status: 404 });
    }

    // Delete the kid
    const { error: deleteError } = await supabase
      .from('spelling_kids')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Spelling Kids] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete kid' }, { status: 500 });
  }
}
