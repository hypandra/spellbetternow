-- Add extremely difficult words from spelling bee history
-- Level 7 (ELO 1950-2050) - Challenge words for advanced spellers

INSERT INTO spelling_word_bank (word, definition, example_sentence, level, is_active, created_at) VALUES
-- Artistic and cultural terms
('chiaroscuro', 'the use of strong contrasts between light and dark in art', 'The painter''s masterful chiaroscuro created dramatic shadows.', 7, true, now()),

-- Literary and theatrical terms
('soubrette', 'a coquettish maid or frivolous young woman in comedies', 'The soubrette character entertained the audience with witty remarks.', 7, true, now()),

-- Medical terms
('erysipelas', 'an acute febrile disease of the skin and tissues caused by streptococcus', 'The doctor diagnosed the patient with erysipelas.', 7, true, now()),

-- Biological and scientific terms
('bougainvillea', 'a tropical flowering plant with colorful bracts', 'The bougainvillea climbed beautifully over the garden wall.', 7, true, now()),
('cernuous', 'drooping or nodding; bending forward', 'The cernuous posture of the weeping willow was graceful.', 7, true, now()),

-- Musical and phonetic terms
('aiguillette', 'a ornamental braided loop or cord worn on military uniforms', 'The general''s uniform was decorated with golden aiguillettes.', 7, true, now()),

-- Linguistic and archaic terms
('auslaut', 'the final sound or sounds of a word', 'The auslaut of the word determined its pronunciation.', 7, true, now()),

-- Mystical and esoteric terms
('odylic', 'relating to a hypothetical vital force or energy in all matter', 'The scientist dismissed the odylic theory as unproven.', 7, true, now()),

-- Architectural and ornamental terms
('pendeloque', 'a pear-shaped or drop-shaped ornament', 'The chandelier was adorned with crystal pendeloques.', 7, true, now()),

-- Textile and fabric terms
('chenille', 'a yarn with a fuzzy or caterpillar-like appearance', 'The chenille fabric felt soft and comfortable.', 6, true, now()),

-- Botanical terms
('chrysanthemum', 'a flowering plant with many varieties in various colors', 'The chrysanthemums bloomed beautifully in autumn.', 6, true, now()),

-- Musical terms
('crescendo', 'a gradual increase in loudness or intensity', 'The orchestra reached a powerful crescendo.', 6, true, now()),

-- Historical terms  
('antiquity', 'the ancient past, especially before the fall of the Roman Empire', 'Scholars studied the history of antiquity.', 6, true, now()),

-- Philosophical terms
('dichotomy', 'a division into two contrasting or contradictory things', 'The dichotomy between nature and nurture continues to intrigue scientists.', 6, true, now()),

