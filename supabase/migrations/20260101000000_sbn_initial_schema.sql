-- SpellBetterNow Initial Schema
-- Creates all tables needed for the spelling practice app

-- ============================================================================
-- TABLES
-- ============================================================================

-- Kid profiles (learners)
CREATE TABLE IF NOT EXISTS spelling_kids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  level_current INTEGER NOT NULL DEFAULT 3,
  elo_rating INTEGER NOT NULL DEFAULT 1500,
  total_attempts INTEGER NOT NULL DEFAULT 0,
  successful_attempts INTEGER NOT NULL DEFAULT 0,
  avatar_seed TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spelling_kids_parent ON spelling_kids(parent_user_id);

-- Word bank (vocabulary)
CREATE TABLE IF NOT EXISTS spelling_word_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL UNIQUE,
  level INTEGER NOT NULL DEFAULT 1,
  base_elo INTEGER,
  current_elo INTEGER,
  pattern TEXT,
  frequency_band TEXT,
  notes TEXT,
  definition TEXT,
  example_sentence TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spelling_word_bank_level ON spelling_word_bank(level);
CREATE INDEX IF NOT EXISTS idx_spelling_word_bank_active ON spelling_word_bank(is_active);
CREATE INDEX IF NOT EXISTS idx_spelling_word_elo_current ON spelling_word_bank(current_elo);

