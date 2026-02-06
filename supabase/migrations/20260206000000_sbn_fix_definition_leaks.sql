-- Fix definitions that leak spelling hints (contain root/variant of the target word)

UPDATE spelling_word_bank
SET definition = 'a system of government marked by many offices and departments'
WHERE word = 'bureaucracy'
  AND definition ILIKE '%bureaus%';

UPDATE spelling_word_bank
SET definition = 'the state or quality of being above others; excellence'
WHERE word = 'superiority'
  AND definition ILIKE '%superior%';

UPDATE spelling_word_bank
SET definition = 'the quality of applying to all cases or people without exception'
WHERE word = 'universality'
  AND definition ILIKE '%universal%';

UPDATE spelling_word_bank
SET definition = 'the quality of being unconventional; deviation from normal behavior'
WHERE word = 'eccentricity'
  AND definition ILIKE '%eccentric%';