-- General difficult terms for Level 6
('bourgeois', 'relating to the middle class; concerned with material interests', 'The bourgeois values of the merchants shaped society.', 6, true, now()),
('bureaucracy', 'a system of government marked by many bureaus and departments', 'The bureaucracy of the organization was complex.', 6, true, now()),
('cacophony', 'a harsh mixture of sounds; discord', 'The cacophony of the construction site was unbearable.', 6, true, now()),
('cataclysm', 'a violent upheaval; a disaster', 'The earthquake was a natural cataclysm.', 6, true, now()),
('connoisseur', 'an expert judge in matters of taste', 'She was a connoisseur of fine wines.', 6, true, now()),
('delineate', 'to describe or portray in words; to draw', 'He attempted to delineate the boundaries clearly.', 6, true, now()),
('ephemeral', 'lasting for a very short time; transitory', 'The ephemeral beauty of the flowers faded quickly.', 6, true, now()),
('exacerbate', 'to make worse; to aggravate', 'Stress can exacerbate health problems.', 6, true, now()),
('facetious', 'meant to be humorous or amusing; not serious', 'His facetious remarks made everyone laugh.', 6, true, now()),
('fastidious', 'very careful about details; hard to please', 'She was fastidious about keeping her home clean.', 6, true, now()),
('fervid', 'intensely enthusiastic or passionate', 'His fervid belief in the cause inspired others.', 6, true, now()),
('garrulous', 'excessively talkative; fond of talking', 'The garrulous old man talked all through dinner.', 6, true, now()),
('gregarious', 'fond of being with others; sociable', 'Humans are gregarious creatures by nature.', 6, true, now()),
('indefatigable', 'tireless; never growing tired', 'Her indefatigable efforts finally achieved results.', 6, true, now()),
('inscrutable', 'mysterious; impossible to understand', 'His inscrutable expression gave nothing away.', 6, true, now()),
('juxtapose', 'to place two things side by side', 'The artist chose to juxtapose light and dark colors.', 6, true, now()),
('languorous', 'slow and relaxed; lacking energy or liveliness', 'The languorous pace of the vacation was delightful.', 6, true, now()),
('meticulous', 'very careful and precise; paying great attention to detail', 'His meticulous work impressed the inspectors.', 6, true, now()),
('miscreant', 'a person who has done something evil or illegal', 'The miscreant was finally caught by police.', 6, true, now()),
('nonchalant', 'coolly unconcerned; indifferent', 'She responded with nonchalant confidence.', 6, true, now()),
('obfuscate', 'to make confusing or unclear', 'The lawyer tried to obfuscate the issue.', 6, true, now()),
('panacea', 'a solution or remedy for all problems', 'There is no panacea for human suffering.', 6, true, now()),
('parsimonious', 'unwilling to spend money; miserly; stingy', 'His parsimonious ways made him unpopular.', 6, true, now()),
('pellucid', 'translucently clear; easy to understand', 'The pellucid prose made the concept simple.', 6, true, now()),
('pernicious', 'having a harmful effect in an insidious way', 'The pernicious influence corrupted the organization.', 6, true, now()),
('perspicacious', 'having keen insight and understanding', 'Her perspicacious observations revealed the truth.', 6, true, now()),
('petulant', 'childishly sulky; peevish', 'His petulant behavior annoyed everyone.', 6, true, now()),
('profligate', 'recklessly extravagant; dissolute', 'The profligate spending depleted the treasury.', 6, true, now()),
('pusillanimous', 'lacking courage; cowardly', 'His pusillanimous response to danger disappointed us.', 6, true, now()),
('recalcitrant', 'stubbornly resistant to authority', 'The recalcitrant student refused to follow rules.', 6, true, now()),
('sanguine', 'optimistic, especially in an inappropriate way', 'Despite setbacks, he remained sanguine about success.', 6, true, now()),
('scintillate', 'to shine brightly; to sparkle', 'Diamonds scintillate in the light.', 6, true, now()),
('scrutinize', 'to examine closely and carefully', 'The inspector will scrutinize the documents.', 6, true, now()),
('serendipity', 'the occurrence of fortunate events by chance', 'Finding the lost ring was pure serendipity.', 6, true, now()),
('tangential', 'relating to a tangent; diverging from a course', 'His tangential remarks distracted from the main point.', 6, true, now()),
('ubiquitous', 'present, appearing, or found everywhere', 'Smartphones have become ubiquitous in society.', 6, true, now()),
('verisimilitude', 'the quality of appearing to be true or real', 'The novel had great verisimilitude.', 6, true, now()),
('vexillology', 'the study of flags', 'Her vexillology research focused on historical flags.', 7, true, now()),
('voluble', 'talking fluently, readily, or at length', 'He was a voluble speaker who captivated audiences.', 6, true, now()),
('voracious', 'eating or wanting food in great quantities; ravenous', 'The voracious appetite of the hungry animals was impressive.', 6, true, now()),
('wayward', 'unpredictable, erratic, or uncontrollable', 'The wayward child ignored all authority.', 6, true, now()),
('zealous', 'enthusiastic, eager, and devoted', 'The zealous volunteers worked tirelessly.', 6, true, now())
ON CONFLICT (word) DO NOTHING;

-- Update ELO values for newly inserted Level 6-7 words
UPDATE spelling_word_bank SET base_elo = 1850, current_elo = 1850 
WHERE level = 6 AND base_elo IS NULL;

UPDATE spelling_word_bank SET base_elo = 2000, current_elo = 2000 
WHERE level = 7 AND base_elo IS NULL;
