ALTER TABLE spelling_custom_list_items
  ADD COLUMN IF NOT EXISTS definition TEXT,
  ADD COLUMN IF NOT EXISTS example_sentence TEXT,
  ADD COLUMN IF NOT EXISTS part_of_speech TEXT,
  ADD COLUMN IF NOT EXISTS level INTEGER,
  ADD COLUMN IF NOT EXISTS estimated_elo INTEGER;
