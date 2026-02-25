-- Backfill: promote existing enriched custom list items into the word bank.
-- Words that already exist in the bank are skipped (ON CONFLICT DO NOTHING).
INSERT INTO spelling_word_bank (word, definition, example_sentence, part_of_speech, level, base_elo, current_elo, is_active)
SELECT DISTINCT ON (cli.word_text)
  cli.word_text,
  cli.definition,
  cli.example_sentence,
  cli.part_of_speech,
  COALESCE(cli.level, 3),
  COALESCE(cli.estimated_elo, 1500),
  COALESCE(cli.estimated_elo, 1500),
  true
FROM spelling_custom_list_items cli
WHERE cli.definition IS NOT NULL
  AND cli.definition <> ''
  AND cli.is_active = true
ORDER BY cli.word_text, cli.created_at DESC
ON CONFLICT (word) DO NOTHING;
