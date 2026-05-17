import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  BookOpen,
  Check,
  Database,
  Download,
  FileText,
  Github,
  Info,
  Languages,
  Monitor,
  Moon,
  Palette,
  PlayCircle,
  Sun,
  Upload,
  X,
} from 'lucide-react';
import { useUiStore, type LanguagePreference, type ThemePreference } from '@/stores/uiStore';
import { useUserStore } from '@/stores/userStore';
import { useT } from '@/i18n';
import type { TutorialKind } from '@/lib/demoData';
import { APP_VERSION } from '@/version';
import { checkForCalabashUpdate, type UpdateCheckResult } from '@/lib/updateCheck';
import { db } from '@/db/schema';

const GITHUB_URL = 'https://github.com/Guesswhat-Studio/Calabash';
const STUDIO_URL = 'https://guesswhat.studio';
const STUDIO_LOGO_URL = '/guesswhat-studio-logo.png';

type SettingsTab = 'library' | 'data' | 'guides' | 'look' | 'about';

interface InventoryCounts {
  cases: number;
  nodes: number;
  relations: number;
}

export interface SettingsPanelProps {
  onClose: () => void;
  onExportLibrary: () => void;
  onImportLibrary: () => void;
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

  const [activeTab, setActiveTab] = useState<SettingsTab>('look');
  const [renameValue, setRenameValue] = useState('');
  const [inventory, setInventory] = useState<InventoryCounts>({ cases: 0, nodes: 0, relations: 0 });
  const [storageSize, setStorageSize] = useState('local');
  const [updateState, setUpdateState] = useState<
    | { status: 'idle' }
    | { status: 'checking' }
    | { status: 'current'; result: UpdateCheckResult }
    | { status: 'available'; result: Extract<UpdateCheckResult, { status: 'available' }> }
    | { status: 'error' }
  >({ status: 'idle' });
  const activeUser = users.find((user) => user.id === activeUserId) ?? null;

  useEffect(() => {
    setRenameValue(activeUser?.name ?? '');
  }, [activeUser?.name]);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      const [cases, nodes, relations] = await Promise.all([
        db.books.count(),
        db.characters.count(),
        db.relationships.count(),
      ]);
      if (!cancelled) setInventory({ cases, nodes, relations });

