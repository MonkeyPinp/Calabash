import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function readText(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

const versions = [
  ['package.json', readJson('package.json').version],
  ['app/package.json', readJson('app/package.json').version],
  ['src-tauri/tauri.conf.json', readJson('src-tauri/tauri.conf.json').version],
  [
    'src-tauri/Cargo.toml',
    readText('src-tauri/Cargo.toml').match(/^version\s*=\s*"([^"]+)"/m)?.[1],
  ],
  [
    'app/src/version.ts',
    readText('app/src/version.ts').match(/APP_VERSION\s*=\s*'([^']+)'/)?.[1],
  ],
];

const missing = versions.filter(([, version]) => !version);
if (missing.length > 0) {
  throw new Error(`Could not read versions from: ${missing.map(([file]) => file).join(', ')}`);
}

const uniqueVersions = new Set(versions.map(([, version]) => version));
if (uniqueVersions.size !== 1) {
  const detail = versions.map(([file, version]) => `${file}: ${version}`).join('\n');
  throw new Error(`Version mismatch:\n${detail}`);
}

console.log(`Version check passed: ${versions[0][1]}`);
