-- Expand spelling word bank for levels 5-7
-- Adds 60+ high-difficulty words to support adaptive placement tests

-- Level 5 words (ELO 1650-1750, Advanced)
-- Using ON CONFLICT DO NOTHING to skip duplicates
INSERT INTO spelling_word_bank (word, definition, example_sentence, level, is_active, created_at) VALUES
('melancholy', 'a feeling of pensive sadness', 'The music evoked a melancholy mood.', 5, true, now()),
('eloquent', 'fluent or persuasive in speaking or writing', 'Her eloquent speech moved the audience.', 5, true, now()),
('pragmatic', 'dealing with things in a practical way based on actual circumstances', 'We need a pragmatic approach to solve this problem.', 5, true, now()),
('meticulous', 'showing great attention to detail; very careful and precise', 'Her meticulous research impressed the committee.', 5, true, now()),
('benevolent', 'kind and generous', 'The benevolent donor funded the entire project.', 5, true, now()),
('eloquence', 'fluent or persuasive speaking or writing', 'The speech was delivered with eloquence.', 5, true, now()),
('vigilant', 'keeping careful watch for possible danger or problems', 'The security team remained vigilant throughout the night.', 5, true, now()),
('resilient', 'able to withstand or recover quickly from difficult conditions', 'The resilient community rebuilt after the disaster.', 5, true, now()),
('ambiguous', 'open to more than one interpretation; unclear', 'The statement was ambiguous and caused confusion.', 5, true, now()),
('meander', 'to walk or move in a winding path without a fixed course', 'The river meanders through the valley.', 5, true, now()),
('nascent', 'just beginning to exist or develop', 'The nascent technology shows great promise.', 5, true, now()),
('peculiar', 'strange or odd; unusual', 'She has a peculiar habit of organizing by color.', 5, true, now()),
('succinct', 'briefly and clearly expressed', 'The report was succinct yet comprehensive.', 5, true, now()),
('zenith', 'the highest point or peak of something', 'The band reached the zenith of their fame in the 90s.', 5, true, now()),
('quaint', 'attractively old-fashioned or unusual', 'We stayed in a quaint cottage in the countryside.', 5, true, now()),
('ephemeral', 'lasting for a very short time', 'The beauty of cherry blossoms is ephemeral.', 5, true, now()),
('turbulent', 'characterized by conflict, disorder, or confusion', 'The flight was turbulent due to the storm.', 5, true, now()),
('steadfast', 'firm and unwavering in commitment', 'Her steadfast dedication never wavered.', 5, true, now()),
('transient', 'temporary; not permanent', 'The transient nature of fame concerned him.', 5, true, now()),
('vivacity', 'liveliness and animation', 'She brought vivacity to every conversation.', 5, true, now()),
('nostalgia', 'sentimental longing for the past', 'He felt nostalgia looking at old photographs.', 5, true, now()),
('monotonous', 'lacking in variety; tedious', 'The monotonous task made him fall asleep.', 5, true, now()),
('symmetrical', 'composed of exactly similar parts facing each other', 'The building has a symmetrical design.', 5, true, now()),
('diligence', 'care and effort in one''s work or duties', 'Her diligence paid off with excellent results.', 5, true, now()),
('serene', 'calm, peaceful, and untroubled', 'The serene lake reflected the mountains perfectly.', 5, true, now())
ON CONFLICT (word) DO NOTHING;

-- Level 6 words (ELO 1800-1900, Very Advanced)
INSERT INTO spelling_word_bank (word, definition, example_sentence, level, is_active, created_at) VALUES
('serendipity', 'the occurrence of events by chance in a happy or beneficial way', 'Finding that old friend was pure serendipity.', 6, true, now()),
('juxtapose', 'place two things side by side for contrasting effect', 'The artist chose to juxtapose light and dark colors.', 6, true, now()),
('perspicacious', 'having keen insight and understanding', 'Her perspicacious observations revealed hidden patterns.', 6, true, now()),
('obfuscate', 'render obscure, unclear, or unintelligible', 'The lengthy document seemed to obfuscate the main point.', 6, true, now()),
('gregarious', 'fond of being with others; sociable', 'Unlike his gregarious siblings, he preferred solitude.', 6, true, now()),
('ostentatious', 'characterized by vulgar or showy display', 'His ostentatious jewelry drew unwanted attention.', 6, true, now()),
('felicitous', 'apt and wellsuited; pleasing or fortunate', 'Her felicitous choice of words impressed everyone.', 6, true, now()),
('ameliorate', 'make better or more tolerable', 'The new policies should ameliorate the situation.', 6, true, now()),
('ubiquitous', 'present, appearing, or found everywhere', 'Smartphones have become ubiquitous in modern society.', 6, true, now()),
('indefatigable', 'persisting tirelessly; never tiring', 'His indefatigable efforts finally succeeded.', 6, true, now()),
('insouciant', 'showing a casual lack of concern; carefree', 'She had an insouciant attitude toward responsibility.', 6, true, now()),
('quintessential', 'representing the perfect example of something', 'New York is the quintessential American city.', 6, true, now()),
('anachronistic', 'belonging to a period other than that represented', 'The historical film contained anachronistic details.', 6, true, now()),
('magnanimous', 'generous or forgiving, especially toward a rival', 'The magnanimous winner congratulated the loser.', 6, true, now()),
('pusillanimous', 'showing a lack of courage; cowardly', 'His pusillanimous behavior disappointed his team.', 6, true, now()),
('antediluvian', 'belonging to the period before the Biblical flood', 'The antediluvian customs seemed obsolete.', 6, true, now()),
('obsequious', 'obedient or attentive to an excessive or servile degree', 'His obsequious manner was off-putting to others.', 6, true, now()),
('propinquity', 'the state of being close to someone or something', 'Their propinquity led to a close friendship.', 6, true, now()),
('pellucid', 'translucently clear in style or meaning', 'The author wrote with pellucid prose.', 6, true, now()),
('sagacious', 'having keen mental discernment and judgment', 'The sagacious leader made wise decisions.', 6, true, now()),
('capricious', 'given to sudden and unaccountable changes of mood or behavior', 'Her capricious decisions frustrat her team.', 6, true, now()),
('sanguine', 'optimistic or positive about future prospects', 'Despite setbacks, he remained sanguine about success.', 6, true, now()),
('verisimilitude', 'the quality of appearing to be true or real', 'The novel had great verisimilitude and believability.', 6, true, now()),
('perspicacity', 'keenness of insight or judgment', 'His perspicacity in business was legendary.', 6, true, now()),
('loquacious', 'tending to talk a great deal; talkative', 'The loquacious guest dominated every conversation.', 6, true, now())
ON CONFLICT (word) DO NOTHING;

