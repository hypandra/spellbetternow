import { betterAuth } from "better-auth"
import { Pool } from "pg"
import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"

// Create PostgreSQL pool with SSL configuration using Supabase CA certificate
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: {
    ca: fs.readFileSync(path.join(process.cwd(), "prod-ca-2021.crt")).toString(),
    rejectUnauthorized: true,
  },
})

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function deleteUserData(userId: string) {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Supabase service role key missing. Skipping account data cleanup.");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: kids } = await supabase
      .from("spelling_kids")
      .select("id")
      .eq("parent_user_id", userId);
    const kidIds = (kids || []).map((kid: { id: string }) => kid.id);

    const { data: sessions } = kidIds.length
      ? await supabase
          .from("spelling_sessions")
          .select("id")
          .in("kid_id", kidIds)
      : { data: [] as Array<{ id: string }> };
    const sessionIds = (sessions || []).map(session => session.id);

    if (sessionIds.length) {
      await supabase.from("spelling_session_locks").delete().in("session_id", sessionIds);
      await supabase.from("spelling_session_runners").delete().in("session_id", sessionIds);
      await supabase.from("spelling_mini_set_summaries").delete().in("session_id", sessionIds);
    }

    if (kidIds.length) {
      await supabase.from("spelling_attempts").delete().in("kid_id", kidIds);
      await supabase.from("spelling_mastery").delete().in("kid_id", kidIds);
      await supabase.from("spelling_kid_list_assignments").delete().in("kid_id", kidIds);
      await supabase.from("spelling_sessions").delete().in("kid_id", kidIds);
      await supabase.from("spelling_kids").delete().in("parent_user_id", [userId]);
    }

    const { data: lists } = await supabase
      .from("spelling_custom_lists")
      .select("id")
      .eq("owner_user_id", userId);
    const listIds = (lists || []).map((list: { id: string }) => list.id);

    if (listIds.length) {
      await supabase.from("spelling_custom_list_items").delete().in("list_id", listIds);
      await supabase.from("spelling_custom_list_sources").delete().in("list_id", listIds);
      await supabase.from("spelling_kid_list_assignments").delete().in("list_id", listIds);
    }

    await supabase.from("spelling_custom_lists").delete().eq("owner_user_id", userId);
  } catch (error) {
    console.error("Failed to delete user data:", error);
  }
}

export const auth = betterAuth({
  database: pool as any,
  emailAndPassword: {
    enabled: true,
  },
  user: {
    modelName: "sbn_user",
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        await deleteUserData(user.id);
      },
    },
  },
  session: {
    modelName: "sbn_session",
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
  account: {
    modelName: "sbn_account",
  },
  verification: {
    modelName: "sbn_verification",
  },
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "https://spellbetternow.com",
    "https://www.spellbetternow.com",
  ],
})