-- Sessions (practice sessions)
CREATE TABLE IF NOT EXISTS spelling_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_id UUID NOT NULL REFERENCES spelling_kids(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  level_start INTEGER NOT NULL,
  level_end INTEGER,
  mini_sets_completed INTEGER NOT NULL DEFAULT 0,
  attempts_total INTEGER NOT NULL DEFAULT 0,
  correct_total INTEGER NOT NULL DEFAULT 0,
  current_word_ids UUID[] NOT NULL DEFAULT '{}',
  current_word_index INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spelling_sessions_kid ON spelling_sessions(kid_id);
CREATE INDEX IF NOT EXISTS idx_spelling_sessions_started ON spelling_sessions(started_at DESC);

-- Attempts (individual word attempts)
CREATE TABLE IF NOT EXISTS spelling_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES spelling_sessions(id) ON DELETE CASCADE,
  kid_id UUID NOT NULL REFERENCES spelling_kids(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES spelling_word_bank(id),
  word_presented TEXT NOT NULL,
  user_spelling TEXT NOT NULL,
  correct BOOLEAN NOT NULL,
  response_ms INTEGER,
  replay_count INTEGER DEFAULT 0,
  edit_count INTEGER,
  user_elo_before INTEGER,
  user_elo_after INTEGER,
  word_elo_before INTEGER,
  word_elo_after INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spelling_attempts_session ON spelling_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_spelling_attempts_kid ON spelling_attempts(kid_id);
CREATE INDEX IF NOT EXISTS idx_spelling_attempts_word ON spelling_attempts(word_id);

-- Mastery tracking (per kid per word)
CREATE TABLE IF NOT EXISTS spelling_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_id UUID NOT NULL REFERENCES spelling_kids(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES spelling_word_bank(id),
  score INTEGER NOT NULL DEFAULT 0,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(kid_id, word_id)
);

CREATE INDEX IF NOT EXISTS idx_spelling_mastery_kid ON spelling_mastery(kid_id);

-- Mini-set summaries (aggregated stats per 5-word set)
CREATE TABLE IF NOT EXISTS spelling_mini_set_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES spelling_sessions(id) ON DELETE CASCADE,
  index INTEGER NOT NULL,
  level_effective INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  words_json JSONB NOT NULL DEFAULT '[]',
  lesson_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spelling_mini_set_session ON spelling_mini_set_summaries(session_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Increment session stats atomically
CREATE OR REPLACE FUNCTION increment_session_stats(session_id UUID, is_correct BOOLEAN)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE spelling_sessions
  SET
    attempts_total = attempts_total + 1,
    correct_total = correct_total + CASE WHEN is_correct THEN 1 ELSE 0 END,
    updated_at = now()
  WHERE id = session_id;
END;
$$;

-- Calculate kid Elo percentile
CREATE OR REPLACE FUNCTION spelling_kid_elo_percentile(p_kid_id TEXT)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  WITH target AS (
    SELECT elo_rating
    FROM spelling_kids
    WHERE id::text = p_kid_id
  ),
  stats AS (
    SELECT count(*)::numeric AS total
    FROM spelling_kids
  ),
  rank AS (
    SELECT count(*)::numeric AS below
    FROM spelling_kids, target
    WHERE spelling_kids.elo_rating <= target.elo_rating
  )
  SELECT CASE
    WHEN stats.total = 0 OR target.elo_rating IS NULL THEN 0
    ELSE rank.below / stats.total
  END
  FROM stats, rank, target;
$$;

-- ============================================================================
-- SEED DATA: Initial word bank (Levels 1-4)
-- ============================================================================

INSERT INTO spelling_word_bank (word, definition, example_sentence, level, is_active, base_elo, current_elo) VALUES
-- Level 1 (ELO ~1100)
('cat', 'a small furry animal', 'The cat sat on the mat.', 1, true, 1100, 1100),
('dog', 'a loyal pet animal', 'My dog loves to play fetch.', 1, true, 1100, 1100),
('sun', 'the star that gives us light', 'The sun is bright today.', 1, true, 1100, 1100),
('hat', 'something worn on the head', 'She wore a red hat.', 1, true, 1100, 1100),
('run', 'to move fast with legs', 'I like to run in the park.', 1, true, 1100, 1100),
('big', 'large in size', 'That is a big elephant.', 1, true, 1100, 1100),
('red', 'a warm color', 'The apple is red.', 1, true, 1100, 1100),
('bed', 'where you sleep', 'I sleep in my bed.', 1, true, 1100, 1100),
('cup', 'a container for drinks', 'Fill my cup with water.', 1, true, 1100, 1100),
('map', 'shows where places are', 'Look at the map to find home.', 1, true, 1100, 1100),

-- Level 2 (ELO ~1250)
('jump', 'to leap into the air', 'Watch me jump over the puddle.', 2, true, 1250, 1250),
('tree', 'a tall plant with branches', 'The bird sits in the tree.', 2, true, 1250, 1250),
('book', 'pages with words to read', 'I read a good book.', 2, true, 1250, 1250),
('fish', 'an animal that swims', 'The fish swims in the pond.', 2, true, 1250, 1250),
('play', 'to have fun', 'Let us play a game.', 2, true, 1250, 1250),
('hand', 'part of your arm', 'Raise your hand to answer.', 2, true, 1250, 1250),
('rain', 'water falling from clouds', 'The rain makes puddles.', 2, true, 1250, 1250),
('stop', 'to not move anymore', 'Stop at the red light.', 2, true, 1250, 1250),
('ball', 'a round toy', 'Throw the ball to me.', 2, true, 1250, 1250),
('help', 'to assist someone', 'Can you help me?', 2, true, 1250, 1250),

-- Level 3 (ELO ~1400)
('friend', 'someone you like spending time with', 'My friend and I play together.', 3, true, 1400, 1400),
('water', 'what we drink and swim in', 'Drink plenty of water.', 3, true, 1400, 1400),
('every', 'all of something', 'I brush my teeth every day.', 3, true, 1400, 1400),
('about', 'concerning something', 'Tell me about your day.', 3, true, 1400, 1400),
('would', 'used to express possibility', 'Would you like some cake?', 3, true, 1400, 1400),
('their', 'belonging to them', 'That is their house.', 3, true, 1400, 1400),
('there', 'in that place', 'Put the book over there.', 3, true, 1400, 1400),
('which', 'what one or ones', 'Which color do you like?', 3, true, 1400, 1400),
('because', 'for the reason that', 'I stayed home because I was sick.', 3, true, 1400, 1400),
('people', 'human beings', 'Many people live in the city.', 3, true, 1400, 1400),

-- Level 4 (ELO ~1550)
('different', 'not the same', 'We have different opinions.', 4, true, 1550, 1550),
('important', 'of great value', 'This is an important decision.', 4, true, 1550, 1550),
('together', 'with each other', 'We work together as a team.', 4, true, 1550, 1550),
('beautiful', 'very pleasing to look at', 'The sunset is beautiful.', 4, true, 1550, 1550),
('although', 'even though', 'Although it rained, we played.', 4, true, 1550, 1550),
('probably', 'most likely', 'It will probably rain tomorrow.', 4, true, 1550, 1550),
('favorite', 'liked the most', 'Pizza is my favorite food.', 4, true, 1550, 1550),
('necessary', 'needed or required', 'Sleep is necessary for health.', 4, true, 1550, 1550),
('beginning', 'the start of something', 'This is just the beginning.', 4, true, 1550, 1550),
('separate', 'divided or apart', 'Keep the colors separate.', 4, true, 1550, 1550)
ON CONFLICT (word) DO NOTHING;