      const estimate = await navigator.storage?.estimate?.();
      if (!cancelled && estimate?.usage) setStorageSize(formatBytes(estimate.usage));
    }

    void loadStats();
    return () => { cancelled = true; };
  }, []);

  const filedDate = useMemo(() => formatFiledDate(new Date()), []);

  const themeOptions: Array<{ value: ThemePreference; label: string; hint: string; icon: ReactNode }> = [
    { value: 'light', label: t('settings.themeLight'), hint: 'paper · light', icon: <Sun size={13} /> },
    { value: 'dark', label: t('settings.themeDark'), hint: 'library · dark', icon: <Moon size={13} /> },
    { value: 'system', label: t('settings.themeSystem'), hint: 'follow OS', icon: <Monitor size={13} /> },
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
      setActiveTab('about');
    } catch {
      setUpdateState({ status: 'error' });
      setActiveTab('about');
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

  const tabs: Array<{ id: SettingsTab; label: string; color: string; icon: ReactNode }> = [
    { id: 'look', label: t('settings.tabLook'), color: 'var(--rel-romantic)', icon: <Palette size={13} /> },
    { id: 'guides', label: t('settings.tabGuides'), color: 'var(--accent)', icon: <PlayCircle size={13} /> },
    { id: 'library', label: t('settings.tabLibrary'), color: 'var(--role-witness)', icon: <BookOpen size={13} /> },
    { id: 'data', label: t('settings.tabData'), color: 'var(--role-detective)', icon: <Database size={13} /> },
    { id: 'about', label: t('settings.tabAbout'), color: 'var(--role-bystander)', icon: <Info size={13} /> },
  ];
  const activeColor = tabs.find((tab) => tab.id === activeTab)?.color ?? 'var(--accent)';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('settings.title')}
      style={overlayStyle}
      onClick={onClose}
    >
      <div style={folderFrameStyle} onClick={(e) => e.stopPropagation()}>
        <div style={tabRailStyle}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-pressed={activeTab === tab.id}
              style={folderTabStyle(activeTab === tab.id, tab.color)}
            >
              <span style={{ display: 'flex', color: activeTab === tab.id ? tab.color : 'var(--ink-500)' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
          <button type="button" onClick={onClose} title={t('settings.close')} aria-label={t('settings.close')} style={roundCloseStyle}>
            <X size={14} />
          </button>
        </div>

        <div style={folderBodyStyle(activeColor)}>
          <div style={binderEdgeStyle} aria-hidden="true">
            {[0, 1, 2].map((index) => <span key={index} style={binderHoleStyle} />)}
          </div>

          <header style={folderHeaderStyle}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={fileLineStyle}>
                <span style={fileBadgeStyle}>FILE NO.</span>
                <span>CB · 0042 · 26</span>
                <span style={{ color: 'var(--ink-300)' }}>—</span>
                <span>CASE SETTINGS</span>
              </div>
              <div style={titleLineStyle}>
                Calabash
                <span style={{ color: activeColor, fontSize: 18, fontStyle: 'italic' }}>
                  · {tabs.find((tab) => tab.id === activeTab)?.label.toLowerCase()}
                </span>
              </div>
            </div>
            <div style={stampStyle}>BETA · v{APP_VERSION}</div>
          </header>

          <main style={folderContentStyle}>
            {activeTab === 'library' && (
              <>
                <SectionTab color={activeColor} number="01">{t('settings.readingLog')}</SectionTab>
                <FolderRow label={t('settings.renameProfile')} hint={t('settings.localLibraryHint')}>
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => void handleRenameProfile()}
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleRenameProfile(); }}
                    aria-label={t('settings.renameProfile')}
                    style={{ ...inputStyle, maxWidth: 320 }}
                  />
                </FolderRow>
                <FolderRow label={t('settings.inventory')} hint={t('settings.inventoryHint')} align="top">
                  <InventoryLedger inventory={inventory} />
                </FolderRow>
                <FolderRow label={t('settings.storage')} hint={t('settings.storageHint')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={monoValueStyle}>local · {storageSize}</span>
                    <span style={smallStampStyle}>{t('settings.noCloudSync')}</span>
                  </div>
                </FolderRow>
              </>
            )}

            {activeTab === 'data' && (
              <>
                <SectionTab color={activeColor} number="02">{t('settings.evidenceTransport')}</SectionTab>
                <FolderRow label={t('settings.exportLibrary')} hint={t('settings.exportLibraryHint')}>
                  <ActionButton onClick={onExportLibrary} icon={<Download size={13} />}>{t('settings.exportLibrary')}</ActionButton>
                </FolderRow>
                <FolderRow label={t('settings.importLibrary')} hint={t('settings.importLibraryHint')}>
                  <ActionButton onClick={onImportLibrary} icon={<Upload size={13} />}>{t('settings.importLibrary')}</ActionButton>
                </FolderRow>
                <SectionTab color="var(--rel-hostile)" number="03" tilt={0.6}>{t('settings.betaNotice')}</SectionTab>
                <div style={warningNoteStyle}>{t('settings.betaStorageNote')}</div>
              </>
            )}

            {activeTab === 'guides' && (
              <>
                <SectionTab color={activeColor} number="01">{t('settings.tutorials')}</SectionTab>
                <div data-testid="settings-tutorial-grid" style={tutorialGridStyle}>
                  <TutorialCard
                    eyebrow="PUZZLE"
                    title={t('onboarding.createContestTemplate')}
                    author="Blank board · 5 zones"
                    accent
                    onClick={() => onCreateTutorial('contest')}
                  />
                  <TutorialCard
                    eyebrow="ACKROYD"
                    title={t('onboarding.createAckroydTutorial')}
                    author="Agatha Christie · 27 ch."
                    onClick={() => onCreateTutorial('ackroyd')}
                  />
                  <TutorialCard
                    eyebrow="HIDA"
                    title={t('onboarding.createHidaTutorial')}
                    author="Kindaichi · 3 ep."
                    onClick={() => onCreateTutorial('hida')}
                  />
                </div>
                <SectionTab color="var(--role-bystander)" number="02" tilt={0.4}>{t('settings.reference')}</SectionTab>
                <FolderRow label={t('settings.openGuide')} hint={t('settings.openGuideHint')}>
                  <ActionButton onClick={onOpenOnboarding} icon={<FileText size={13} />}>{t('settings.openGuide')}</ActionButton>
                </FolderRow>
              </>
            )}

            {activeTab === 'look' && (
              <>
                <SectionTab color={activeColor} number="01">{t('settings.readingConditions')}</SectionTab>
                <FolderRow label={t('settings.theme')} hint={t('settings.themeHint')} align="top">
                  <div style={themeGridStyle}>
                    {themeOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setThemePreference(option.value)}
                        style={themeChoiceStyle(themePreference === option.value)}
                      >
                        <span style={{ display: 'flex', color: themePreference === option.value ? 'var(--accent)' : 'var(--ink-500)' }}>{option.icon}</span>
                        <span style={{ flex: 1 }}>{option.label}</span>
                        {themePreference === option.value && <Check size={12} />}
                        <small style={{ gridColumn: '1 / -1', color: 'var(--ink-500)', fontSize: 10, fontWeight: 500, fontStyle: 'italic' }}>{option.hint}</small>
                      </button>
                    ))}
                  </div>
                </FolderRow>
                <FolderRow label={t('settings.language')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 300 }}>
                    <Languages size={15} color="var(--ink-500)" />
                    <select value={language} onChange={(e) => setLanguage(e.target.value as LanguagePreference)} style={inputStyle}>
                      {languageOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </FolderRow>
              </>
            )}

            {activeTab === 'about' && (
              <>
                <SectionTab color={activeColor} number="01">{t('settings.provenance')}</SectionTab>
                <FolderRow label={t('settings.version')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={monoValueStyle}>{APP_VERSION}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-500)', fontStyle: 'italic' }}>local-only beta</span>
                  </div>
                </FolderRow>
                <FolderRow label={t('settings.studio')}>
                  <a
                    href={STUDIO_URL}
                    target="_blank"
                    rel="noreferrer"
                    style={studioCardStyle}
                    aria-label={t('settings.openStudio')}
                  >
                    <span style={studioLogoFrameStyle}>
                      <img src={STUDIO_LOGO_URL} alt={t('settings.studioLogoAlt')} style={studioLogoStyle} />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={studioLinkStyle}>Guesswhat Studio</span>
                      <span style={studioTaglineStyle}>{t('settings.studioTagline')}</span>
                    </span>
                  </a>
                </FolderRow>
                <SectionTab color="var(--accent)" number="02" tilt={0.3}>{t('settings.distribution')}</SectionTab>
                <FolderRow label={t('settings.links')} align="top">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={linkButtonStyle}>
                      <Github size={13} />
                      GitHub
                    </a>
                    <ActionButton disabled={updateState.status === 'checking'} onClick={() => void handleUpdateAction()} icon={<Download size={13} />}>
                      {updateButtonLabel}
                    </ActionButton>
                  </div>
                  <p style={{ margin: '9px 0 0', color: updateState.status === 'error' ? 'var(--accent)' : 'var(--ink-500)', fontSize: 11.5, lineHeight: 1.45 }}>
                    {updateMessage}
                  </p>
                </FolderRow>
              </>
            )}
          </main>

          <footer style={folderFooterStyle}>
            <Paperclip />
            <DateStamp>{t('settings.filed')} · {filedDate}</DateStamp>
            <div style={{ flex: 1, minWidth: 0, fontSize: 11, color: 'var(--ink-500)', fontStyle: 'italic' }}>
              {t('settings.autoSaveNote')}
            </div>
            <button type="button" onClick={onClose} style={closeFolderButtonStyle}>{t('settings.closeFolder')}</button>
          </footer>
        </div>
        <div style={ghostPageStyle(1)} />
        <div style={ghostPageStyle(2)} />
      </div>
    </div>
  );
}

