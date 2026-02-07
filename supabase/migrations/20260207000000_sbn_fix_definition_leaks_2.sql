-- Fix example sentences that leak the target word as a substring (plural forms)

UPDATE spelling_word_bank
SET example_sentence = 'The officer wore a braided cord on the shoulder of the dress uniform.'
WHERE word = 'aiguillette'
  AND example_sentence ILIKE '%aiguillettes%';

UPDATE spelling_word_bank
SET example_sentence = 'The river took a winding path through the valley.'
WHERE word = 'meander'
  AND example_sentence ILIKE '%meanders%';

UPDATE spelling_word_bank
SET example_sentence = 'The chandelier was adorned with teardrop-shaped crystal ornaments.'
WHERE word = 'pendeloque'
  AND example_sentence ILIKE '%pendeloques%';
