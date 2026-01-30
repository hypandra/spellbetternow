import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabaseClient() {
  if (!supabaseServiceKey) {
    throw new Error('Missing Supabase service role key');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export interface SessionLockResult {
  acquired: boolean;
  token?: string;
  expiresAt?: string;
}

export async function acquireSessionLock(
  sessionId: string,
  ttlMs = 30000
): Promise<SessionLockResult> {
  const supabase = getSupabaseClient();
  const lockToken = crypto.randomUUID();
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + ttlMs).toISOString();

  const { error: insertError } = await supabase
    .from('spelling_session_locks')
    .insert({
      session_id: sessionId,
      lock_token: lockToken,
      locked_at: nowIso,
      expires_at: expiresAt,
    });

  if (!insertError) {
    return { acquired: true, token: lockToken, expiresAt };
  }

  if (insertError.code !== '23505') {
    throw insertError;
  }

  const { data: updated, error: updateError } = await supabase
    .from('spelling_session_locks')
    .update({
      lock_token: lockToken,
      locked_at: nowIso,
      expires_at: expiresAt,
    })
    .eq('session_id', sessionId)
    .lt('expires_at', nowIso)
    .select('session_id');

  if (updateError) throw updateError;

  if (updated && updated.length > 0) {
    return { acquired: true, token: lockToken, expiresAt };
  }

  return { acquired: false };
}

export async function releaseSessionLock(sessionId: string, token: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('spelling_session_locks')
    .delete()
    .eq('session_id', sessionId)
    .eq('lock_token', token);

  if (error) throw error;
}