function SectionTab({ number, color, tilt = -0.5, children }: { number: string; color: string; tilt?: number; children: ReactNode }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      margin: '16px 0 12px',
      padding: '4px 12px 4px 10px',
      background: 'color-mix(in srgb, var(--bg-canvas) 84%, var(--ink-100))',
      border: `1px solid color-mix(in srgb, ${color} 35%, var(--ink-300))`,
      borderLeft: `4px solid ${color}`,
      borderRadius: '0 4px 4px 0',
      transform: `rotate(${tilt}deg)`,
      boxShadow: 'var(--shadow-soft)',
      fontFamily: 'var(--font-mono)',
      color: 'var(--ink-800)',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '.12em',
      textTransform: 'uppercase',
    }}>
      <span style={{ color, fontWeight: 800 }}>{number}</span>
      {children}
    </div>
  );
}

function FolderRow({ label, hint, align = 'center', children }: {
  label: string;
  hint?: string;
  align?: CSSProperties['alignItems'];
  children: ReactNode;
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '150px 1fr',
      gap: 18,
      alignItems: align,
      padding: '9px 0',
      borderBottom: '1px dashed color-mix(in srgb, var(--ink-300) 45%, transparent)',
    }}>
      <div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '.13em',
          color: 'var(--ink-500)',
          textTransform: 'uppercase',
          fontWeight: 700,
        }}>{label}</div>
        {hint && <div style={{ marginTop: 4, fontSize: 11, color: 'var(--ink-500)', lineHeight: 1.35 }}>{hint}</div>}
      </div>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}

