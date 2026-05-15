import { useEffect, useRef, useState } from 'react';
import {
  Download,
  Github,
  Languages,
  Monitor,
  Moon,
  PlayCircle,
  Sun,
  Upload,
  X,
} from 'lucide-react';
import { useUiStore, type LanguagePreference, type ThemePreference } from '@/stores/uiStore';
import { useUserStore } from '@/stores/userStore';
import { useT } from '@/i18n';
import CalabashLogo from '@/components/Brand/CalabashLogo';
import type { TutorialKind } from '@/lib/demoData';
import { APP_VERSION } from '@/version';
import { checkForCalabashUpdate, type UpdateCheckResult } from '@/lib/updateCheck';

const GITHUB_URL = 'https://github.com/Guesswhat-Studio/Calabash';
const STUDIO_URL = 'https://guesswhat.studio';

export interface SettingsPanelProps {
  onClose: () => void;
  onExportLibrary: () => void;
  onImportLibrary: (file: File) => void;
  onOpenOnboarding: () => void;
  onCreateTutorial: (kind: TutorialKind) => void;
}

export default function SettingsPanel({
  onClose,
  onExportLibrary,
  onImportLibrary,
  onOpenOnboarding,
  onCreateTutorial,
}: SettingsPanelProps) {
  const t = useT();
  const themePreference = useUiStore((s) => s.themePreference);
  const language = useUiStore((s) => s.language);
  const setThemePreference = useUiStore((s) => s.setThemePreference);
  const setLanguage = useUiStore((s) => s.setLanguage);
  const users = useUserStore((s) => s.users);
  const activeUserId = useUserStore((s) => s.activeUserId);
  const renameProfile = useUserStore((s) => s.renameProfile);

  const [renameValue, setRenameValue] = useState('');
  const [updateState, setUpdateState] = useState<
    | { status: 'idle' }
    | { status: 'checking' }
    | { status: 'current'; result: UpdateCheckResult }
    | { status: 'available'; result: Extract<UpdateCheckResult, { status: 'available' }> }
    | { status: 'error' }
  >({ status: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUser = users.find((user) => user.id === activeUserId) ?? null;

  useEffect(() => {
    setRenameValue(activeUser?.name ?? '');
  }, [activeUser?.name]);

  const themeOptions: Array<{ value: ThemePreference; label: string; icon: React.ReactNode }> = [
    { value: 'light', label: t('settings.themeLight'), icon: <Sun size={13} /> },
    { value: 'dark', label: t('settings.themeDark'), icon: <Moon size={13} /> },
    { value: 'system', label: t('settings.themeSystem'), icon: <Monitor size={13} /> },
  ];

  const languageOptions: Array<{ value: LanguagePreference; label: string }> = [
    { value: 'system', label: t('settings.langSystem') },
    { value: 'en', label: t('settings.langEn') },
    { value: 'zh-CN', label: t('settings.langZh') },
    { value: 'ja', label: t('settings.langJa') },
    { value: 'es', label: t('settings.langEs') },
    { value: 'pt-BR', label: t('settings.langPtBr') },
  ];

  async function handleRenameProfile() {
    if (!activeUser || !renameValue.trim() || renameValue.trim() === activeUser.name) return;
    await renameProfile(activeUser.id, renameValue);
  }

  async function handleUpdateAction() {
    if (updateState.status === 'available') {
      const url = updateState.result.assetUrl ?? updateState.result.releaseUrl;
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    setUpdateState({ status: 'checking' });
    try {
      const result = await checkForCalabashUpdate();
      setUpdateState(result.status === 'available' ? { status: 'available', result } : { status: 'current', result });
    } catch {
      setUpdateState({ status: 'error' });
    }
  }

  const updateButtonLabel = (() => {
    if (updateState.status === 'checking') return t('settings.checkingUpdates');
    if (updateState.status === 'available') return t('settings.downloadUpdate', { version: updateState.result.latestVersion });
    if (updateState.status === 'current') return t('settings.updates');
    return t('settings.checkForUpdates');
  })();

  const updateMessage = (() => {
    if (updateState.status === 'available') {
      return t('settings.updateAvailable', { version: updateState.result.latestVersion });
    }
    if (updateState.status === 'current') return t('settings.updateCurrent');
    if (updateState.status === 'error') return t('settings.updateError');
    return t('settings.updatesHint');
  })();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('settings.title')}
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
          width: 480,
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
        <div style={{ height: 48, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px 0 16px', borderBottom: '1px solid var(--ink-150)' }}>
          <div style={{ color: 'var(--accent)' }}>
            <CalabashLogo size={24} />
          </div>
          <div style={{ flex: 1, fontFamily: 'var(--font-case-title)', fontSize: 20, fontWeight: 500 }}>{t('settings.title')}</div>
          <button type="button" onClick={onClose} title={t('settings.close')} aria-label={t('settings.close')} style={iconButtonStyle}>
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: 16, overflowY: 'auto', maxHeight: 'calc(100vh - 82px)' }}>
          <section style={sectionStyle}>
            <label style={labelStyle}>{t('settings.profiles')}</label>
            <p style={{ margin: '0 0 10px', color: 'var(--ink-500)', fontSize: 12, lineHeight: 1.5 }}>
              {t('settings.localLibraryHint')}
            </p>
            {activeUser && (
              <div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-500)', margin: '2px 0 5px' }}>
                  {t('settings.renameProfile')}
                </div>
                <div style={{ display: 'flex' }}>
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => void handleRenameProfile()}
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleRenameProfile(); }}
                    aria-label={t('settings.renameProfile')}
                    style={inputStyle}
                  />
                </div>
              </div>
            )}
          </section>

          <section style={sectionStyle}>
            <label style={labelStyle}>{t('settings.data')}</label>
            <p style={betaNoteStyle}>
              {t('settings.betaStorageNote')}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={onExportLibrary} style={actionButtonStyle(false)}>
                <Download size={13} />
                {t('settings.exportLibrary')}
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()} style={actionButtonStyle(false)}>
                <Upload size={13} />
                {t('settings.importLibrary')}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImportLibrary(file);
                  e.target.value = '';
                }}
              />
            </div>
          </section>

          <section style={sectionStyle}>
            <label style={labelStyle}>{t('settings.onboarding')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
              <button type="button" onClick={onOpenOnboarding} style={actionButtonStyle(false)}>
                <PlayCircle size={13} />
                {t('settings.openGuide')}
              </button>
              <button type="button" onClick={() => onCreateTutorial('ackroyd')} style={actionButtonStyle(false)}>
                <PlayCircle size={13} />
                {t('onboarding.createAckroydTutorial')}
              </button>
              <button type="button" onClick={() => onCreateTutorial('hida')} style={actionButtonStyle(false)}>
                <PlayCircle size={13} />
                {t('onboarding.createHidaTutorial')}
              </button>
            </div>
          </section>

          <section style={sectionStyle}>
            <label style={labelStyle}>{t('settings.theme')}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {themeOptions.map((option) => (
                <button key={option.value} type="button" onClick={() => setThemePreference(option.value)} style={optionButtonStyle(themePreference === option.value)}>
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section style={sectionStyle}>
            <label style={labelStyle}>{t('settings.language')}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Languages size={15} color="var(--ink-500)" />
              <select value={language} onChange={(e) => setLanguage(e.target.value as LanguagePreference)} style={inputStyle}>
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </section>

          <section style={{ paddingTop: 16 }}>
            <label style={labelStyle}>{t('settings.appInfo')}</label>
            <InfoRow label={t('settings.version')} value={APP_VERSION} />
            <InfoRow label={t('settings.studio')} value="Guesswhat Studio" href={STUDIO_URL} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={{ ...linkButtonStyle, flex: 1 }}>
                <Github size={13} />
                GitHub
              </a>
              <button
                type="button"
                disabled={updateState.status === 'checking'}
                title={updateMessage}
                onClick={() => void handleUpdateAction()}
                style={{ ...actionButtonStyle(updateState.status === 'checking'), flex: 1 }}
              >
                {updateState.status === 'available' ? <Download size={13} /> : null}
                {updateButtonLabel}
              </button>
            </div>
            <p style={{ margin: '8px 0 0', color: updateState.status === 'error' ? 'var(--accent)' : 'var(--ink-500)', fontSize: 11.5, lineHeight: 1.45 }}>
              {updateMessage}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ flex: 1, fontSize: 13, color: 'var(--ink-800)' }}>{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--ink-600)', textDecoration: 'none' }}>
          {value}
        </a>
      ) : (
        <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>{value}</span>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.11em',
  textTransform: 'uppercase',
  color: 'var(--ink-500)',
  marginBottom: 8,
};

const sectionStyle: React.CSSProperties = {
  padding: '0 0 16px',
  marginBottom: 16,
  borderBottom: '1px solid var(--ink-150)',
};

const betaNoteStyle: React.CSSProperties = {
  margin: '0 0 10px',
  padding: '8px 9px',
  border: '1px solid color-mix(in srgb, var(--accent) 28%, var(--ink-200))',
  borderRadius: 5,
  background: 'color-mix(in srgb, var(--accent) 8%, var(--bg-canvas))',
  color: 'var(--ink-700)',
  fontSize: 12,
  lineHeight: 1.45,
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

const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: 32,
  border: '1px solid var(--ink-200)',
  borderRadius: 5,
  background: 'var(--bg-canvas)',
  color: 'var(--ink-900)',
  padding: '0 8px',
  fontSize: 13,
  outline: 'none',
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

function actionButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    flex: 1,
    minWidth: 0,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    border: '1px solid var(--ink-200)',
    borderRadius: 5,
    background: 'transparent',
    color: disabled ? 'var(--ink-400)' : 'var(--ink-800)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 12,
    fontWeight: 500,
    opacity: disabled ? 0.55 : 1,
  };
}

const linkButtonStyle: React.CSSProperties = {
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
};
