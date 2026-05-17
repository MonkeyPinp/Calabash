#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const githubRepository = requiredEnv('GITHUB_REPOSITORY');
const cnbRepository = process.env.CNB_REPO || githubRepository;
const releaseTag = requiredEnv('RELEASE_TAG');
const githubToken = process.env.GITHUB_TOKEN || '';
const [cnbCli, ...cnbBaseArgs] = (process.env.CNB_CLI || 'cnb').split(/\s+/).filter(Boolean);
const minAssetCount = Number.parseInt(process.env.MIN_GITHUB_ASSET_COUNT || '1', 10);
const deleteOldCnbReleases = process.env.CNB_DELETE_OLD_RELEASES === 'true';
const cnbAssetTtl = process.env.CNB_ASSET_TTL || '0';
const cnbReleaseWaitSeconds = Number.parseInt(process.env.CNB_RELEASE_WAIT_SECONDS || '300', 10);

const githubRelease = await getGithubRelease(githubRepository, releaseTag, githubToken);
const githubAssets = githubRelease.assets.filter((asset) => asset.state === 'uploaded');

if (githubAssets.length < minAssetCount) {
  throw new Error(
    `GitHub Release ${releaseTag} has ${githubAssets.length} uploaded assets; expected at least ${minAssetCount}.`,
  );
}

const cnbRelease = await waitForCnbRelease(cnbRepository, releaseTag, cnbReleaseWaitSeconds);
await patchCnbRelease(cnbRepository, cnbRelease.id, githubRelease);
await deleteStaleAssets(cnbRepository, cnbRelease, githubAssets);

for (const asset of githubAssets) {
  await mirrorAsset(cnbRepository, cnbRelease.id, asset, githubToken);
}

if (deleteOldCnbReleases) {
  await deleteOldReleases(cnbRepository, releaseTag);
}

const verifiedRelease = cnb(['releases', 'get-release-by-tag', '--repo', cnbRepository, '--tag', releaseTag]);
const verifiedAssetNames = new Set((verifiedRelease.assets || []).map((asset) => asset.name));
const missingAssets = githubAssets
  .map((asset) => asset.name)
  .filter((name) => !verifiedAssetNames.has(name));

if (missingAssets.length > 0) {
  throw new Error(`CNB Release ${releaseTag} is missing mirrored assets: ${missingAssets.join(', ')}`);
}

console.log(
  `Mirrored ${githubAssets.length} GitHub Release assets to CNB ${cnbRepository}@${releaseTag}.`,
);

async function getGithubRelease(repository, tag, token) {
  const response = await fetch(`https://api.github.com/repos/${repository}/releases/tags/${tag}`, {
    headers: {
      accept: 'application/vnd.github+json',
      'user-agent': 'calabash-release-mirror',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub release lookup failed with ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function waitForCnbRelease(repository, tag, timeoutSeconds) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  let lastError;

  do {
    try {
      return cnb(['releases', 'get-release-by-tag', '--repo', repository, '--tag', tag], { allowHttp404: true });
    } catch (error) {
      lastError = error;
      if (!String(error.message).includes('status 404')) throw error;
      await sleep(10_000);
    }
  } while (Date.now() < deadline);

  throw new Error(`CNB Release ${tag} did not appear within ${timeoutSeconds}s. Last error: ${lastError.message}`);
}

async function patchCnbRelease(repository, releaseId, githubRelease) {
  const args = [
    'releases',
    'patch-release',
    '--repo',
    repository,
    '--release-id',
    releaseId,
    '--name',
    githubRelease.name || githubRelease.tag_name,
    '--body',
    githubRelease.body || '',
    '--make-latest',
    'true',
  ];

  if (githubRelease.prerelease) args.push('--prerelease');

  cnb(args);
}

async function deleteStaleAssets(repository, cnbRelease, githubAssets) {
  const expectedNames = new Set(githubAssets.map((asset) => asset.name));

  for (const asset of cnbRelease.assets || []) {
    if (expectedNames.has(asset.name)) continue;
    console.log(`Deleting stale CNB asset ${asset.name}.`);
    cnb([
      'releases',
      'delete-release-asset',
      '--repo',
      repository,
      '--release-id',
      cnbRelease.id,
      '--asset-id',
      asset.id,
    ]);
  }
}

async function mirrorAsset(repository, releaseId, githubAsset, token) {
  console.log(`Mirroring ${githubAsset.name} (${githubAsset.size} bytes).`);

  const content = await downloadGithubAsset(githubAsset, token);
  const upload = cnb([
    'releases',
    'post-release-asset-upload-url',
    '--repo',
    repository,
    '--release-id',
    releaseId,
    '--asset-name',
    githubAsset.name,
    '--size',
    String(content.byteLength),
    '--ttl',
    cnbAssetTtl,
    '--overwrite',
  ]);

  const uploadResponse = await fetch(upload.upload_url, {
    method: 'PUT',
    headers: {
      'content-type': githubAsset.content_type || 'application/octet-stream',
    },
    body: content,
  });

  if (!uploadResponse.ok) {
    throw new Error(`CNB upload failed for ${githubAsset.name} with ${uploadResponse.status}: ${await uploadResponse.text()}`);
  }

  const { uploadToken, assetPath } = parseCnbVerifyUrl(upload.verify_url);
  cnb([
    'releases',
    'post-release-asset-upload-confirmation',
    '--repo',
    repository,
    '--release-id',
    releaseId,
    '--upload-token',
    uploadToken,
    '--asset-path',
    assetPath,
    '--ttl',
    cnbAssetTtl,
  ]);
}

async function downloadGithubAsset(asset, token) {
  const response = await fetch(asset.browser_download_url, {
    headers: {
      'user-agent': 'calabash-release-mirror',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub asset download failed for ${asset.name} with ${response.status}: ${await response.text()}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function deleteOldReleases(repository, keepTag) {
  const releaseList = cnb(['releases', 'list-releases', '--repo', repository, '--page-size', '100']);
  const releases = releaseList.data || releaseList || [];

  for (const release of releases) {
    if (release.tag_name === keepTag) continue;
    console.log(`Deleting old CNB release ${release.tag_name}.`);
    cnb(['releases', 'delete-release', '--repo', repository, '--release-id', release.id]);
  }
}

function parseCnbVerifyUrl(verifyUrl) {
  const url = new URL(verifyUrl);
  const match = url.pathname.match(/\/asset-upload-confirmation\/([^/]+)\/(.+)$/);

  if (!match) {
    throw new Error(`Could not parse CNB verify URL: ${verifyUrl}`);
  }

  return {
    uploadToken: decodeURIComponent(match[1]),
    assetPath: decodeURIComponent(match[2]),
  };
}

function cnb(args, options = {}) {
  const result = spawnSync(cnbCli, [...cnbBaseArgs, ...args, '--verbose'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    throw new Error(`cnb ${args.join(' ')} failed:\n${result.stdout || ''}\n${result.stderr || result.error?.message || ''}`);
  }

  const output = result.stdout.trim();
  const parsed = JSON.parse(output);

  if (parsed.status >= 400 && !(options.allowHttp404 && parsed.status === 404)) {
    throw new Error(`cnb ${args.join(' ')} returned status ${parsed.status}: ${output}`);
  }

  if (parsed.status === 404) {
    throw new Error(`cnb ${args.join(' ')} returned status 404: ${output}`);
  }

  return parsed.data;
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
