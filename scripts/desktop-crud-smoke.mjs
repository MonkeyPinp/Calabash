import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { remote } from 'webdriverio';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
const isLinux = process.platform === 'linux';

if (!isWindows && !isLinux) {
  throw new Error('Tauri WebDriver desktop smoke is supported on Windows/Linux only.');
}

const appExecutable = process.env.CALABASH_DESKTOP_APP ??
  path.join(repoRoot, 'src-tauri', 'target', 'debug', isWindows ? 'calabash.exe' : 'calabash');
const tauriDriver = process.env.TAURI_DRIVER ?? findCommand(
  isWindows ? 'tauri-driver.exe' : 'tauri-driver',
  path.join(os.homedir(), '.cargo', 'bin', isWindows ? 'tauri-driver.exe' : 'tauri-driver'),
);
const nativeDriver = process.env.MSEDGEDRIVER ?? findCommand(
  isWindows ? 'msedgedriver.exe' : 'msedgedriver',
  path.join(repoRoot, '.agents', 'tools', isWindows ? 'msedgedriver.exe' : 'msedgedriver'),
);

if (!existsSync(appExecutable)) {
  throw new Error(`Missing desktop app: ${appExecutable}\nRun npm run desktop:build:debug first.`);
}
if (!tauriDriver) {
  throw new Error('Missing tauri-driver. Install it with: cargo install tauri-driver --locked');
}
if (isWindows && !nativeDriver) {
  throw new Error(
    'Missing msedgedriver.exe. Run msedgedriver-tool, then place msedgedriver.exe in .agents/tools or set MSEDGEDRIVER.',
  );
}

const port = Number(process.env.TAURI_DRIVER_PORT ?? 4488 + Math.floor(Math.random() * 400));
const profileRoot = mkdtempSync(path.join(os.tmpdir(), 'calabash-tauri-crud-'));
const smokeDbFileName = `calabash-smoke-${process.pid}-${Date.now()}.db`;
const smokeDbPath = `sqlite:${smokeDbFileName}`;
const screenshotPath = path.join(profileRoot, 'desktop-crud-smoke.png');
const appData = path.join(profileRoot, 'AppData', 'Roaming');
const localAppData = path.join(profileRoot, 'AppData', 'Local');
const webviewData = path.join(profileRoot, 'WebView2');
const xdgConfigHome = path.join(profileRoot, 'xdg-config');
const xdgDataHome = path.join(profileRoot, 'xdg-data');
const xdgCacheHome = path.join(profileRoot, 'xdg-cache');
for (const dir of [appData, localAppData, webviewData, xdgConfigHome, xdgDataHome, xdgCacheHome]) {
  mkdirSync(dir, { recursive: true });
}

const smokeName = `CRUD Smoke ${Date.now()}`;
const updatedSmokeName = `${smokeName} Updated`;

let driverProcess;
let browser;
let keepProfile = process.env.CALABASH_KEEP_SMOKE_PROFILE === '1';

try {
  driverProcess = startTauriDriver();
  await waitForDriver();

  browser = await startSession();
  await waitForState((state) => /Calabash/i.test(state.body) && !/加载中|Loading/i.test(state.body), 'app hydration');
  await closeOnboardingIfPresent();

  await clickButton(/创建空白书本|Create blank book|Crear libro en blanco|Criar livro em branco|空白本/i, 'create blank book');
  await waitForState(
    (state) => /我的第一份案件卷宗|My First Case File|Mi primer expediente|Meu primeiro caso|最初の事件ファイル/i.test(state.body),
    'blank book creation',
  );

  await clickButton(/添加节点|Add node|Añadir nodo|Adicionar nó|ノードを追加/i, 'add node');
  await fillNewNodeDialog(smokeName);
  await waitForState((state) => state.characterNodes.some((text) => text.includes(smokeName)), 'node creation');

  await clickCharacterNode(smokeName);
  await renameSelectedCharacter(smokeName, updatedSmokeName);
  await waitForState((state) => state.characterNodes.some((text) => text.includes(updatedSmokeName)), 'node update');

  await clickCharacterNode(updatedSmokeName);
  await clickButton(/删除节点|Delete node|Eliminar nodo|Excluir nó|ノードを削除/i, 'delete node');
  await waitForState((state) => !state.characterNodes.some((text) => text.includes(updatedSmokeName)), 'node deletion');

  const afterDelete = await getState();
  if (!/我的第一份案件卷宗|My First Case File|Mi primer expediente|Meu primeiro caso|最初の事件ファイル/i.test(afterDelete.body)) {
    throw new Error('Book disappeared after deleting the smoke node.');
  }

  await browser.saveScreenshot(screenshotPath);
  await restartSession();
  const persisted = await waitForState(
    (state) =>
      /我的第一份案件卷宗|My First Case File|Mi primer expediente|Meu primeiro caso|最初の事件ファイル/i.test(state.body) &&
      !state.body.includes(updatedSmokeName),
    'persistence after restart',
  );

  const sqliteFiles = findSmokeDatabaseFiles();
  if (sqliteFiles.length === 0) {
    throw new Error(`No smoke SQLite database found for ${smokeDbFileName}`);
  }

  const logs = await getBrowserLogs();
  if (logs.length > 0) {
    throw new Error(`Browser console errors:\n${logs.join('\n')}`);
  }

  console.log(JSON.stringify({
    ok: true,
    checks: [
      'tauri-driver ready',
      'desktop app launched in isolated profile',
      'book created',
      'node created',
      'node updated',
      'node deleted',
      'state persisted after app restart',
      'SQLite database file created',
      'no browser console errors reported by WebDriver',
    ],
    appExecutable,
    tauriDriver,
    nativeDriver: nativeDriver ?? '(PATH default)',
    smokeDbPath,
    smokeName,
    updatedSmokeName,
    persistedEvidence: persisted.body.slice(0, 700),
    sqliteFiles,
    screenshotPath,
    profileRoot,
  }, null, 2));
} catch (error) {
  keepProfile = true;
  console.error(`Desktop CRUD smoke failed. Isolated profile kept at: ${profileRoot}`);
  throw error;
} finally {
  if (browser) {
    try { await browser.deleteSession(); } catch {}
  }
  if (driverProcess) driverProcess.kill();
  await sleep(300);
  if (!keepProfile) cleanupSmokeDatabases();
  if (!keepProfile) rmSync(profileRoot, { recursive: true, force: true });
}

