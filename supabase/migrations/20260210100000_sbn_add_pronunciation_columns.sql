-- Add IPA and phonetic respelling columns for no-audio pronunciation hints
-- Only populated for level 5+ words

ALTER TABLE spelling_word_bank
  ADD COLUMN IF NOT EXISTS ipa text,
  ADD COLUMN IF NOT EXISTS phonetic text;

COMMENT ON COLUMN spelling_word_bank.ipa IS 'IPA transcription (General American), e.g. /əˈkɑməˌdeɪt/';
COMMENT ON COLUMN spelling_word_bank.phonetic IS 'Phonetic respelling for accessibility, e.g. uh-KOM-uh-dayt';
