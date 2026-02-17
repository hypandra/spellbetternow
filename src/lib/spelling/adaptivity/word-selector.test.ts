import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetCustomListWordsForKid = vi.fn();

vi.mock('../db/words', () => ({
  getWordsForMiniSetByElo: vi.fn(),
  getEasierWordsByElo: vi.fn(),
}));

vi.mock('../db/custom-lists-db', () => ({
  getCustomListWordsForKid: mockGetCustomListWordsForKid,
}));

import { selectMiniSetWords } from './word-selector';
import { getWordsForMiniSetByElo, getEasierWordsByElo } from '../db/words';
import type { Word } from '../db/words';

const mockGetWordsForMiniSetByElo = getWordsForMiniSetByElo as ReturnType<typeof vi.fn>;
const mockGetEasierWordsByElo = getEasierWordsByElo as ReturnType<typeof vi.fn>;

describe('selectMiniSetWords custom list integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWordsForMiniSetByElo.mockResolvedValue([]);
    mockGetEasierWordsByElo.mockResolvedValue([]);
    mockGetCustomListWordsForKid.mockResolvedValue([]);
  });

  it('uses only word bank words when kid has no custom list assignments', async () => {
    const wordBankWords: Word[] = [
      { id: 'wb-1', word: 'harvest', level: 3, current_elo: 1480, is_active: true, created_at: '2026-01-02T00:00:00.000Z' },
      { id: 'wb-2', word: 'lantern', level: 3, current_elo: 1500, is_active: true, created_at: '2026-01-02T00:00:00.000Z' },
      { id: 'wb-3', word: 'pioneer', level: 3, current_elo: 1510, is_active: true, created_at: '2026-01-02T00:00:00.000Z' },
      { id: 'wb-4', word: 'shelter', level: 3, current_elo: 1490, is_active: true, created_at: '2026-01-02T00:00:00.000Z' },
      { id: 'wb-5', word: 'courage', level: 3, current_elo: 1520, is_active: true, created_at: '2026-01-02T00:00:00.000Z' },
    ];
    mockGetWordsForMiniSetByElo.mockResolvedValue(wordBankWords);

    const result = await selectMiniSetWords(1500, 'kid-1', []);

    expect(result.map(w => w.id)).toEqual(['wb-1', 'wb-2', 'wb-3', 'wb-4', 'wb-5']);
    expect(mockGetCustomListWordsForKid).toHaveBeenCalledWith('kid-1');
  });

  it('includes custom list words when kid has an assigned list', async () => {
    const wordBankWords: Word[] = [
      { id: 'wb-1', word: 'garden', level: 3, current_elo: 1490, is_active: true, created_at: '2026-01-02T00:00:00.000Z' },
      { id: 'wb-2', word: 'planet', level: 3, current_elo: 1500, is_active: true, created_at: '2026-01-02T00:00:00.000Z' },
      { id: 'wb-3', word: 'silver', level: 3, current_elo: 1510, is_active: true, created_at: '2026-01-02T00:00:00.000Z' },
      { id: 'wb-4', word: 'jungle', level: 3, current_elo: 1520, is_active: true, created_at: '2026-01-02T00:00:00.000Z' },
      { id: 'wb-5', word: 'minute', level: 3, current_elo: 1485, is_active: true, created_at: '2026-01-02T00:00:00.000Z' },
    ];
    const customListWords: Word[] = [
      { id: 'cl-1', word: 'alligator', level: 3, current_elo: 1505, is_active: true, created_at: '2026-01-03T00:00:00.000Z' },
      { id: 'cl-2', word: 'volcano', level: 3, current_elo: 1495, is_active: true, created_at: '2026-01-03T00:00:00.000Z' },
    ];
    mockGetWordsForMiniSetByElo.mockResolvedValue(wordBankWords);
    mockGetCustomListWordsForKid.mockResolvedValue(customListWords);

    const result = await selectMiniSetWords(1500, 'kid-1', []);

    expect(mockGetCustomListWordsForKid).toHaveBeenCalledWith('kid-1');
    expect(result.some(w => w.id === 'cl-1' || w.id === 'cl-2')).toBe(true);
  });

  it('uses all custom words when at least five custom words are available', async () => {
    const wordBankWords: Word[] = [
      { id: 'wb-1', word: 'canyon', level: 3, current_elo: 1490, is_active: true, created_at: '2026-01-04T00:00:00.000Z' },
      { id: 'wb-2', word: 'thunder', level: 3, current_elo: 1500, is_active: true, created_at: '2026-01-04T00:00:00.000Z' },
      { id: 'wb-3', word: 'captain', level: 3, current_elo: 1510, is_active: true, created_at: '2026-01-04T00:00:00.000Z' },
      { id: 'wb-4', word: 'winter', level: 3, current_elo: 1520, is_active: true, created_at: '2026-01-04T00:00:00.000Z' },
      { id: 'wb-5', word: 'forest', level: 3, current_elo: 1505, is_active: true, created_at: '2026-01-04T00:00:00.000Z' },
    ];
    const customListWords: Word[] = [
      { id: 'cl-1', word: 'dinosaur', level: 3, current_elo: 1500, is_active: true, created_at: '2026-01-05T00:00:00.000Z' },
      { id: 'cl-2', word: 'astronaut', level: 3, current_elo: 1490, is_active: true, created_at: '2026-01-05T00:00:00.000Z' },
      { id: 'cl-3', word: 'telescope', level: 3, current_elo: 1510, is_active: true, created_at: '2026-01-05T00:00:00.000Z' },
      { id: 'cl-4', word: 'penguin', level: 3, current_elo: 1520, is_active: true, created_at: '2026-01-05T00:00:00.000Z' },
      { id: 'cl-5', word: 'avalanche', level: 3, current_elo: 1485, is_active: true, created_at: '2026-01-05T00:00:00.000Z' },
    ];
    mockGetWordsForMiniSetByElo.mockResolvedValue(wordBankWords);
    mockGetCustomListWordsForKid.mockResolvedValue(customListWords);

    const result = await selectMiniSetWords(1500, 'kid-1', []);
    const customCount = result.filter(w => w.id.startsWith('cl-')).length;
    const wordBankCount = result.filter(w => w.id.startsWith('wb-')).length;

    expect(customCount).toBe(5);
    expect(wordBankCount).toBe(0);
    expect(result).toHaveLength(5);
  });

  it('falls back to word bank when custom list has fewer than 5 words', async () => {
    const wordBankWords: Word[] = [
      { id: 'wb-1', word: 'bridge', level: 3, current_elo: 1490, is_active: true, created_at: '2026-01-06T00:00:00.000Z' },
      { id: 'wb-2', word: 'desert', level: 3, current_elo: 1500, is_active: true, created_at: '2026-01-06T00:00:00.000Z' },
      { id: 'wb-3', word: 'comet', level: 3, current_elo: 1510, is_active: true, created_at: '2026-01-06T00:00:00.000Z' },
      { id: 'wb-4', word: 'island', level: 3, current_elo: 1520, is_active: true, created_at: '2026-01-06T00:00:00.000Z' },
      { id: 'wb-5', word: 'rescue', level: 3, current_elo: 1505, is_active: true, created_at: '2026-01-06T00:00:00.000Z' },
    ];
    const customListWords: Word[] = [
      { id: 'cl-1', word: 'tractor', level: 3, current_elo: 1500, is_active: true, created_at: '2026-01-06T00:00:00.000Z' },
      { id: 'cl-2', word: 'barnyard', level: 3, current_elo: 1495, is_active: true, created_at: '2026-01-06T00:00:00.000Z' },
    ];
    mockGetWordsForMiniSetByElo.mockResolvedValue(wordBankWords);
    mockGetCustomListWordsForKid.mockResolvedValue(customListWords);

    const result = await selectMiniSetWords(1500, 'kid-1', []);
    const customCount = result.filter(w => w.id.startsWith('cl-')).length;
    const wordBankCount = result.filter(w => w.id.startsWith('wb-')).length;

    expect(customCount).toBe(2);
    expect(wordBankCount).toBe(3);
    expect(result).toHaveLength(5);
  });

  it('handles custom list words that lack metadata gracefully', async () => {
    const wordBankWords: Word[] = [
      { id: 'wb-1', word: 'anchor', level: 3, current_elo: 1500, is_active: true, created_at: '2026-01-07T00:00:00.000Z' },
      { id: 'wb-2', word: 'farmer', level: 3, current_elo: 1510, is_active: true, created_at: '2026-01-07T00:00:00.000Z' },
      { id: 'wb-3', word: 'mountain', level: 3, current_elo: 1490, is_active: true, created_at: '2026-01-07T00:00:00.000Z' },
      { id: 'wb-4', word: 'kitten', level: 3, current_elo: 1520, is_active: true, created_at: '2026-01-07T00:00:00.000Z' },
      { id: 'wb-5', word: 'picnic', level: 3, current_elo: 1485, is_active: true, created_at: '2026-01-07T00:00:00.000Z' },
    ];
    const customListWords: Word[] = [
      { id: 'cl-1', word: 'zookeeper', level: 3, current_elo: 1500, is_active: true, created_at: '2026-01-07T00:00:00.000Z' },
      { id: 'cl-2', word: 'lighthouse', level: 3, current_elo: 1510, is_active: true, created_at: '2026-01-07T00:00:00.000Z' },
    ];
    mockGetWordsForMiniSetByElo.mockResolvedValue(wordBankWords);
    mockGetCustomListWordsForKid.mockResolvedValue(customListWords);

    const result = await selectMiniSetWords(1500, 'kid-1', []);

    expect(result.some(w => w.id === 'cl-1')).toBe(true);
    expect(result.some(w => w.id === 'cl-2')).toBe(true);
  });

  it('returns five custom words when more than five are available', async () => {
    const wordBankWords: Word[] = [
      { id: 'wb-1', word: 'anchor', level: 3, current_elo: 1500, is_active: true, created_at: '2026-01-07T00:00:00.000Z' },
      { id: 'wb-2', word: 'farmer', level: 3, current_elo: 1510, is_active: true, created_at: '2026-01-07T00:00:00.000Z' },
      { id: 'wb-3', word: 'mountain', level: 3, current_elo: 1490, is_active: true, created_at: '2026-01-07T00:00:00.000Z' },
      { id: 'wb-4', word: 'kitten', level: 3, current_elo: 1520, is_active: true, created_at: '2026-01-07T00:00:00.000Z' },
      { id: 'wb-5', word: 'picnic', level: 3, current_elo: 1485, is_active: true, created_at: '2026-01-07T00:00:00.000Z' },
    ];
    const customListWords: Word[] = [
      { id: 'cl-1', word: 'zookeeper', level: 3, current_elo: 1500, is_active: true, created_at: '2026-01-07T00:00:00.000Z' },
      { id: 'cl-2', word: 'lighthouse', level: 3, current_elo: 1510, is_active: true, created_at: '2026-01-07T00:00:00.000Z' },
      { id: 'cl-3', word: 'hexagon', level: 3, current_elo: 1510, is_active: true, created_at: '2026-01-07T00:00:00.000Z' },
      { id: 'cl-4', word: 'harpoon', level: 3, current_elo: 1510, is_active: true, created_at: '2026-01-07T00:00:00.000Z' },
      { id: 'cl-5', word: 'dolphin', level: 3, current_elo: 1510, is_active: true, created_at: '2026-01-07T00:00:00.000Z' },
      { id: 'cl-6', word: 'igloo', level: 3, current_elo: 1510, is_active: true, created_at: '2026-01-07T00:00:00.000Z' },
    ];
    mockGetWordsForMiniSetByElo.mockResolvedValue(wordBankWords);
    mockGetCustomListWordsForKid.mockResolvedValue(customListWords);

    const result = await selectMiniSetWords(1500, 'kid-1', []);

    expect(result).toHaveLength(5);
    expect(result.every(w => w.id.startsWith('cl-'))).toBe(true);
  });

  it('prioritizes custom list words that were previously missed', async () => {
    const wordBankWords: Word[] = [
      { id: 'wb-1', word: 'puzzle', level: 3, current_elo: 1500, is_active: true, created_at: '2026-01-08T00:00:00.000Z' },
      { id: 'wb-2', word: 'rocket', level: 3, current_elo: 1510, is_active: true, created_at: '2026-01-08T00:00:00.000Z' },
      { id: 'wb-3', word: 'blanket', level: 3, current_elo: 1490, is_active: true, created_at: '2026-01-08T00:00:00.000Z' },
      { id: 'wb-4', word: 'thistle', level: 3, current_elo: 1520, is_active: true, created_at: '2026-01-08T00:00:00.000Z' },
      { id: 'wb-5', word: 'cactus', level: 3, current_elo: 1485, is_active: true, created_at: '2026-01-08T00:00:00.000Z' },
    ];
    const customListWords: Word[] = [
      { id: 'cl-missed-1', word: 'yacht', level: 3, current_elo: 1500, is_active: true, created_at: '2026-01-08T00:00:00.000Z', notes: 'recently_missed' },
      { id: 'cl-2', word: 'seashell', level: 3, current_elo: 1510, is_active: true, created_at: '2026-01-08T00:00:00.000Z' },
    ];
    mockGetWordsForMiniSetByElo.mockResolvedValue(wordBankWords);
    mockGetCustomListWordsForKid.mockResolvedValue(customListWords);

    const result = await selectMiniSetWords(1500, 'kid-1', []);

    expect(result.some(w => w.id === 'cl-missed-1')).toBe(true);
  });
});
