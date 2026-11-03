const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/numbers4.json');
const TARGET_URL = 'https://www.mk-mode.com/rails/loto/numbers4';

async function updateNumbers4() {
  try {
    console.log('Fetching latest Numbers 4 data from MK-MODE...');
    const response = await fetch(TARGET_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NumberStudioBot/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();

    // 最新の「第XXXX回」「YYYY/MM/DD」「4桁の当せん番号」を正規表現で抽出
    // 例: 第7104回, 2026/10/30, 当せん番号 5805
    const roundMatch = html.match(/第?\s*(\d+)\s*回/);
    const dateMatch = html.match(/(\d{4}\/\d{2}\/\d{2})/);
    const numberMatch = html.match(/(?:当せん番号|当選番号)[^\d]*(\d{4})/);

    if (!roundMatch || !numberMatch) {
      console.log('当せん結果の要素が見つかりませんでした（まだ更新されていない可能性があります）。');
      return;
    }

    const latestRound = roundMatch[1];
    const latestDate = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0].replace(/-/g, '/');
    const latestNumber = numberMatch[1];

    console.log(`抽出結果 -> 第${latestRound}回 (${latestDate}): ${latestNumber}`);

    // ローカルJSONの読み込み
    let currentData = [];
    if (fs.existsSync(DATA_PATH)) {
      currentData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    }

    // 既に該当の回号が存在するかチェック
    const exists = currentData.some(item => String(item.round) === String(latestRound));
    if (exists) {
      console.log(`第${latestRound}回のデータは既に存在するため更新をスキップします。`);
      return;
    }

    // 新しいデータを追加
    currentData.push({
      round: String(latestRound),
      date: latestDate,
      number: String(latestNumber)
    });

    // 保存
    fs.writeFileSync(DATA_PATH, JSON.stringify(currentData, null, 2), 'utf-8');
    console.log(`第${latestRound}回のデータ（${latestNumber}）を正常に追加・保存しました！`);

  } catch (error) {
    console.error('更新エラー:', error);
    process.exit(1);
  }
}

updateNumbers4();