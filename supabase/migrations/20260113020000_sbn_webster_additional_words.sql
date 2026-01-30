-- Add additional words from Noah Webster's American Spelling Book
-- Includes two-syllable words, word families, and derived forms

-- Two-syllable words (Level 4-5, ELO 1550-1700)
INSERT INTO spelling_word_bank (word, definition, example_sentence, level, is_active, created_at) VALUES
('glory', 'high renown or honor; magnificence', 'The glory of the ancient empire was legendary.', 4, true, now()),
('sacred', 'worthy of religious respect; holy', 'The sacred temple stood at the center of the city.', 4, true, now()),
('giant', 'a person of unusually great size or power', 'The giant oak tree dominated the landscape.', 4, true, now()),
('secret', 'kept hidden from knowledge or view', 'She kept the secret locked away in her heart.', 4, true, now()),
('gravy', 'sauce made from meat juices', 'The gravy enriched every bite of the meal.', 4, true, now()),
('pagan', 'a person who holds religious beliefs other than those of main religions', 'The pagan festivals celebrated nature and seasons.', 4, true, now()),
('shady', 'full of shade; of questionable honesty', 'The shady grove provided relief from the heat.', 4, true, now()),
('gavel', 'a small hammer used by a judge or auctioneer', 'The judge struck the gavel to maintain order.', 4, true, now()),
('paper', 'material made from wood pulp for writing', 'She wrote her thoughts on paper.', 4, true, now()),
('silent', 'making no sound; quiet', 'The silent library was perfect for studying.', 4, true, now()),
('spider', 'an arachnid with eight legs that spins webs', 'The spider weaved an intricate pattern.', 4, true, now()),
('story', 'a narrative account of events', 'She told an engaging story to the children.', 4, true, now()),
('student', 'a person formally engaged in learning', 'The student studied diligently for the exam.', 4, true, now()),
('stupid', 'lacking intelligence or common sense', 'He made a stupid mistake that cost him.', 4, true, now()),
('taper', 'to diminish gradually; a candle', 'The taper of the candlestick was elegant.', 4, true, now()),
('trader', 'a person who buys and sells goods', 'The trader traveled between villages.', 4, true, now()),
('tidings', 'news or information', 'The tidings of the victory spread quickly.', 4, true, now()),
('trial', 'a test of someone''s faith or patience; a legal proceeding', 'The trial tested his resolve.', 4, true, now()),
('truant', 'absent from school without permission', 'The truant student was discovered.', 4, true, now()),
('tumult', 'a loud, confused noise; commotion', 'The tumult of the marketplace was overwhelming.', 4, true, now()),
('tutor', 'a private teacher', 'The tutor helped him master mathematics.', 4, true, now()),
('vacant', 'empty; unoccupied', 'The vacant lot awaited development.', 4, true, now()),
('viper', 'a venomous snake', 'The viper hid among the rocks.', 4, true, now()),
('vital', 'essential to life; critical', 'Vital information was revealed during the meeting.', 4, true, now()),
('vocal', 'relating to the voice or singing', 'She was known for her vocal talent.', 4, true, now()),
('wafer', 'a thin, crisp biscuit', 'The wafer dissolved on his tongue.', 4, true, now()),
('wage', 'payment for work', 'He earned a fair wage for his labor.', 4, true, now()),
('wager', 'a bet; to risk something on an outcome', 'He made a wager on the outcome.', 4, true, now()),
('woeful', 'full of woe; miserable', 'His woeful expression revealed his sadness.', 4, true, now()),

-- Derived words (word families) - showing related forms
('graceful', 'moving or done in a smooth and attractive way', 'Her graceful movements captivated the audience.', 5, true, now()),
('graceless', 'lacking grace or elegance', 'His graceless manner offended everyone.', 5, true, now()),
('gracious', 'courteous, kind, and pleasant', 'The gracious hostess welcomed all guests.', 5, true, now()),
('pressure', 'the force exerted by one thing on another', 'The pressure built as the deadline approached.', 5, true, now()),
('impress', 'to make a strong effect on someone', 'She tried to impress him with her knowledge.', 5, true, now()),
('compress', 'to press or squeeze into a smaller space', 'Compress the files to save space.', 5, true, now()),
('depress', 'to make sad; to lower in level', 'Bad news can depress your spirits.', 5, true, now()),
('suppress', 'to prevent from being published or known', 'He tried to suppress his laughter.', 5, true, now()),
('oppress', 'to govern harshly; to burden', 'Unjust laws oppress the people.', 5, true, now()),

-- Foreign origin words (Level 4-5)
('machine', 'a device designed to perform a function', 'The machine operated smoothly.', 4, true, now()),
('chemise', 'a woman''s loose-fitting undergarment', 'The chemise was made of fine linen.', 5, true, now()),
('intrigue', 'to fascinate or interest greatly; secret plotting', 'The mystery continued to intrigue her.', 5, true, now())
ON CONFLICT (word) DO NOTHING;

-- Update ELO values for newly inserted words
UPDATE spelling_word_bank SET base_elo = 1550, current_elo = 1550 
WHERE level = 4 AND base_elo IS NULL;

UPDATE spelling_word_bank SET base_elo = 1700, current_elo = 1700 
WHERE level = 5 AND base_elo IS NULL;
