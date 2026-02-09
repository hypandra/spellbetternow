-- No-audio spelling mode: hint columns, audio_mode preference, hint feedback table

-- Add hint columns to word bank
ALTER TABLE spelling_word_bank
  ADD COLUMN IF NOT EXISTS part_of_speech TEXT,
  ADD COLUMN IF NOT EXISTS not_synonyms TEXT[],
  ADD COLUMN IF NOT EXISTS letter_fragments TEXT[],
  ADD COLUMN IF NOT EXISTS rhyme_hints TEXT[];

-- Track prompt mode on each attempt
ALTER TABLE spelling_attempts
  ADD COLUMN IF NOT EXISTS prompt_mode TEXT;

-- Add audio mode preference to kids
ALTER TABLE spelling_kids
  ADD COLUMN IF NOT EXISTS audio_mode TEXT NOT NULL DEFAULT 'audio';

-- Hint feedback table (Sparrow-style)
CREATE TABLE IF NOT EXISTS spelling_hint_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES spelling_attempts(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES spelling_word_bank(id) ON DELETE CASCADE,
  kid_id UUID NOT NULL REFERENCES spelling_kids(id) ON DELETE CASCADE,
  rating BOOLEAN NOT NULL,
  feedback_text TEXT,
  addressed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hint_feedback_word_id ON spelling_hint_feedback(word_id);
CREATE INDEX IF NOT EXISTS idx_hint_feedback_unaddressed ON spelling_hint_feedback(addressed_at) WHERE addressed_at IS NULL;
