import { APP_VERSION } from '@/version';

export const CALABASH_RELEASES_API =
  'https://api.github.com/repos/Guesswhat-Studio/Calabash/releases?per_page=20';

export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

export interface GithubRelease {
  tag_name: string;
  name?: string;
  html_url: string;
  draft?: boolean;
  prerelease?: boolean;
  body?: string;
  published_at?: string;
  assets?: ReleaseAsset[];
}

export type DesktopOs = 'windows' | 'macos' | 'linux' | 'unknown';
export type DesktopArch = 'x64' | 'arm64' | 'unknown';

export interface PlatformInfo {
  os: DesktopOs;
  arch: DesktopArch;
}

export type UpdateCheckResult =
  | {
      status: 'current';
      currentVersion: string;
      latestVersion?: string;
      releaseUrl?: string;
    }
  | {
      status: 'available';
      currentVersion: string;
      latestVersion: string;
      releaseUrl: string;
      assetUrl?: string;
      assetName?: string;
      notes?: string;
    };

export function parseVersion(version: string): number[] {
  const clean = version.trim().replace(/^v/i, '').split(/[+-]/)[0];
  return clean.split('.').map((part) => {
    const parsed = Number.parseInt(part, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  });
}

export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  const length = Math.max(left.length, right.length, 3);
  for (let i = 0; i < length; i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

export function detectPlatform(userAgent = navigator.userAgent): PlatformInfo {
  const ua = userAgent.toLowerCase();
  const platform = (navigator.platform ?? '').toLowerCase();
  const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  const uaPlatform = uaData?.platform?.toLowerCase() ?? '';
  const combined = `${ua} ${platform} ${uaPlatform}`;

  let os: DesktopOs = 'unknown';
  if (combined.includes('win')) os = 'windows';
  else if (combined.includes('mac')) os = 'macos';
  else if (combined.includes('linux') || combined.includes('x11')) os = 'linux';

  let arch: DesktopArch = 'unknown';
  if (combined.includes('arm64') || combined.includes('aarch64')) arch = 'arm64';
  else if (combined.includes('x86_64') || combined.includes('x64') || combined.includes('wow64') || combined.includes('win64')) {
    arch = 'x64';
  } else if (os === 'windows' || os === 'linux') {
    arch = 'x64';
  }

  return { os, arch };
}

export function pickReleaseAsset(release: GithubRelease, platform: PlatformInfo): ReleaseAsset | undefined {
  const assets = release.assets ?? [];
  const names = assetNameCandidates(platform);
  if (!names.length) return undefined;
  return assets.find((asset) => names.some((candidate) => asset.name.includes(candidate)));
}

export async function checkForCalabashUpdate(options: {
  currentVersion?: string;
  fetchImpl?: typeof fetch;
  platform?: PlatformInfo;
} = {}): Promise<UpdateCheckResult> {
  const currentVersion = options.currentVersion ?? APP_VERSION;
  const fetchImpl = options.fetchImpl ?? fetch;
  const platform = options.platform ?? detectPlatform();
  const response = await fetchImpl(CALABASH_RELEASES_API, {
    headers: { Accept: 'application/vnd.github+json' },
  });

  if (!response.ok) {
    throw new Error(`Release check failed with ${response.status}`);
  }

  const releases = (await response.json()) as GithubRelease[];
  const newer = releases
    .filter((release) => !release.draft)
    .filter((release) => compareVersions(release.tag_name, currentVersion) > 0)
    .sort((a, b) => compareVersions(b.tag_name, a.tag_name));

  const latest = newer[0];
  if (!latest) {
    const highestKnown = releases
      .filter((release) => !release.draft)
      .sort((a, b) => compareVersions(b.tag_name, a.tag_name))[0];
    return {
      status: 'current',
      currentVersion,
      latestVersion: highestKnown?.tag_name?.replace(/^v/i, ''),
      releaseUrl: highestKnown?.html_url,
    };
  }

  const asset = pickReleaseAsset(latest, platform);
  return {
    status: 'available',
    currentVersion,
    latestVersion: latest.tag_name.replace(/^v/i, ''),
    releaseUrl: latest.html_url,
    assetUrl: asset?.browser_download_url,
    assetName: asset?.name,
    notes: latest.body,
  };
}

function assetNameCandidates(platform: PlatformInfo): string[] {
  if (platform.os === 'windows') return ['windows_x64.exe', 'windows_x64'];
  if (platform.os === 'linux') return ['linux_x64'];
  if (platform.os === 'macos' && platform.arch === 'arm64') return ['darwin_aarch64', 'darwin_arm64'];
  return [];
}
