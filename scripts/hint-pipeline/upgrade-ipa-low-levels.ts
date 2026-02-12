/**
 * Cross-reference level 1-4 pronunciation data with ipa-dict (CMUdict).
 * Replaces Wiktionary/LLM IPA with authoritative CMUdict IPA where available.
 * Keeps phonetic respelling from LLM (ipa-dict doesn't have phonetic).
 *
 * Reads: data/pronunciation-low-levels-YYYY-MM-DD.json
 * Reads: data/ipa-dict-en_US.txt
 * Outputs: data/ipa-upgrade-low-levels-YYYY-MM-DD.sql
 *
 * Usage: bun scripts/hint-pipeline/upgrade-ipa-low-levels.ts
 */

const DATA_DIR = new URL('./data/', import.meta.url).pathname;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}

async function loadIpaDict(): Promise<Map<string, string>> {
  const path = `${DATA_DIR}ipa-dict-en_US.txt`;
  const content = await Bun.file(path).text();
  const dict = new Map<string, string>();

  for (const line of content.split('\n')) {
    if (!line.trim()) continue;
    const tab = line.indexOf('\t');
    if (tab === -1) continue;
    const word = line.slice(0, tab).toLowerCase();
    const ipa = line.slice(tab + 1).trim();
    dict.set(word, ipa);
  }

  console.log(`Loaded ${dict.size} entries from ipa-dict`);
  return dict;
}

async function main() {
  const date = today();
  const jsonPath = `${DATA_DIR}pronunciation-low-levels-${date}.json`;

  const jsonFile = Bun.file(jsonPath);
  if (!(await jsonFile.exists())) {
    console.error(`File not found: ${jsonPath}`);
    console.error(`Run run-pronunciation-low-levels.ts first.`);
    process.exit(1);
  }

  const data = await jsonFile.json();
  const ipaDict = await loadIpaDict();

  const upgrades: Array<{ word: string; oldIpa: string; newIpa: string }> = [];
  let noMatch = 0;

  for (const entry of data.words) {
    const dictIpa = ipaDict.get(entry.word.toLowerCase());
    if (dictIpa) {
      upgrades.push({
        word: entry.word,
        oldIpa: entry.ipa,
        newIpa: dictIpa,
      });
    } else {
      noMatch++;
    }
  }

  console.log(`\nipa-dict matches: ${upgrades.length}/${data.words.length}`);
  console.log(`No match (keep existing): ${noMatch}`);

  // Generate upgrade SQL
  const lines: string[] = [
    `-- Upgrade IPA from LLM/Wiktionary to ipa-dict (CMUdict-based, MIT licensed)`,
    `-- ${upgrades.length} words upgraded with authoritative General American IPA`,
    `-- Source: https://github.com/open-dict-data/ipa-dict (en_US)`,
    `-- ${noMatch} words remain with Wiktionary/LLM-generated IPA`,
    ``,
  ];

  for (const u of upgrades.sort((a, b) => a.word.localeCompare(b.word))) {
    lines.push(
      `UPDATE spelling_word_bank SET ipa = '${escapeSQL(u.newIpa)}' WHERE word = '${escapeSQL(u.word)}';`
    );
  }

  lines.push('');

  const sqlPath = `${DATA_DIR}ipa-upgrade-low-levels-${date}.sql`;
  await Bun.write(sqlPath, lines.join('\n'));
  console.log(`\nUpgrade SQL: ${sqlPath}`);

  // Show some examples
  console.log('\nSample upgrades:');
  for (const u of upgrades.slice(0, 10)) {
    console.log(`  ${u.word}: ${u.oldIpa} → ${u.newIpa}`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
