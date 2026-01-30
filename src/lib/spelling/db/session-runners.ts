import { createClient } from '@supabase/supabase-js';
import type { SessionRunnerState } from '../session/session-runner';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabaseClient() {
  if (!supabaseServiceKey) {
    throw new Error('Missing Supabase service role key');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function getSessionRunnerState(
  sessionId: string
): Promise<SessionRunnerState | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('spelling_session_runners')
    .select('runner_state')
    .eq('session_id', sessionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return (data?.runner_state as SessionRunnerState) || null;
}

export async function saveSessionRunnerState(
  sessionId: string,
  state: SessionRunnerState
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('spelling_session_runners')
    .upsert({
      session_id: sessionId,
      runner_state: state,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
}

export async function deleteSessionRunnerState(sessionId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('spelling_session_runners')
    .delete()
    .eq('session_id', sessionId);

  if (error) throw error;
}
