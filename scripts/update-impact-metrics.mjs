import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OWNER = 'Guesswhat-Studio';
const REPO = 'Calabash';
const API_BASE = 'https://api.github.com';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(repoRoot, 'docs', 'assets', 'impact-metrics.json');
const svgOutputPath = path.join(repoRoot, 'docs', 'assets', 'impact-snapshot.svg');

function tokenFromGhCli() {
  try {
    return execFileSync('gh', ['auth', 'token'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

const token = process.env.CALABASH_METRICS_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN || tokenFromGhCli();

function readPreviousMetrics() {
  try {
    return JSON.parse(readFileSync(outputPath, 'utf8'));
  } catch {
    return null;
  }
}

async function githubJson(endpoint, { optional = false } = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    if (optional) {
      return {
        unavailable: true,
        status: response.status,
        message: await response.text(),
      };
    }
    throw new Error(`GitHub API ${endpoint} failed with ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

function numberFromEnv(name) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${name} must be numeric when provided.`);
  return value;
}

function optionalStringFromEnv(name) {
  const raw = process.env[name];
  return raw && raw.trim() ? raw.trim() : null;
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function summarizeReleaseDownloads(releases) {
  const assets = releases.flatMap((release) =>
    (release.assets ?? []).map((asset) => ({
      release: release.tag_name,
      name: asset.name,
      downloadCount: asset.download_count ?? 0,
    })),
  );
  const latestRelease = releases.find((release) => !release.draft);
  const latestAssets = assets.filter((asset) => asset.release === latestRelease?.tag_name);

  return {
    totalDownloads: sum(assets.map((asset) => asset.downloadCount)),
    desktopDownloads: sum(assets.filter((asset) => asset.name.startsWith('Calabash_')).map((asset) => asset.downloadCount)),
    webDownloads: sum(assets.filter((asset) => asset.name.startsWith('calabash-web')).map((asset) => asset.downloadCount)),
    latestRelease: latestRelease
      ? {
          tag: latestRelease.tag_name,
          downloads: sum(latestAssets.map((asset) => asset.downloadCount)),
        }
      : null,
    assets,
  };
}

function readPackageVersion() {
  const packageJson = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  return packageJson.version;
}

function formatNumber(value) {
  if (value == null) return '...';
  return new Intl.NumberFormat('en-US').format(value);
}

function formatDate(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function metricCell({ x, label, value, sub, accent }) {
  return `
    <g transform="translate(${x}, 64)">
      <text class="metric-value" x="0" y="0" fill="${accent}">${escapeXml(value)}</text>
      <text class="metric-label" x="0" y="22">${escapeXml(label)}</text>
      <text class="metric-sub" x="0" y="40">${escapeXml(sub)}</text>
    </g>`;
}

function renderBars(values, { x, y, width, height, color, opacity = 1 }) {
  const safeValues = values.length > 0 ? values : [0];
  const max = Math.max(...safeValues, 1);
  const gap = 2;
  const barWidth = Math.max(2, (width - gap * (safeValues.length - 1)) / safeValues.length);
  return safeValues.map((value, index) => {
    const barHeight = value === 0 ? 2 : Math.max(3, Math.round((value / max) * height));
    const barX = x + index * (barWidth + gap);
    const barY = y + height - barHeight;
    return `<rect x="${barX.toFixed(1)}" y="${barY}" width="${barWidth.toFixed(1)}" height="${barHeight}" rx="1.5" fill="${color}" opacity="${opacity}" />`;
  }).join('\n      ');
}

function dailyCounts(series) {
  return Array.isArray(series?.daily) ? series.daily.map((entry) => entry.count ?? 0) : [];
}

function trafficSnapshot(response, previousMetrics, key, dailyKey) {
  if (!response.unavailable) {
    return {
      count: response.count,
      uniques: response.uniques,
      daily: response[dailyKey],
    };
  }

  const previous = previousMetrics?.repository?.[key];
  if (previous && !previous.unavailable && typeof previous.count === 'number') {
    return {
      ...previous,
      stale: true,
      staleReason: {
        status: response.status,
        message: response.message,
      },
    };
  }

  return response;
}

function renderImpactSvg(metrics) {
  const summary = metrics.summary;
  const generatedAt = formatDate(metrics.generatedAt);
  const latest = metrics.releases.latestRelease?.tag ?? 'latest';
  const viewsDaily = dailyCounts(metrics.repository.views14d);

  const cells = [
    {
      x: 28,
      label: 'release downloads',
      value: formatNumber(summary.releaseDownloads),
      sub: `${formatNumber(summary.latestReleaseDownloads)} on ${latest}`,
      accent: '#8f2f1f',
    },
    {
      x: 152,
      label: 'desktop downloads',
      value: formatNumber(summary.desktopDownloads),
      sub: 'desktop builds',
      accent: '#9f6b14',
    },
    {
      x: 276,
      label: 'repo views',
      value: formatNumber(summary.githubRepoViews14d),
      sub: `${formatNumber(summary.githubRepoVisitors14d)} visitors`,
      accent: '#1f5f7a',
    },
    {
      x: 400,
      label: 'repo visitors',
      value: formatNumber(summary.githubRepoVisitors14d),
      sub: 'last 14 days',
      accent: '#6a4f1b',
    },
  ];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="132" viewBox="0 0 760 132" role="img" aria-labelledby="title desc">
  <title id="title">Calabash impact snapshot</title>
  <desc id="desc">Release downloads ${formatNumber(summary.releaseDownloads)}, desktop downloads ${formatNumber(summary.desktopDownloads)}, repository views ${formatNumber(summary.githubRepoViews14d)}, and repository visitors ${formatNumber(summary.githubRepoVisitors14d)}.</desc>
  <defs>
    <filter id="soft-shadow" x="-4%" y="-12%" width="108%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#2b1c10" flood-opacity="0.14"/>
    </filter>
    <linearGradient id="paper" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#fbf3d8"/>
      <stop offset="1" stop-color="#efe2bb"/>
    </linearGradient>
    <pattern id="dot-grid" width="14" height="14" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1" fill="#b08b43" opacity="0.22"/>
    </pattern>
    <style>
      .eyebrow { font: 700 10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: .16em; }
      .metric-value { font: 700 30px Georgia, "Times New Roman", serif; }
      .metric-label { font: 700 10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: .08em; fill: #39291b; }
      .metric-sub { font: italic 10px Georgia, "Times New Roman", serif; fill: #715f43; }
      .chart-title { font: 700 11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: .08em; fill: #39291b; }
      .chart-note { font: italic 10px Georgia, "Times New Roman", serif; fill: #715f43; }
    </style>
  </defs>
  <rect x="1" y="1" width="758" height="130" rx="10" fill="url(#paper)" stroke="#c9ad73" filter="url(#soft-shadow)"/>
  <rect x="1" y="1" width="758" height="130" rx="10" fill="url(#dot-grid)" opacity="0.42"/>
  <path d="M1 29H759" stroke="#8f2f1f" stroke-width="5"/>
  <text class="eyebrow" x="28" y="22" fill="#74603d">PUBLIC IMPACT · v${escapeXml(metrics.appVersion)} · ${generatedAt}</text>
  ${cells.map(metricCell).join('')}
  <g transform="translate(522, 38)">
    <text class="chart-title" x="0" y="0">REPO VIEWS · 14 DAYS</text>
    <line x1="0" y1="66" x2="176" y2="66" stroke="#c9ad73" stroke-width="1"/>
    <g>
      ${renderBars(viewsDaily, { x: 0, y: 20, width: 176, height: 46, color: '#1f5f7a', opacity: 0.84 })}
    </g>
  </g>
</svg>
`;
}

const [repo, releases, views, clones, referrers, paths] = await Promise.all([
  githubJson(`/repos/${OWNER}/${REPO}`),
  githubJson(`/repos/${OWNER}/${REPO}/releases?per_page=100`),
  githubJson(`/repos/${OWNER}/${REPO}/traffic/views`, { optional: true }),
  githubJson(`/repos/${OWNER}/${REPO}/traffic/clones`, { optional: true }),
  githubJson(`/repos/${OWNER}/${REPO}/traffic/popular/referrers`, { optional: true }),
  githubJson(`/repos/${OWNER}/${REPO}/traffic/popular/paths`, { optional: true }),
]);

const previousMetrics = readPreviousMetrics();
const views14d = trafficSnapshot(views, previousMetrics, 'views14d', 'views');
const clones14d = trafficSnapshot(clones, previousMetrics, 'clones14d', 'clones');
const referrers14d = Array.isArray(referrers) ? referrers : (previousMetrics?.repository?.referrers14d ?? []);
const popularPaths14d = Array.isArray(paths) ? paths : (previousMetrics?.repository?.popularPaths14d ?? []);
const downloads = summarizeReleaseDownloads(releases);
const githubPagesVisits = numberFromEnv('CALABASH_GITHUB_PAGES_VISITS_30D');
const edgeOneRequests = numberFromEnv('CALABASH_EDGEONE_REQUESTS_30D');
const edgeOneUniqueIps = numberFromEnv('CALABASH_EDGEONE_UNIQUE_IPS_30D');

const metrics = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  appVersion: readPackageVersion(),
  source: {
    repository: `${OWNER}/${REPO}`,
    githubTrafficWindow: 'last_14_days_utc',
    privacy: 'Public aggregate metrics only. Calabash does not collect app telemetry.',
  },
  summary: {
    githubPagesVisits30d: githubPagesVisits,
    edgeOneRequests30d: edgeOneRequests,
    edgeOneUniqueIps30d: edgeOneUniqueIps,
    releaseDownloads: downloads.totalDownloads,
    desktopDownloads: downloads.desktopDownloads,
    latestReleaseDownloads: downloads.latestRelease?.downloads ?? null,
    githubRepoViews14d: views14d.unavailable ? null : views14d.count,
    githubRepoVisitors14d: views14d.unavailable ? null : views14d.uniques,
    githubClones14d: clones14d.unavailable ? null : clones14d.count,
    githubUniqueCloners14d: clones14d.unavailable ? null : clones14d.uniques,
  },
  web: {
    githubPages: {
      visits30d: githubPagesVisits,
      source: optionalStringFromEnv('CALABASH_GITHUB_PAGES_SOURCE') ?? 'pending EdgeOne or privacy-friendly analytics source',
    },
    edgeOne: {
      url: 'https://calabash.edgeone.cool/',
      requests30d: edgeOneRequests,
      uniqueIps30d: edgeOneUniqueIps,
      source: optionalStringFromEnv('CALABASH_EDGEONE_SOURCE') ?? 'pending EdgeOne API or exported console snapshot',
    },
  },
  repository: {
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    openIssues: repo.open_issues_count,
    views14d,
    clones14d,
    referrers14d,
    popularPaths14d,
  },
  releases: downloads,
};

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(metrics, null, 2)}\n`);
writeFileSync(svgOutputPath, renderImpactSvg(metrics));
console.log(`Wrote ${path.relative(repoRoot, outputPath)} and ${path.relative(repoRoot, svgOutputPath)} for ${metrics.appVersion}`);
