import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export interface Kid {
  id: string;
  parent_user_id: string;
  display_name: string;
  level_current: number;
  elo_rating?: number;
  total_attempts?: number;
  successful_attempts?: number;
  percentile?: number;
  avatar_seed?: string;
  audio_mode?: 'audio' | 'no-audio';
  created_at: string;
  updated_at: string;
}

export interface CreateKidData {
  display_name: string;
  avatar_seed?: string;
}

export function getSupabaseClient(useServiceRole = false, authToken?: string) {
  const key = useServiceRole ? supabaseServiceKey : supabaseAnonKey;
  if (!key) {
    throw new Error(`Missing Supabase ${useServiceRole ? 'service role' : 'anon'} key`);
  }
  if (!useServiceRole && authToken) {
    return createClient(supabaseUrl, key, {
      global: { headers: { Authorization: `Bearer ${authToken}` } },
    });
  }
  return createClient(supabaseUrl, key);
}

export async function getKids(parentUserId: string): Promise<Kid[]> {
  const supabase = getSupabaseClient(false);
  const { data, error } = await supabase
    .from('spelling_kids')
    .select('*')
    .eq('parent_user_id', parentUserId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createKid(parentUserId: string, data: CreateKidData): Promise<Kid> {
  const supabase = getSupabaseClient(false);
  const { data: kid, error } = await supabase
    .from('spelling_kids')
    .insert({
      parent_user_id: parentUserId,
      display_name: data.display_name,
      avatar_seed: data.avatar_seed,
      level_current: 3,
      elo_rating: 1500,
      total_attempts: 0,
      successful_attempts: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return kid;
}

export async function updateKidLevel(kidId: string, level: number): Promise<void> {
  const supabase = getSupabaseClient(true);
  const { error } = await supabase
    .from('spelling_kids')
    .update({ level_current: level, updated_at: new Date().toISOString() })
    .eq('id', kidId);

  if (error) throw error;
}

export async function updateKidElo(
  kidId: string,
  newElo: number,
  totalAttempts: number,
  successfulAttempts: number
): Promise<void> {
  const supabase = getSupabaseClient(true);
  const { error } = await supabase
    .from('spelling_kids')
    .update({
      elo_rating: newElo,
      total_attempts: totalAttempts,
      successful_attempts: successfulAttempts,
      updated_at: new Date().toISOString(),
    })
    .eq('id', kidId);

  if (error) throw error;
}

export async function getKidPercentile(kidId: string): Promise<number> {
  const supabase = getSupabaseClient(true);
  const { data, error } = await supabase.rpc('spelling_kid_elo_percentile', {
    p_kid_id: kidId,
  });

  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}

export async function getKid(kidId: string, options?: { authToken?: string; useServiceRole?: boolean }): Promise<Kid | null> {
  const supabase = getSupabaseClient(options?.useServiceRole ?? false, options?.authToken);
  const { data, error } = await supabase
    .from('spelling_kids')
    .select('*')
    .eq('id', kidId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}
