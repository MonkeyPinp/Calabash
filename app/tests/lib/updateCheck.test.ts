import { describe, expect, it, vi } from 'vitest';
import {
  checkForCalabashUpdate,
  compareVersions,
  detectPlatform,
  pickReleaseAsset,
  type GithubRelease,
} from '@/lib/updateCheck';

const release = {
  tag_name: 'v0.2.1',
  html_url: 'https://github.com/Guesswhat-Studio/Calabash/releases/tag/v0.2.1',
  draft: false,
  assets: [
    { name: 'Calabash_0.2.1_windows_x64.exe', browser_download_url: 'https://example.com/windows.exe' },
    { name: 'Calabash_0.2.1_linux_x64', browser_download_url: 'https://example.com/linux' },
    { name: 'Calabash_0.2.1_darwin_aarch64', browser_download_url: 'https://example.com/mac-arm' },
    { name: 'Calabash_0.2.1_darwin_x64', browser_download_url: 'https://example.com/mac-x64' },
  ],
} satisfies GithubRelease;

describe('updateCheck', () => {
  it('compares semantic versions with v-prefixes', () => {
    expect(compareVersions('v0.2.1', '0.2.0')).toBe(1);
    expect(compareVersions('0.2.0', '0.2.0')).toBe(0);
    expect(compareVersions('0.10.0', '0.2.9')).toBe(1);
    expect(compareVersions('0.2.0', '0.2.1')).toBe(-1);
  });

  it('detects common desktop platforms from user agents', () => {
    expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)').os).toBe('windows');
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0)').os).toBe('macos');
    expect(detectPlatform('Mozilla/5.0 (X11; Linux x86_64)').os).toBe('linux');
  });

  it('selects the platform-specific desktop asset', () => {
    expect(pickReleaseAsset(release, { os: 'windows', arch: 'x64' })?.browser_download_url).toBe('https://example.com/windows.exe');
    expect(pickReleaseAsset(release, { os: 'linux', arch: 'x64' })?.browser_download_url).toBe('https://example.com/linux');
    expect(pickReleaseAsset(release, { os: 'macos', arch: 'arm64' })?.browser_download_url).toBe('https://example.com/mac-arm');
    expect(pickReleaseAsset(release, { os: 'macos', arch: 'x64' })?.browser_download_url).toBe('https://example.com/mac-x64');
  });

  it('returns an available update when GitHub has a newer prerelease', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [release],
    });

    const result = await checkForCalabashUpdate({
      currentVersion: '0.2.0',
      platform: { os: 'windows', arch: 'x64' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result).toMatchObject({
      status: 'available',
      latestVersion: '0.2.1',
      assetUrl: 'https://example.com/windows.exe',
    });
  });

  it('returns current when no newer release exists', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [release],
    });

    await expect(checkForCalabashUpdate({
      currentVersion: '0.2.1',
      platform: { os: 'windows', arch: 'x64' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).resolves.toMatchObject({
      status: 'current',
      latestVersion: '0.2.1',
    });
  });
});