function InventoryLedger({ inventory }: { inventory: InventoryCounts }) {
  const rows = [
    { value: inventory.cases, label: 'cases' },
    { value: inventory.nodes, label: 'nodes' },
    { value: inventory.relations, label: 'relations' },
  ];
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      border: '1px solid var(--ink-200)',
      borderRadius: 4,
      background: 'var(--bg-canvas)',
      overflow: 'hidden',
      maxWidth: 360,
    }}>
      {rows.map((row, index) => (
        <div key={row.label} style={{ padding: '8px 12px', borderLeft: index ? '1px solid var(--ink-200)' : 'none' }}>
          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-900)', fontSize: 16 }}>{row.value}</div>
          <div style={{ marginTop: 2, fontSize: 9.5, color: 'var(--ink-500)', letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 700 }}>{row.label}</div>
        </div>
      ))}
    </div>
  );
}

function ActionButton({ children, icon, onClick, disabled }: {
  children: ReactNode;
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} style={actionButtonStyle(Boolean(disabled))}>
      {icon}
      {children}
    </button>
  );
}

function TutorialCard({ eyebrow, title, author, accent, onClick }: {
  eyebrow: string;
  title: string;
  author: string;
  accent?: boolean;
  onClick: () => void;
}) {
  const color = accent ? 'var(--accent)' : 'var(--ink-700)';
  return (
    <button type="button" onClick={onClick} data-testid="settings-tutorial-card" style={{
      position: 'relative',
      minWidth: 0,
      minHeight: 112,
      display: 'grid',
      gridTemplateRows: 'auto 1fr auto',
      alignItems: 'start',
      gap: 5,
      padding: '18px 12px 12px',
      background: 'color-mix(in srgb, var(--bg-canvas) 92%, var(--ink-100))',
      border: `1px solid color-mix(in srgb, ${color} 35%, var(--ink-300))`,
      borderTop: `3px solid ${color}`,
      borderRadius: '0 0 4px 4px',
      boxShadow: '0 1px 2px rgba(40,28,12,.10), 0 8px 16px -8px rgba(40,28,12,.22)',
      color: 'var(--ink-900)',
      cursor: 'pointer',
      textAlign: 'left',
    }}>
      <div style={{
        position: 'absolute',
        left: 12,
        top: -7,
        width: 12,
        height: 12,
        borderRadius: 999,
        background: `radial-gradient(circle at 30% 30%, color-mix(in srgb, ${color} 30%, white), ${color})`,
        boxShadow: '0 1px 2px rgba(0,0,0,.4), inset 0 -1px 2px rgba(0,0,0,.3)',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color, letterSpacing: '.12em', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {eyebrow}
        </span>
        <PlayCircle size={12} style={{ color, flexShrink: 0 }} />
      </div>
      <div style={{ fontFamily: 'var(--font-case-title)', fontSize: 13.5, color: 'var(--ink-900)', lineHeight: 1.22, overflowWrap: 'anywhere' }}>
        {title}
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--ink-500)', fontStyle: 'italic', lineHeight: 1.25, overflowWrap: 'anywhere' }}>{author}</div>
    </button>
  );
}

function Paperclip() {
  return (
    <div aria-hidden="true" style={{
      position: 'relative',
      width: 20,
      height: 26,
      transform: 'rotate(-8deg)',
      flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute',
        inset: '3px 5px 2px 5px',
        border: '2px solid var(--ink-400)',
        borderTop: 'none',
        borderRadius: '0 0 10px 10px',
        opacity: 0.85,
      }} />
      <div style={{
        position: 'absolute',
        inset: '0 2px 5px 2px',
        border: '2px solid var(--ink-300)',
        borderBottom: 'none',
        borderRadius: '10px 10px 0 0',
        opacity: 0.7,
      }} />
    </div>
  );
}

function DateStamp({ children }: { children: ReactNode }) {
  return (
    <div style={{
      padding: '4px 9px',
      border: '1px solid color-mix(in srgb, var(--ink-500) 45%, transparent)',
      borderRadius: 2,
      color: 'var(--ink-600)',
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '.13em',
      textTransform: 'uppercase',
      transform: 'rotate(-0.8deg)',
      background: 'color-mix(in srgb, var(--bg-canvas) 45%, transparent)',
      flexShrink: 0,
    }}>{children}</div>
  );
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  const kb = value / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatFiledDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, ' ').toUpperCase();
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  background: 'color-mix(in srgb, var(--ink-900) 38%, transparent)',
  display: 'grid',
  placeItems: 'center',
  padding: 24,
};

