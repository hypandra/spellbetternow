/**
 * Review and manage hint feedback from users.
 *
 * Usage:
 *   bun scripts/review-hint-feedback.ts list          # Show unaddressed feedback
 *   bun scripts/review-hint-feedback.ts address <id>  # Mark feedback as addressed
 *   bun scripts/review-hint-feedback.ts stats         # Summary stats by word
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const [, , command, ...args] = process.argv;

interface FeedbackRow {
  id: string;
  rating: boolean | null;
  feedback_text: string | null;
  created_at: string;
  word_id: string;
  spelling_word_bank?: {
    word: string;
  } | null;
}

async function listUnaddressed() {
  const { data, error } = await supabase
    .from("spelling_hint_feedback")
    .select(
      `
      id,
      rating,
      feedback_text,
      created_at,
      word_id,
      spelling_word_bank!inner(word)
    `
    )
    .is("addressed_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log("No unaddressed feedback.");
    return;
  }

  console.log(`\n${data.length} unaddressed feedback entries:\n`);
  for (const row of data as FeedbackRow[]) {
    const word = row.spelling_word_bank?.word ?? "?";
    const rating = row.rating ? "👍" : "👎";
    const text = row.feedback_text ? ` — "${row.feedback_text}"` : "";
    const date = new Date(row.created_at).toLocaleDateString();
    console.log(`  ${row.id.slice(0, 8)}  ${rating}  ${word}${text}  (${date})`);
  }
}

async function addressFeedback(id: string) {
  const { error } = await supabase
    .from("spelling_hint_feedback")
    .update({ addressed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  console.log(`Marked ${id} as addressed.`);
}

async function showStats() {
  const { data, error } = await supabase
    .from("spelling_hint_feedback")
    .select(
      `
      word_id,
      rating,
      spelling_word_bank!inner(word)
    `
    )
    .is("addressed_at", null);

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log("No unaddressed feedback.");
    return;
  }

  const byWord = new Map<string, { word: string; up: number; down: number }>();
  for (const row of data as FeedbackRow[]) {
    const word = row.spelling_word_bank?.word ?? "?";
    const existing = byWord.get(row.word_id) ?? { word, up: 0, down: 0 };
    if (row.rating) {
      existing.up++;
    } else {
      existing.down++;
    }
    byWord.set(row.word_id, existing);
  }

  const sorted = [...byWord.entries()].sort(
    ([, a], [, b]) => b.down - a.down
  );

  console.log(`\nFeedback by word (${sorted.length} words):\n`);
  console.log("  Word                 👍   👎");
  console.log("  " + "-".repeat(35));
  for (const [, { word, up, down }] of sorted) {
    console.log(
      `  ${word.padEnd(20)} ${String(up).padStart(3)}  ${String(down).padStart(3)}`
    );
  }
}

switch (command) {
  case "list":
    await listUnaddressed();
    break;
  case "address":
    if (!args[0]) {
      console.error("Usage: bun scripts/review-hint-feedback.ts address <id>");
      process.exit(1);
    }
    await addressFeedback(args[0]);
    break;
  case "stats":
    await showStats();
    break;
  default:
    console.log("Usage:");
    console.log("  bun scripts/review-hint-feedback.ts list");
    console.log("  bun scripts/review-hint-feedback.ts address <id>");
    console.log("  bun scripts/review-hint-feedback.ts stats");
}
