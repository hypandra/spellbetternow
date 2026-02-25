-- Drop foreign key constraints on word_id that reference spelling_word_bank.
-- Custom list words may not exist in the word bank, so attempts and mastery
-- need to accept custom list item UUIDs as word_id values.

-- spelling_attempts
ALTER TABLE spelling_attempts
  DROP CONSTRAINT IF EXISTS spelling_attempts_word_id_fkey;

-- spelling_mastery
ALTER TABLE spelling_mastery
  DROP CONSTRAINT IF EXISTS spelling_mastery_word_id_fkey;
