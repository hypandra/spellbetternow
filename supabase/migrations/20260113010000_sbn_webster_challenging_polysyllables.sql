-- Add challenging polysyllabic words from Noah Webster's American Spelling Book
-- These are historically accurate words from the 1800s spelling curriculum

-- Webster's Challenging Polysyllables (Level 6-7, ELO 1850-2050)
INSERT INTO spelling_word_bank (word, definition, example_sentence, level, is_active, created_at) VALUES
('magnanimity', 'the quality of being generous and forgiving; noble spirit', 'His magnanimity in forgiving his enemies was remarkable.', 6, true, now()),
('perspicuity', 'clarity of expression; lucidity of style or language', 'The perspicuity of his writing made complex ideas accessible.', 6, true, now()),
('perpetuity', 'the quality of lasting forever or indefinitely', 'The trust was established in perpetuity for future generations.', 6, true, now()),
('sensibility', 'the capacity to perceive or feel; emotional sensitivity', 'Her sensibility to music was evident in her moving performances.', 6, true, now()),
('superiority', 'the state or quality of being superior; excellence', 'The superiority of their craftsmanship was undeniable.', 6, true, now()),
('universality', 'the quality of being universal; applicability to all', 'The universality of human emotions transcends all cultures.', 6, true, now()),
('electricity', 'a form of energy resulting from charged particles', 'The electricity in the room was palpable as they awaited news.', 5, true, now()),
('eccentricity', 'the quality of being eccentric; deviation from normal behavior', 'Her eccentricity made her memorable among her peers.', 6, true, now())
ON CONFLICT (word) DO NOTHING;

-- Update ELO values for words that may have been inserted
UPDATE spelling_word_bank
SET base_elo = 1850, current_elo = 1850
WHERE word IN ('magnanimity', 'perspicuity', 'perpetuity', 'sensibility', 'superiority', 'universality', 'eccentricity')
AND level = 6
AND base_elo IS NULL;

UPDATE spelling_word_bank
SET base_elo = 1700, current_elo = 1700
WHERE word = 'electricity'
AND level = 5
AND base_elo IS NULL;

-- Verify the words were added
SELECT word, level, definition FROM spelling_word_bank 
WHERE word IN ('magnanimity', 'perspicuity', 'perpetuity', 'sensibility', 'superiority', 'universality', 'electricity', 'eccentricity')
ORDER BY level, word;