-- Level 7 words (ELO 1950-2050, Extremely Advanced)
INSERT INTO spelling_word_bank (word, definition, example_sentence, level, is_active, created_at) VALUES
('obstreperous', 'noisy, energetic, or boisterous; unruly', 'The obstreperous crowd refused to quiet down.', 7, true, now()),
('sesquipedalian', 'characterized by long words and long-winded phrases', 'His sesquipedalian writing style was hard to follow.', 7, true, now()),
('surreptitious', 'kept secret or done secretively', 'They exchanged surreptitious glances across the room.', 7, true, now()),
('vituperative', 'formal criticism or verbal abuse', 'His vituperative speech shocked the audience.', 7, true, now()),
('sedulous', 'carrying out tasks in a careful and persevering manner', 'Her sedulous attention to detail was admirable.', 7, true, now()),
('oleaginous', 'containing, producing, or covered with oil', 'The oleaginous substance left stains on the fabric.', 7, true, now()),
('pellucidity', 'the quality of being clear and easy to understand', 'The pellucidity of his explanation aided comprehension.', 7, true, now()),
('perspicacity', 'the quality of having keen insight', 'Her perspicacity revealed the hidden truth.', 7, true, now()),
('pernicious', 'having a harmful effect in an insidious way', 'The pernicious influence corrupted the organization.', 7, true, now()),
('propinquity', 'the quality or state of being propinquitous; nearness', 'Their geographical propinquity fostered connection.', 7, true, now()),
('sagacity', 'the quality of having keen mental discernment', 'The sagacity of her counsel guided many decisions.', 7, true, now()),
('wistful', 'feeling a sense of vague or regretful longing', 'She had a wistful expression looking at old photos.', 7, true, now()),
('attenuation', 'the action or fact of attenuating something', 'The attenuation of the signal caused problems.', 7, true, now()),
('antithetical', 'directly opposed or contrasted', 'His views were antithetical to modern thinking.', 7, true, now()),
('veridical', 'truthful or factual; not false', 'The witness gave a veridical account of events.', 7, true, now()),
('vituperative', 'formal abusive language', 'The vituperative language was uncalled for.', 7, true, now()),
('osculation', 'the action of kissing', 'The osculation between the couple was tender.', 7, true, now()),
('opulence', 'wealth and luxuriousness', 'The opulence of the mansion was overwhelming.', 7, true, now()),
('pusillanimity', 'the quality of being cowardly', 'His pusillanimity prevented him from action.', 7, true, now()),
('susurration', 'a whispering or rustling sound', 'The susurration of leaves filled the forest.', 7, true, now()),
('erudite', 'scholarly; learned', 'His erudite lectures captivated the students.', 7, true, now()),
('mellifluous', 'of a voice or words; sweet or musical', 'Her mellifluous voice enchanted the audience.', 7, true, now()),
('ineffable', 'too great or extreme to be expressed in words', 'The ineffable beauty of the sunset moved them.', 7, true, now()),
('ephemeridae', 'things that are short-lived or transitory', 'The flowers were ephemeridae, lasting only days.', 7, true, now()),
('sesquipedalian', 'characterized by long words; long-winded', 'The sesquipedalian title was difficult to remember.', 7, true, now())
ON CONFLICT (word) DO NOTHING;

-- Update base_elo and current_elo for new words based on their level
UPDATE spelling_word_bank
SET base_elo = CASE level
  WHEN 1 THEN 1100
  WHEN 2 THEN 1250
  WHEN 3 THEN 1400
  WHEN 4 THEN 1550
  WHEN 5 THEN 1700
  WHEN 6 THEN 1850
  WHEN 7 THEN 2000
  ELSE 1500
END,
current_elo = CASE level
  WHEN 1 THEN 1100
  WHEN 2 THEN 1250
  WHEN 3 THEN 1400
  WHEN 4 THEN 1550
  WHEN 5 THEN 1700
  WHEN 6 THEN 1850
  WHEN 7 THEN 2000
  ELSE 1500
END
WHERE base_elo IS NULL OR current_elo IS NULL;

-- Verify counts by level
SELECT level, COUNT(*) as word_count
FROM spelling_word_bank
WHERE is_active = true
GROUP BY level
ORDER BY level;
