import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SettingsPanel from '@/components/Settings/SettingsPanel';
import { useUiStore } from '@/stores/uiStore';
import { useUserStore } from '@/stores/userStore';

describe('SettingsPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useUserStore.setState({
      users: [{ id: 'reader-1', name: 'Reader', avatarColor: '#8a3320', createdAt: 0, updatedAt: 0 }],
      activeUserId: 'reader-1',
      hydrated: true,
    });
    useUiStore.setState({
      theme: 'light',
      themePreference: 'light',
      language: 'system',
      resolvedLanguage: 'en',
      characterNodeViewMode: 'text',
    });
  });

  it('opens on the look tab so language is immediately editable', () => {
    render(
      <SettingsPanel
        onClose={() => {}}
        onExportLibrary={() => {}}
        onImportLibrary={() => {}}
        onOpenOnboarding={() => {}}
        onCreateTutorial={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: /Look/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Reading conditions')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('system');
  });

  it('keeps About focused on release links without the built-on row', () => {
    render(
      <SettingsPanel
        onClose={() => {}}
        onExportLibrary={() => {}}
        onImportLibrary={() => {}}
        onOpenOnboarding={() => {}}
        onCreateTutorial={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /About/i }));
    expect(screen.getByText('0.3.1')).toBeInTheDocument();
    expect(screen.queryByText('Built on')).not.toBeInTheDocument();
  });

  it('checks GitHub releases and opens the matching update asset', async () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{
        tag_name: 'v0.3.2',
        html_url: 'https://github.com/Guesswhat-Studio/Calabash/releases/tag/v0.3.2',
        draft: false,
        assets: [
          { name: 'Calabash_0.3.2_windows_x64.exe', browser_download_url: 'https://example.com/calabash.exe' },
        ],
      }],
    }));
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <SettingsPanel
        onClose={() => {}}
        onExportLibrary={() => {}}
        onImportLibrary={() => {}}
        onOpenOnboarding={() => {}}
        onCreateTutorial={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /About/i }));
    fireEvent.click(screen.getByRole('button', { name: /Check for updates/i }));
    await waitFor(() => expect(screen.getByText('Download 0.3.2')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Download 0.3.2'));
    expect(open).toHaveBeenCalledWith('https://example.com/calabash.exe', '_blank', 'noopener,noreferrer');
  });

  it('shows an up-to-date state when no newer release exists', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{
        tag_name: 'v0.2.0',
        html_url: 'https://github.com/Guesswhat-Studio/Calabash/releases/tag/v0.2.0',
        draft: false,
        assets: [],
      }],
    }));

    render(
      <SettingsPanel
        onClose={() => {}}
        onExportLibrary={() => {}}
        onImportLibrary={() => {}}
        onOpenOnboarding={() => {}}
        onCreateTutorial={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /About/i }));
    fireEvent.click(screen.getByRole('button', { name: /Check for updates/i }));
    await waitFor(() => expect(screen.getByText('This build is up to date.')).toBeInTheDocument());
  });
});
