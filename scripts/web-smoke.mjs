import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appRequire = createRequire(path.join(repoRoot, 'app', 'package.json'));
const { chromium } = appRequire('@playwright/test');

const distRoot = path.join(repoRoot, 'app', 'dist');
const externalUrl = process.env.CALABASH_WEB_SMOKE_URL;
const screenshots = process.env.CALABASH_SMOKE_SCREENSHOTS === '1';

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'],
  ['.woff2', 'font/woff2'],
]);

function startStaticServer() {
  if (!existsSync(path.join(distRoot, 'index.html'))) {
    throw new Error('app/dist/index.html is missing. Run npm --prefix app run build first.');
  }

  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const cleanPath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    let filePath = path.join(distRoot, cleanPath);

    if (!filePath.startsWith(distRoot) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
      filePath = path.join(distRoot, 'index.html');
    }

    response.setHeader('Content-Type', mimeTypes.get(path.extname(filePath)) ?? 'application/octet-stream');
    createReadStream(filePath).pipe(response);
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Could not resolve local smoke server address.'));
        return;
      }
      resolve({ server, url: `http://127.0.0.1:${address.port}/` });
    });
  });
}

async function smokeViewport(browser, url, scenario) {
  const { viewport, hasTouch = false, name = `${scenario.viewport.width}x${scenario.viewport.height}` } = scenario;
  const context = await browser.newContext({ viewport, hasTouch, isMobile: false });
  const page = await context.newPage();
  const messages = [];
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) messages.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => messages.push(`pageerror: ${error.message}`));

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('body', { state: 'visible' });
  const title = await page.title();
  const bodyText = await page.locator('body').innerText();

  if (!title.includes('Calabash')) throw new Error(`Unexpected page title: ${title}`);
  if (!/Calabash/i.test(bodyText)) throw new Error('Calabash shell did not render.');
  if (!/Library|书库|ライブラリ|Biblioteca/i.test(bodyText)) {
    throw new Error('Library/sidebar text did not render.');
  }

  const onboarding = page.getByRole('dialog', {
    name: /Welcome to Calabash|欢迎使用 Calabash|Calabash へようこそ|Bienvenido a Calabash|Bem-vindo ao Calabash/i,
  });
  if (await onboarding.count()) {
    await onboarding.getByRole('button', { name: /Done|完成|完了|Listo|Concluir/i }).click();
    await onboarding.waitFor({ state: 'hidden' });
  }

  if (viewport.width < 700) {
    const fallback = page.locator('[data-testid="phone-fallback"]');
    await fallback.waitFor({ state: 'visible' });
    const fallbackText = await fallback.innerText();
    if (!/tablet|平板|tableta|tablet|タブレット/i.test(fallbackText)) {
      throw new Error('Phone fallback does not explain the tablet/larger-screen requirement.');
    }
    if (!/Read-only|只读|solo lectura|somente leitura|読み取り専用/i.test(fallbackText)) {
      throw new Error('Phone fallback does not expose the read-only library state.');
    }
    if (await page.locator('.react-flow').count()) {
      throw new Error('Phone fallback should not render the full canvas.');
    }
    await context.close();
    return { name, viewport, hasTouch, title, mode: 'phone-fallback' };
  }

  if (viewport.width >= 980) {
    const openedTutorial = await page.evaluate(() => {
      const button = Array.from(document.querySelectorAll('button')).find((candidate) =>
        /Create Ackroyd tutorial|创建 Ackroyd 教程|Crear tutorial Ackroyd|Criar tutorial Ackroyd|Ackroyd チュートリアルを作成/i
          .test(`${candidate.textContent || ''} ${candidate.getAttribute('aria-label') || ''} ${candidate.title || ''}`),
      );
      button?.click();
      return Boolean(button);
    });
    if (!openedTutorial) throw new Error('Could not create a tutorial case for canvas Help smoke checks.');

    const helpLegend = page.locator('[data-testid="keyboard-shortcuts-legend"]');
    await helpLegend.waitFor({ state: 'visible', timeout: 15000 });
    const helpButtonText = await helpLegend.locator('button').first().innerText();
    if (!/Help|帮助|ヘルプ|Ayuda|Ajuda/i.test(helpButtonText)) {
      throw new Error(`Canvas help trigger is not labelled Help: ${helpButtonText}`);
    }
    await helpLegend.locator('[data-testid="canvas-help-trigger"]').click({ force: true });
    await page.waitForTimeout(120);
    const helpPanel = page.locator('[data-testid="canvas-help-panel"]');
    const helpPanelState = await helpPanel.evaluate((panel) => {
      const style = window.getComputedStyle(panel);
      const rect = panel.getBoundingClientRect();
      return {
        opacity: Number(style.opacity),
        text: panel.textContent || '',
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        bottom: Math.round(rect.bottom),
      };
    });
    if (helpPanelState.opacity < 0.9) {
      throw new Error(`Canvas help panel did not open on hover: ${JSON.stringify(helpPanelState)}`);
    }
    if (helpPanelState.width < 480 || helpPanelState.height > 420 || helpPanelState.bottom > viewport.height - 8) {
      throw new Error(`Canvas help panel is not in its compact landscape layout: ${JSON.stringify(helpPanelState)}`);
    }
    if (!/Layout|布局|レイアウト|Ordenar|Organizar/i.test(helpPanelState.text)) {
      throw new Error('Canvas help panel is missing the Layout explanation.');
    }
    if (!/Shield|防剧透|シールド|Escudo/i.test(helpPanelState.text)) {
      throw new Error('Canvas help panel is missing the Shield explanation.');
    }
    if (!/Lock\/unlock selection|锁定\/解锁选择|選択をロック\/解除|Bloquear\/desbloquear selección|Bloquear\/desbloquear seleção/i.test(helpPanelState.text)) {
      throw new Error('Canvas help panel is missing the L lock-selection shortcut.');
    }

    const inspectorLayout = await page.evaluate(() => {
      const guideList = document.querySelector('[data-testid="empty-inspector-guide-list"]');
      const clues = document.querySelector('[data-testid="open-clues-panel"]');
      if (!guideList || !clues) return null;
      const listRect = guideList.getBoundingClientRect();
      const cluesRect = clues.getBoundingClientRect();
      return {
        guideBottom: Math.round(listRect.bottom),
        cluesTop: Math.round(cluesRect.top),
        cluesText: clues.textContent || '',
      };
    });
    if (!inspectorLayout) throw new Error('Could not find the inspector guide and Open Clues panel.');
    if (inspectorLayout.cluesTop <= inspectorLayout.guideBottom) {
      throw new Error(`Open Clues is not below the inspector guide: ${JSON.stringify(inspectorLayout)}`);
    }
  }

  const openedCreateMenu = await page.evaluate(() => {
    const plus = Array.from(document.querySelectorAll('button')).find((button) =>
      /New book or category|新建书籍或分类|Nuevo libro o categoría|Novo livro ou categoria|本またはカテゴリを新規作成/i
        .test(`${button.textContent || ''} ${button.getAttribute('aria-label') || ''} ${button.title || ''}`),
    );
    plus?.click();
    return Boolean(plus);
  });
  if (!openedCreateMenu) throw new Error('Could not open the Library create menu.');

  const createMenu = page.locator('[data-testid="library-create-menu"]');
  await createMenu.waitFor({ state: 'visible' });
  const topLevelLabels = await createMenu.locator('button').evaluateAll((buttons) =>
    buttons.map((button) => `${button.textContent || ''} ${button.getAttribute('aria-label') || ''} ${button.title || ''}`.trim()).filter(Boolean),
  );
  const clickedBookChoice = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="library-create-menu"]');
    const button = Array.from(root?.querySelectorAll('button') ?? []).find((candidate) =>
      /^(Book|书籍|Libro|Livro|本)$/i.test((candidate.textContent || '').trim()),
    );
    button?.click();
    return Boolean(button);
  });
  if (!clickedBookChoice) throw new Error('Could not click the Book choice in the Library create menu.');
  const bookChoice = page.locator('[data-testid="book-create-choice"]');
  await bookChoice.waitFor({ state: 'visible' });
  const bookChoices = await bookChoice.locator('button').evaluateAll((buttons) =>
    buttons.map((button) => `${button.textContent || ''} ${button.getAttribute('aria-label') || ''} ${button.title || ''}`.trim()).filter(Boolean),
  );

  if (!topLevelLabels.some((label) => /Book|书籍|Libro|Livro|本/i.test(label))) {
    throw new Error('Create menu no longer exposes Book.');
  }
  if (!topLevelLabels.some((label) => /Category|分类|Categoría|Categoria|カテゴリ/i.test(label))) {
    throw new Error('Create menu no longer exposes Category.');
  }
  if (topLevelLabels.some((label) => /Ackroyd|Poirot|飞驒|飛騨|Hida|Kindaichi/i.test(label))) {
    throw new Error(`Create menu still exposes tutorial/demo actions: ${topLevelLabels.join(' | ')}`);
  }
  if (!bookChoices.some((label) => /Start from scratch|从空白开始|Empezar desde cero|Começar do zero|空白から始める/i.test(label))) {
    throw new Error('Book create flow is missing the start-from-scratch choice.');
  }
  if (!bookChoices.some((label) => /Import book JSON|导入单本 JSON|Importar JSON de libro|Importar JSON de livro|本の JSON をインポート/i.test(label))) {
    throw new Error('Book create flow is missing the single-book import choice.');
  }
  if (!bookChoices.some((label) => /Puzzle contest template|每谜\/比赛模板|Plantilla de concurso|Modelo de concurso|パズル用テンプレート/i.test(label))) {
    throw new Error('Book create flow is missing the puzzle/template choice.');
  }

  const clickedSettings = await page.evaluate(() => {
    const pattern = /Settings|设置|設定|Ajustes|Configurações/i;
    const buttons = Array.from(document.querySelectorAll('button'));
    const target = buttons.find((button) => {
      const label = `${button.textContent || ''} ${button.getAttribute('aria-label') || ''} ${button.title || ''}`;
      const rect = button.getBoundingClientRect();
      return pattern.test(label) && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
    });
    target?.click();
    return Boolean(target);
  });
  if (!clickedSettings) throw new Error('Could not find a visible Settings button.');
  await page.getByRole('dialog').filter({
    hasText: /Settings|设置|設定|Ajustes|Configurações/i,
  }).waitFor({ state: 'visible' });
  const settingsDialog = page.getByRole('dialog', {
    name: /Settings|设置|設定|Ajustes|Configurações/i,
  }).last();
  await settingsDialog.getByRole('button', { name: /^(About|关于|Acerca de|Sobre|情報)$/i }).click();
  const studioLogo = settingsDialog.locator('img[src="/guesswhat-studio-logo.png"]');
  await studioLogo.waitFor({ state: 'visible' });
  const studioLink = settingsDialog.locator('a[href="https://guesswhat.studio"]');
  if (await studioLink.count() !== 1) {
    throw new Error('About tab is missing the Guesswhat Studio link.');
  }
  await settingsDialog.getByRole('button', { name: /^(Guides|引导|Guías|Guias|ガイド)$/i }).click();
  await page.locator('[data-testid="settings-tutorial-grid"]').waitFor({ state: 'visible' });
  const tutorialRects = await page.locator('[data-testid="settings-tutorial-card"]').evaluateAll((cards) =>
    cards.map((card) => {
      const rect = card.getBoundingClientRect();
      return { top: Math.round(rect.top), left: Math.round(rect.left), width: Math.round(rect.width) };
    }),
  );
  if (tutorialRects.length !== 4) {
    throw new Error(`Expected 4 settings tutorial cards, got ${tutorialRects.length}.`);
  }
  const tutorialTopSpread = Math.max(...tutorialRects.map((rect) => rect.top)) - Math.min(...tutorialRects.map((rect) => rect.top));
  if (tutorialTopSpread > 3) {
    throw new Error(`Settings tutorial cards are not on one row: ${JSON.stringify(tutorialRects)}`);
  }

  if (screenshots) {
    const screenshotPath = path.join(
      process.env.TEMP ?? process.env.TMPDIR ?? repoRoot,
      `calabash-web-smoke-${name}-${viewport.width}x${viewport.height}.png`,
    );
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`Screenshot: ${screenshotPath}`);
  }

  await context.close();

  const relevantMessages = messages.filter((message) => !/favicon/i.test(message));
  if (relevantMessages.length > 0) {
    throw new Error(`Console warnings/errors in ${name} ${viewport.width}x${viewport.height}:\n${relevantMessages.join('\n')}`);
  }

  return { name, viewport, hasTouch, title };
}

let server;
let url = externalUrl;
try {
  if (!url) {
    const local = await startStaticServer();
    server = local.server;
    url = local.url;
  }

  const browser = await chromium.launch();
  try {
    const results = [];
    results.push(await smokeViewport(browser, url, { name: 'desktop', viewport: { width: 1440, height: 1000 } }));
    results.push(await smokeViewport(browser, url, { name: 'tablet-landscape-touch', viewport: { width: 1024, height: 768 }, hasTouch: true }));
    results.push(await smokeViewport(browser, url, { name: 'tablet-portrait-touch', viewport: { width: 834, height: 1112 }, hasTouch: true }));
    results.push(await smokeViewport(browser, url, { name: 'phone-fallback-touch', viewport: { width: 390, height: 844 }, hasTouch: true }));
    console.log(JSON.stringify({ ok: true, url, results }, null, 2));
  } finally {
    await browser.close();
  }
} finally {
  server?.close();
}
