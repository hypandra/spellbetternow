const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateLetterTray(targetWord: string, traySize = 10): string[] {
  const letters = targetWord
    .toLowerCase()
    .split('')
    .filter(letter => /[a-z]/.test(letter));
  const tray = [...letters];

  while (tray.length < traySize) {
    tray.push(ALPHABET[Math.floor(Math.random() * ALPHABET.length)]);
  }

  return shuffle(tray);
}
