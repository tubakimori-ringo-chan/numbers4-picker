const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const games = [
  { size: 3, url: 'https://www.mk-mode.com/rails/loto/numbers3' },
  { size: 4, url: 'https://www.mk-mode.com/rails/loto/numbers4' },
];

function decodeCell(html) {
  return html
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#(?:x([\da-f]+)|(\d+));/gi, (_, hex, dec) =>
      String.fromCodePoint(parseInt(hex || dec, hex ? 16 : 10)),
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function sourceRows(html, size) {
  const rows = new Map();
  for (const [, content] of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...content.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)]
      .map(([, cell]) => decodeCell(cell));
    if (cells.length < 3) continue;
    const round = cells[0].replace(/^No\.?\s*/i, '');
    if (/^\d+$/.test(round) && /^\d{4}\/\d{2}\/\d{2}$/.test(cells[1]) && new RegExp('^\\d{' + size + '}$').test(cells[2])) {
      if (!rows.has(round)) rows.set(round, { round, date: cells[1], number: cells[2] });
    }
  }
  return [...rows.values()].sort((a, b) => Number(b.round) - Number(a.round));
}

async function updateGame({ size, url }) {
  const dataPath = path.join(root, 'data', 'numbers' + size + '.json');
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 NumberStudio/2.0' },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error('N' + size + ': source returned HTTP ' + response.status);

  const rows = sourceRows(await response.text(), size);
  if (rows.length === 0) throw new Error('N' + size + ': could not find valid winning rows');
  const records = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  if (!Array.isArray(records) || records.length === 0) throw new Error('N' + size + ': history file is empty');
  const previous = records.at(-1);
  const previousRound = Number(previous.round);
  const latest = rows[0];
  const latestRound = Number(latest.round);

  if (latestRound < previousRound) {
    throw new Error('N' + size + ': source is behind saved round ' + previous.round + '; refusing to change history');
  }
  if (latestRound === previousRound) {
    if (latest.date !== previous.date || latest.number !== previous.number) {
      throw new Error('N' + size + ': source disagrees with saved round ' + latest.round + '; refusing to overwrite');
    }
    console.log('N' + size + ': round ' + latest.round + ' is already current');
    return false;
  }

  const additions = rows
    .filter((row) => Number(row.round) > previousRound)
    .sort((a, b) => Number(a.round) - Number(b.round));
  let expectedRound = previousRound + 1;
  for (const row of additions) {
    if (Number(row.round) !== expectedRound) {
      throw new Error('N' + size + ': expected round ' + expectedRound + ', got ' + row.round + '; refusing to append');
    }
    expectedRound += 1;
  }
  if (Number(additions.at(-1)?.round) !== latestRound) {
    throw new Error('N' + size + ': source history is incomplete through round ' + latest.round + '; refusing to append');
  }

  records.push(...additions);
  fs.writeFileSync(dataPath, JSON.stringify(records, null, 2) + '\n', 'utf8');
  console.log('N' + size + ': appended ' + additions.length + ' round(s), through round ' + latest.round);
  return true;
}

(async () => {
  let changed = false;
  for (const game of games) changed = (await updateGame(game)) || changed;
  if (changed) process.exitCode = 0;
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
