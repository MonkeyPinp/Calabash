import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = resolve(__dirname, '../public/demo-portraits/kindaichi');

const portraits = [
  {
    slug: 'hajime-kindaichi',
    url: 'https://kindaichiwiki.org/images/thumb/f/f2/Hajime_Kindaichi_Mini.png/300px-Hajime_Kindaichi_Mini.png',
  },
  {
    slug: 'miyuki-nanase',
    url: 'https://kindaichiwiki.org/images/thumb/2/23/Miyuki_Nanase_Mini.png/300px-Miyuki_Nanase_Mini.png',
  },
  {
    slug: 'isamu-kenmochi',
    url: 'https://kindaichiwiki.org/images/thumb/4/41/Isamu_Kenmochi_Mini.png/300px-Isamu_Kenmochi_Mini.png',
  },
  {
    slug: 'saruhiko-senda',
    url: 'https://kindaichiwiki.org/images/f/f6/Saruhiko_Senda_Mini.png',
  },
  {
    slug: 'rintaro-fuyuki',
    url: 'https://kindaichiwiki.org/images/8/88/Rintaro_Fuyuki_Mini.png',
  },
  {
    slug: 'seimaru-tatsumi',
    url: 'https://kindaichiwiki.org/images/6/64/Seimaru_Tatsumi_Mini.png',
  },
  {
    slug: 'shino-tatsumi',
    url: 'https://kindaichiwiki.org/images/7/70/Shino_Tatsumi_Mini.png',
  },
  {
    slug: 'hayato-tatsumi',
    url: 'https://kindaichiwiki.org/images/9/97/Hayato_Tatsumi_Mini.png',
  },
  {
    slug: 'ryunosuke-tatsumi',
    url: 'https://kindaichiwiki.org/images/1/19/Ryunosuke_Tatsumi_Mini.png',
  },
  {
    slug: 'moegi-tatsumi',
    url: 'https://kindaichiwiki.org/images/7/74/Moegi_Tatsumi_Mini.png',
  },
  {
    slug: 'headless-samurai',
    url: 'https://kindaichiwiki.org/images/thumb/1/1e/Hida_Mysterious_Figure.png/300px-Hida_Mysterious_Figure.png',
  },
];

await mkdir(outputDir, { recursive: true });

console.warn([
  'Downloading Kindaichi wiki portrait thumbnails for local demo use only.',
  'These files are intentionally written under app/public/demo-portraits/, which is gitignored.',
  'Do not commit or redistribute them unless you have the required rights.',
].join('\n'));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  for (const portrait of portraits) {
    const response = await page.goto(portrait.url, { waitUntil: 'networkidle' });
    if (!response?.ok()) {
      throw new Error(`Failed ${portrait.slug}: HTTP ${response?.status() ?? 'unknown'}`);
    }
    const body = await response.body();
    const outputPath = resolve(outputDir, `${portrait.slug}.png`);
    await writeFile(outputPath, body);
    console.log(`saved ${outputPath}`);
  }
} finally {
  await browser.close();
}
