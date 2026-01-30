-- SpellBetterNow: Session management and custom lists tables
-- Run after initial schema

-- ============================================================================
-- SESSION MANAGEMENT TABLES
-- ============================================================================

-- Session locks (prevent concurrent modifications)
CREATE TABLE IF NOT EXISTS spelling_session_locks (
  session_id UUID PRIMARY KEY REFERENCES spelling_sessions(id) ON DELETE CASCADE,
  lock_token TEXT NOT NULL,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_spelling_session_locks_expires ON spelling_session_locks(expires_at);

-- Session runner state (persisted state machine)
CREATE TABLE IF NOT EXISTS spelling_session_runners (
  session_id UUID PRIMARY KEY REFERENCES spelling_sessions(id) ON DELETE CASCADE,
  runner_state JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- CUSTOM LISTS TABLES
-- ============================================================================

-- Custom word lists (user-created)
CREATE TABLE IF NOT EXISTS spelling_custom_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  scope_type TEXT NOT NULL DEFAULT 'private',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spelling_custom_lists_owner ON spelling_custom_lists(owner_user_id);

-- Import sources (track where words came from)
CREATE TABLE IF NOT EXISTS spelling_custom_list_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES spelling_custom_lists(id) ON DELETE CASCADE,
  owner_user_id TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'manual_text',
  source_text TEXT,
  created_by_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spelling_custom_list_sources_list ON spelling_custom_list_sources(list_id);

-- Individual words in custom lists
CREATE TABLE IF NOT EXISTS spelling_custom_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES spelling_custom_lists(id) ON DELETE CASCADE,
  owner_user_id TEXT NOT NULL,
  source_id UUID REFERENCES spelling_custom_list_sources(id) ON DELETE SET NULL,
  word_text TEXT NOT NULL,
  word_display TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(list_id, word_text)
);

CREATE INDEX IF NOT EXISTS idx_spelling_custom_list_items_list ON spelling_custom_list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_spelling_custom_list_items_word ON spelling_custom_list_items(word_text);

-- Kid-to-list assignments (which lists apply to which kids)
CREATE TABLE IF NOT EXISTS spelling_kid_list_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_id UUID NOT NULL REFERENCES spelling_kids(id) ON DELETE CASCADE,
  list_id UUID NOT NULL REFERENCES spelling_custom_lists(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  weight INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(kid_id, list_id)
);

CREATE INDEX IF NOT EXISTS idx_spelling_kid_list_assignments_kid ON spelling_kid_list_assignments(kid_id);
CREATE INDEX IF NOT EXISTS idx_spelling_kid_list_assignments_list ON spelling_kid_list_assignments(list_id);