function findCommand(command, preferredPath) {
  if (preferredPath && existsSync(preferredPath)) return preferredPath;
  const lookup = spawnSync(isWindows ? 'where' : 'which', [command], { encoding: 'utf8' });
  if (lookup.status === 0) {
    return lookup.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? command;
  }
  return null;
}

function startTauriDriver() {
  const args = ['--port', String(port)];
  if (nativeDriver) args.push('--native-driver', nativeDriver);
  const child = spawn(tauriDriver, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    env: {
      ...process.env,
      APPDATA: appData,
      LOCALAPPDATA: localAppData,
      WEBVIEW2_USER_DATA_FOLDER: webviewData,
      CALABASH_SQLITE_DB_PATH: smokeDbPath,
      XDG_CONFIG_HOME: xdgConfigHome,
      XDG_DATA_HOME: xdgDataHome,
      XDG_CACHE_HOME: xdgCacheHome,
    },
  });
  let log = '';
  child.stdout.on('data', (data) => { log += data.toString(); });
  child.stderr.on('data', (data) => { log += data.toString(); });
  child.on('exit', (code) => {
    if (code !== null && code !== 0) console.error(`tauri-driver exited ${code}\n${log}`);
  });
  child.log = () => log;
  return child;
}

async function waitForDriver() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/status`);
      if (response.ok) return;
    } catch {}
    await sleep(250);
  }
  throw new Error(`tauri-driver did not become ready.\n${driverProcess?.log?.() ?? ''}`);
}

async function startSession() {
  return remote({
    hostname: '127.0.0.1',
    port,
    path: '/',
    logLevel: 'error',
    capabilities: {
      'tauri:options': { application: appExecutable },
    },
  });
}

async function restartSession() {
  await browser.deleteSession();
  browser = await startSession();
}

async function getState() {
  return browser.execute(() => ({
    title: document.title,
    url: location.href,
    readyState: document.readyState,
    body: document.body?.innerText ?? '',
    dialogs: Array.from(document.querySelectorAll('[role="dialog"]')).map((dialog) => ({
      aria: dialog.getAttribute('aria-label') || '',
      text: dialog.textContent || '',
    })),
    characterNodes: Array.from(document.querySelectorAll('[data-testid="character-node"]'))
      .map((node) => node.textContent || ''),
    buttons: Array.from(document.querySelectorAll('button'))
      .map((button) => `${button.textContent || ''} ${button.getAttribute('aria-label') || ''} ${button.title || ''}`.trim())
      .filter(Boolean),
  }));
}

async function waitForState(predicate, label, timeout = 15000) {
  const deadline = Date.now() + timeout;
  let lastState;
  while (Date.now() < deadline) {
    lastState = await getState();
    if (predicate(lastState)) return lastState;
    await sleep(300);
  }
  throw new Error(`Timed out waiting for ${label}.\n${JSON.stringify({
    ...lastState,
    body: lastState?.body?.slice(0, 2000),
    buttons: lastState?.buttons?.slice(0, 80),
  }, null, 2)}`);
}

async function closeOnboardingIfPresent() {
  await browser.execute(() => {
    const dialog = Array.from(document.querySelectorAll('[role="dialog"]')).find((candidate) =>
      /欢迎使用 Calabash|Welcome to Calabash|Calabash へようこそ|Bienvenido a Calabash|Bem-vindo ao Calabash/i
        .test(`${candidate.getAttribute('aria-label') || ''} ${candidate.textContent || ''}`),
    );
    if (!dialog) return;
    const button = Array.from(dialog.querySelectorAll('button')).find((candidate) =>
      /完成|Done|完了|Listo|Concluir/i.test(`${candidate.textContent || ''} ${candidate.getAttribute('aria-label') || ''}`),
    );
    button?.click();
  });
  await waitForState(
    (state) => !state.dialogs.some((dialog) => /欢迎使用 Calabash|Welcome to Calabash|Calabash へようこそ/i.test(`${dialog.aria} ${dialog.text}`)),
    'onboarding closed',
  );
}

async function clickButton(pattern, label) {
  const result = await browser.execute((source, flags) => {
    const pattern = new RegExp(source, flags);
    const button = Array.from(document.querySelectorAll('button')).find((candidate) =>
      pattern.test(`${candidate.textContent || ''} ${candidate.getAttribute('aria-label') || ''} ${candidate.title || ''}`),
    );
    if (!button) {
      return {
        ok: false,
        buttons: Array.from(document.querySelectorAll('button'))
          .map((candidate) => `${candidate.textContent || ''} ${candidate.getAttribute('aria-label') || ''} ${candidate.title || ''}`.trim())
          .filter(Boolean)
          .slice(0, 80),
      };
    }
    button.click();
    return { ok: true };
  }, pattern.source, pattern.flags);

  if (!result.ok) {
    throw new Error(`Could not click ${label}. Buttons: ${result.buttons.join(' | ')}`);
  }
}

async function fillNewNodeDialog(name) {
  const result = await browser.execute((name) => {
    function setValue(input, value) {
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set;
      setter?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const dialog = Array.from(document.querySelectorAll('[role="dialog"]')).at(-1);
    if (!dialog) return { ok: false, reason: 'missing add node dialog' };
    const input = Array.from(dialog.querySelectorAll('input')).find((candidate) =>
      candidate.type === 'text' || candidate.type === '',
    );
    if (!input) return { ok: false, reason: 'missing name input' };
    setValue(input, name);
    const createButton = Array.from(dialog.querySelectorAll('button')).find((candidate) =>
      /创建节点|Create node|Crear nodo|Criar nó|ノードを作成/i.test(candidate.textContent || ''),
    );
    if (!createButton) return { ok: false, reason: 'missing create button' };
    createButton.click();
    return { ok: true };
  }, name);

  if (!result.ok) throw new Error(`Could not fill add-node dialog: ${result.reason}`);
}

async function clickCharacterNode(name) {
  const result = await browser.execute((name) => {
    const node = Array.from(document.querySelectorAll('[data-testid="character-node"]')).find((candidate) =>
      (candidate.textContent || '').includes(name),
    );
    if (!node) return { ok: false, nodeTexts: Array.from(document.querySelectorAll('[data-testid="character-node"]')).map((candidate) => candidate.textContent || '') };
    node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    return { ok: true };
  }, name);

  if (!result.ok) {
    throw new Error(`Could not click character node ${name}. Nodes: ${result.nodeTexts.join(' | ')}`);
  }
}

async function renameSelectedCharacter(from, to) {
  const inputs = await browser.$$('input');
  for (const input of inputs) {
    if (await input.getValue() === from) {
      await input.click();
      await input.setValue(to);
      await browser.keys('Tab');
      await sleep(400);
      return;
    }
  }

  const values = [];
  for (const input of inputs) values.push(await input.getValue());
  throw new Error(`Could not rename selected character. Inputs: ${values.join(' | ')}`);
}

async function getBrowserLogs() {
  try {
    const entries = await browser.getLogs('browser');
    return entries
      .filter((entry) => /SEVERE|ERROR/i.test(entry.level ?? '') || /error/i.test(entry.message ?? ''))
      .map((entry) => `${entry.level}: ${entry.message}`);
  } catch {
    return [];
  }
}

function findFiles(root, predicate) {
  const matches = [];
  function walk(dir) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const file = path.join(dir, entry);
      const stats = statSync(file);
      if (stats.isDirectory()) walk(file);
      else if (predicate(file)) matches.push(file);
    }
  }
  walk(root);
  return matches;
}

function findSmokeDatabaseFiles() {
  const roots = [
    profileRoot,
    process.env.APPDATA && path.join(process.env.APPDATA, 'studio.guesswhat.calabash'),
    process.env.APPDATA && path.join(process.env.APPDATA, 'Calabash'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'studio.guesswhat.calabash'),
    process.env.XDG_CONFIG_HOME && path.join(process.env.XDG_CONFIG_HOME, 'studio.guesswhat.calabash'),
    path.join(os.homedir(), '.config', 'studio.guesswhat.calabash'),
  ].filter(Boolean);
  const names = new Set([smokeDbFileName, `${smokeDbFileName}-wal`, `${smokeDbFileName}-shm`]);
  return [...new Set(roots.flatMap((root) => findFiles(root, (file) => names.has(path.basename(file)))))];
}

function cleanupSmokeDatabases() {
  for (const file of findSmokeDatabaseFiles()) {
    rmSync(file, { force: true });
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
