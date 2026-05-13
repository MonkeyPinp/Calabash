import { Github, Languages, Monitor, Moon, Sun, X } from 'lucide-react';
import { useUiStore, type LanguagePreference, type ThemePreference } from '@/stores/uiStore';

const APP_VERSION = '0.1.0';
const GITHUB_URL = 'https://github.com/Guesswhat-Studio/Calabash';

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.11em',
  textTransform: 'uppercase',
  color: 'var(--ink-500)',
  marginBottom: 8,
};

const iconButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 5,
  border: '1px solid transparent',
  background: 'transparent',
  color: 'var(--ink-600)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
};

function optionButtonStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 32,
    borderRadius: 5,
    border: active ? '1px solid var(--ink-700)' : '1px solid var(--ink-200)',
    background: active ? 'var(--bg-canvas)' : 'transparent',
    color: active ? 'var(--ink-900)' : 'var(--ink-600)',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: active ? 600 : 500,
  };
}

export interface SettingsPanelProps {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const themePreference = useUiStore((s) => s.themePreference);
  const language = useUiStore((s) => s.language);
  const setThemePreference = useUiStore((s) => s.setThemePreference);
  const setLanguage = useUiStore((s) => s.setLanguage);

  const themeOptions: Array<{ value: ThemePreference; label: string; icon: React.ReactNode }> = [
    { value: 'light', label: 'Light', icon: <Sun size={13} /> },
    { value: 'dark', label: 'Dark', icon: <Moon size={13} /> },
    { value: 'system', label: 'System', icon: <Monitor size={13} /> },
  ];

  const languageOptions: Array<{ value: LanguagePreference; label: string }> = [
    { value: 'system', label: 'System' },
    { value: 'en', label: 'English' },
    { value: 'zh-CN', label: '简体中文' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'color-mix(in srgb, var(--ink-900) 34%, transparent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 420,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 32px)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--ink-200)',
          borderRadius: 8,
          boxShadow: 'var(--shadow-modal)',
          color: 'var(--ink-900)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            height: 44,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 12px 0 16px',
            borderBottom: '1px solid var(--ink-150)',
          }}
        >
          <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 500 }}>Settings</div>
          <button type="button" onClick={onClose} title="Close settings" style={iconButtonStyle}>
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: 16, overflowY: 'auto' }}>
          <section style={{ paddingBottom: 16, borderBottom: '1px solid var(--ink-150)' }}>
            <label style={labelStyle}>Theme</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setThemePreference(option.value)}
                  style={optionButtonStyle(themePreference === option.value)}
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section style={{ padding: '16px 0', borderBottom: '1px solid var(--ink-150)' }}>
            <label style={labelStyle}>Language</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Languages size={15} color="var(--ink-500)" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguagePreference)}
                style={{
                  flex: 1,
                  height: 32,
                  border: '1px solid var(--ink-200)',
                  borderRadius: 5,
                  background: 'var(--bg-canvas)',
                  color: 'var(--ink-900)',
                  padding: '0 8px',
                  fontSize: 13,
                  outline: 'none',
                }}
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section style={{ paddingTop: 16 }}>
            <label style={labelStyle}>App Info</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--ink-800)' }}>Version</span>
              <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>{APP_VERSION}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                style={{
                  flex: 1,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  border: '1px solid var(--ink-200)',
                  borderRadius: 5,
                  color: 'var(--ink-800)',
                  textDecoration: 'none',
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                <Github size={13} />
                GitHub
              </a>
              <button
                type="button"
                disabled
                title="Available in desktop builds"
                style={{
                  flex: 1,
                  height: 32,
                  border: '1px solid var(--ink-200)',
                  borderRadius: 5,
                  background: 'transparent',
                  color: 'var(--ink-500)',
                  fontSize: 12,
                  fontWeight: 500,
                  opacity: 0.55,
                }}
              >
                Check for updates
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