const folderFrameStyle: CSSProperties = {
  width: 720,
  maxWidth: 'calc(100vw - 32px)',
  maxHeight: 'calc(100vh - 32px)',
  position: 'relative',
  isolation: 'isolate',
  fontFamily: 'var(--font-ui)',
  color: 'var(--ink-900)',
  fontSize: 13,
};

const tabRailStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: 5,
  padding: '0 24px',
  position: 'relative',
  zIndex: 3,
  marginBottom: -1,
};

function folderTabStyle(active: boolean, color: string): CSSProperties {
  return {
    height: active ? 40 : 34,
    minWidth: 106,
    padding: '0 16px 0 13px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    border: '1px solid color-mix(in srgb, var(--ink-300) 72%, transparent)',
    borderBottom: active ? '1px solid var(--bg-elevated)' : '1px solid color-mix(in srgb, var(--ink-300) 72%, transparent)',
    background: active
      ? 'var(--bg-elevated)'
      : 'color-mix(in srgb, var(--bg-panel) 72%, var(--bg-canvas))',
    color: active ? 'var(--ink-900)' : 'var(--ink-600)',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '.12em',
    textTransform: 'uppercase',
    clipPath: 'polygon(0 0, calc(100% - 13px) 0, 100% 100%, 0 100%)',
    boxShadow: active ? `inset 0 3px 0 ${color}` : 'none',
  };
}

const roundCloseStyle: CSSProperties = {
  width: 28,
  height: 28,
  marginLeft: 'auto',
  marginBottom: 8,
  padding: 0,
  border: '1px solid color-mix(in srgb, var(--ink-300) 50%, transparent)',
  borderRadius: 999,
  display: 'grid',
  placeItems: 'center',
  background: 'color-mix(in srgb, var(--bg-panel) 70%, transparent)',
  color: 'var(--ink-600)',
  cursor: 'pointer',
};

function folderBodyStyle(color: string): CSSProperties {
  return {
    position: 'relative',
    zIndex: 2,
    maxHeight: 'calc(100vh - 94px)',
    display: 'grid',
    gridTemplateRows: 'auto minmax(0, 1fr) auto',
    background: 'var(--bg-elevated)',
    backgroundImage: `
      radial-gradient(ellipse 60% 40% at 20% 12%, color-mix(in srgb, var(--ink-700) 6%, transparent), transparent 60%),
      radial-gradient(ellipse 40% 50% at 85% 88%, color-mix(in srgb, var(--ink-700) 8%, transparent), transparent 55%),
      repeating-linear-gradient(0deg, transparent 0px, transparent 3px, color-mix(in srgb, var(--ink-700) 1.4%, transparent) 3px, color-mix(in srgb, var(--ink-700) 1.4%, transparent) 4px)
    `,
    border: '1px solid color-mix(in srgb, var(--ink-300) 80%, transparent)',
    borderTop: `3px solid ${color}`,
    borderRadius: '0 4px 8px 8px',
    boxShadow: 'var(--shadow-modal)',
    overflow: 'hidden',
  };
}

