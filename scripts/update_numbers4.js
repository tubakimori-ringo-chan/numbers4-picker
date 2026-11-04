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

function latestRow(html, size) {
  for (const [, content] of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...content.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)]
      .map(([, cell]) => decodeCell(cell));
    if (cells.length < 3) continue;
    const round = cells[0].replace(/^No\.?\s*/i, '');
    if (/^\d+$/.test(round) && /^\d{4}\/\d{2}\/\d{2}$/.test(cells[1]) && new RegExp(`^\\d{${size}}$`).test(cells[2])) {
      return { round, date: cells[1], number: cells[2] };
    }
  }
  throw new Error(`Could not find a valid ${size}-digit winning row`);
}

async function updateGame({ size, url }) {
  const dataPath = path.join(root, 'data', `numbers${size}.json`);
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 NumberStudio/2.0' },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`N${size}: source returned HTTP ${response.status}`);

  const latest = latestRow(await response.text(), size);
  const records = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  if (!Array.isArray(records) || records.length === 0) throw new Error(`N${size}: history file is empty`);
  const previous = records.at(-1);
  const currentRound = Number(latest.round);
  const previousRound = Number(previous.round);

  if (currentRound === previousRound) {
    if (latest.date !== previous.date || latest.number !== previous.number) {
      throw new Error(`N${size}: source disagrees with saved round ${latest.round}; refusing to overwrite`);
    }
    console.log(`N${size}: round ${latest.round} is already current`);
    return false;
  }
  if (currentRound !== previousRound + 1) {
    throw new Error(`N${size}: expected round ${previousRound + 1}, got ${latest.round}; refusing to append`);
  }

  records.push(latest);
  fs.writeFileSync(dataPath, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
  console.log(`N${size}: appended round ${latest.round} (${latest.date}, ${latest.number})`);
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
