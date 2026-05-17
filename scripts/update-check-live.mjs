import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = path.join(repoRoot, 'app');
const viteEntry = path.join(appRoot, 'node_modules', 'vite', 'dist', 'node', 'index.js');

if (!existsSync(viteEntry)) {
  throw new Error('Vite is not installed under app/node_modules. Run npm install before the live update check.');
}

const { createServer } = await import(pathToFileURL(viteEntry).href);

const server = await createServer({
  root: appRoot,
  configFile: path.join(appRoot, 'vite.config.ts'),
  logLevel: 'error',
  optimizeDeps: { disabled: true },
  server: { middlewareMode: true },
});

try {
  const { CALABASH_RELEASES_API, checkForCalabashUpdate } = await server.ssrLoadModule('/src/lib/updateCheck.ts');
  const platform = { os: 'windows', arch: 'x64' };
  const currentResult = await checkForCalabashUpdate({ platform });
  const oldVersionResult = await checkForCalabashUpdate({ currentVersion: '0.0.0', platform });

  if (!['current', 'available'].includes(currentResult.status)) {
    throw new Error(`Unexpected current update status: ${currentResult.status}`);
  }

  if (oldVersionResult.status !== 'available') {
    throw new Error('Expected an old desktop build to find an available GitHub release.');
  }

  if (!oldVersionResult.releaseUrl?.startsWith('https://github.com/Guesswhat-Studio/Calabash/releases/')) {
    throw new Error(`Unexpected release URL: ${oldVersionResult.releaseUrl ?? '<empty>'}`);
  }

  if (!oldVersionResult.assetUrl?.startsWith('https://github.com/Guesswhat-Studio/Calabash/releases/download/')) {
    throw new Error(`Expected a matching Windows release asset, got: ${oldVersionResult.assetUrl ?? '<empty>'}`);
  }

  console.log(JSON.stringify({
    ok: true,
    endpoint: CALABASH_RELEASES_API,
    current: {
      status: currentResult.status,
      currentVersion: currentResult.currentVersion,
      latestVersion: currentResult.latestVersion,
      releaseUrl: currentResult.releaseUrl,
    },
    oldVersion: {
      status: oldVersionResult.status,
      currentVersion: oldVersionResult.currentVersion,
      latestVersion: oldVersionResult.latestVersion,
      assetName: oldVersionResult.assetName,
      assetUrl: oldVersionResult.assetUrl,
      releaseUrl: oldVersionResult.releaseUrl,
    },
  }, null, 2));
} finally {
  await server.close();
}