const binderEdgeStyle: CSSProperties = {
  position: 'absolute',
  top: 72,
  bottom: 70,
  left: 18,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-around',
  pointerEvents: 'none',
};

const binderHoleStyle: CSSProperties = {
  width: 13,
  height: 13,
  border: '2px solid color-mix(in srgb, var(--ink-500) 36%, transparent)',
  borderRadius: 999,
  background: 'color-mix(in srgb, var(--bg-canvas) 72%, var(--bg-elevated))',
  boxShadow: 'inset 0 1px 2px rgba(40,28,12,.16)',
};

const folderHeaderStyle: CSSProperties = {
  padding: '20px 28px 18px 50px',
  borderBottom: '1px solid color-mix(in srgb, var(--ink-300) 55%, transparent)',
  display: 'flex',
  alignItems: 'flex-start',
  gap: 16,
};

const fileLineStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 10,
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  color: 'var(--ink-500)',
  letterSpacing: '.16em',
  fontWeight: 700,
};

const fileBadgeStyle: CSSProperties = {
  padding: '2px 7px',
  border: '1px solid color-mix(in srgb, var(--ink-400) 40%, transparent)',
  borderRadius: 2,
  background: 'color-mix(in srgb, var(--ink-700) 8%, transparent)',
  color: 'var(--ink-700)',
};

const titleLineStyle: CSSProperties = {
  marginTop: 7,
  display: 'flex',
  alignItems: 'baseline',
  gap: 12,
  flexWrap: 'wrap',
  fontFamily: 'var(--font-case-title)',
  fontSize: 26,
  lineHeight: 1.05,
  color: 'var(--ink-900)',
};

const stampStyle: CSSProperties = {
  padding: '7px 10px',
  border: '2px solid var(--accent)',
  color: 'var(--accent)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: '.13em',
  transform: 'rotate(2deg)',
  textTransform: 'uppercase',
  flexShrink: 0,
};

const folderContentStyle: CSSProperties = {
  minHeight: 360,
  overflowY: 'auto',
  padding: '6px 30px 18px 50px',
};

const folderFooterStyle: CSSProperties = {
  padding: '14px 28px 14px 50px',
  borderTop: '1px solid color-mix(in srgb, var(--ink-300) 55%, transparent)',
  background: 'color-mix(in srgb, var(--bg-canvas) 38%, var(--bg-elevated))',
  display: 'flex',
  alignItems: 'center',
  gap: 14,
};

const inputStyle: CSSProperties = {
  width: '100%',
  minWidth: 0,
  height: 34,
  padding: '0 10px',
  border: '1px solid var(--ink-200)',
  borderRadius: 4,
  background: 'var(--bg-canvas)',
  color: 'var(--ink-900)',
  fontSize: 13,
  outline: 'none',
};

const monoValueStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  color: 'var(--ink-800)',
};

const smallStampStyle: CSSProperties = {
  padding: '2px 7px',
  border: '1px solid color-mix(in srgb, var(--rel-suspicion) 40%, transparent)',
  borderRadius: 2,
  background: 'color-mix(in srgb, var(--rel-suspicion) 14%, transparent)',
  color: 'color-mix(in srgb, var(--rel-suspicion) 90%, var(--ink-900))',
  fontFamily: 'var(--font-mono)',
  fontSize: 9.5,
  fontWeight: 800,
  letterSpacing: '.08em',
  textTransform: 'uppercase',
};

const warningNoteStyle: CSSProperties = {
  margin: '4px 0 0',
  padding: '10px 12px',
  border: '1px solid color-mix(in srgb, var(--accent) 30%, var(--ink-200))',
  borderLeft: '4px solid var(--accent)',
  borderRadius: 4,
  background: 'color-mix(in srgb, var(--accent) 7%, var(--bg-canvas))',
  color: 'var(--ink-700)',
  fontSize: 12,
  lineHeight: 1.5,
};

const tutorialGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 8,
  marginTop: 4,
};

const themeGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 8,
};

function themeChoiceStyle(active: boolean): CSSProperties {
  return {
    minHeight: 74,
    padding: '9px 11px',
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto',
    gap: 6,
    alignItems: 'center',
    border: active ? '1px solid color-mix(in srgb, var(--accent) 50%, var(--ink-300))' : '1px solid var(--ink-200)',
    borderRadius: 5,
    background: active ? 'color-mix(in srgb, var(--accent) 8%, var(--bg-canvas))' : 'var(--bg-canvas)',
    color: active ? 'var(--ink-900)' : 'var(--ink-700)',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    textAlign: 'left',
  };
}

function actionButtonStyle(disabled: boolean): CSSProperties {
  return {
    minHeight: 32,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    padding: '6px 12px',
    border: '1px solid var(--ink-200)',
    borderRadius: 4,
    background: 'transparent',
    color: disabled ? 'var(--ink-400)' : 'var(--ink-800)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    fontSize: 12,
    fontWeight: 600,
  };
}

const linkButtonStyle: CSSProperties = {
  minHeight: 32,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  padding: '6px 12px',
  border: '1px solid var(--ink-200)',
  borderRadius: 4,
  background: 'transparent',
  color: 'var(--ink-800)',
  textDecoration: 'none',
  fontSize: 12,
  fontWeight: 600,
};

const studioLinkStyle: CSSProperties = {
  color: 'var(--ink-900)',
  display: 'block',
  fontFamily: 'var(--font-case-title)',
  fontSize: 16,
  lineHeight: 1.15,
};

const studioCardStyle: CSSProperties = {
  width: 'min(100%, 420px)',
  minHeight: 74,
  padding: 10,
  display: 'grid',
  gridTemplateColumns: '54px 1fr',
  alignItems: 'center',
  gap: 12,
  border: '1px solid color-mix(in srgb, var(--role-bystander) 32%, var(--ink-200))',
  borderRadius: 6,
  background: 'linear-gradient(135deg, color-mix(in srgb, var(--role-bystander) 10%, var(--bg-canvas)), var(--bg-panel) 72%)',
  color: 'var(--ink-900)',
  textDecoration: 'none',
  boxShadow: 'var(--shadow-soft)',
};

const studioLogoFrameStyle: CSSProperties = {
  width: 54,
  height: 54,
  display: 'grid',
  placeItems: 'center',
  borderRadius: 999,
  background: 'var(--bg-canvas)',
  border: '1px solid color-mix(in srgb, var(--role-bystander) 45%, var(--ink-200))',
  boxShadow: '0 1px 2px rgba(40,28,12,.14), inset 0 0 0 3px color-mix(in srgb, var(--bg-panel) 68%, transparent)',
  overflow: 'hidden',
};

const studioLogoStyle: CSSProperties = {
  width: 48,
  height: 48,
  objectFit: 'cover',
  borderRadius: 999,
  display: 'block',
};

const studioTaglineStyle: CSSProperties = {
  display: 'block',
  marginTop: 3,
  color: 'var(--ink-500)',
  fontSize: 11.5,
  lineHeight: 1.35,
};

const closeFolderButtonStyle: CSSProperties = {
  minHeight: 34,
  padding: '7px 20px',
  border: '1px solid var(--ink-900)',
  borderRadius: 5,
  background: 'var(--ink-900)',
  color: 'var(--bg-panel)',
  cursor: 'pointer',
  fontFamily: 'var(--font-case-title)',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '.02em',
  flexShrink: 0,
};

function ghostPageStyle(depth: 1 | 2): CSSProperties {
  return {
    position: 'absolute',
    zIndex: depth === 1 ? 1 : 0,
    left: depth === 1 ? 14 : 22,
    right: depth === 1 ? 14 : 22,
    bottom: depth === 1 ? -6 : -12,
    height: 8,
    borderRadius: '0 0 6px 6px',
    background: depth === 1
      ? 'color-mix(in srgb, var(--bg-canvas) 70%, var(--ink-300))'
      : 'color-mix(in srgb, var(--bg-canvas) 55%, var(--ink-300))',
    boxShadow: '0 6px 14px -6px rgba(40,28,12,.32)',
  };
}
