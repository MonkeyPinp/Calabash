import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ArrowRight, BookOpen, CircleDashed, Clock3, Download, FilePlus2, FileText, Github, Image as ImageIcon, Moon, Sun, PanelLeft, PanelRight, Undo2, Redo2, LayoutGrid, StickyNote, Shield, ShieldOff, Settings as SettingsIcon, Search, Upload, UserPlus } from 'lucide-react';
import CalabashCanvas from './components/Canvas/CalabashCanvas';
import ChapterSlider, { type ChapterSliderMark } from './components/Canvas/ChapterSlider';
import BookList from './components/Sidebar/BookList';
import CharacterInspector from './components/Inspector/CharacterInspector';
import RelationshipInspector from './components/Inspector/RelationshipInspector';
import StickyNoteInspector from './components/Inspector/StickyNoteInspector';
import GroupRangeInspector from './components/Inspector/GroupRangeInspector';
import EvidenceImageInspector from './components/Inspector/EvidenceImageInspector';
import OpenCluesPanel from './components/Inspector/OpenCluesPanel';
import SettingsPanel from './components/Settings/SettingsPanel';
import TimeLayerManagerModal from './components/TimeLayers/TimeLayerManagerModal';
import OnboardingPanel from './components/Onboarding/OnboardingPanel';
import CalabashLogo from './components/Brand/CalabashLogo';
import { useBookHydration } from './hooks/useBookHydration';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useBookStore } from './stores/bookStore';
import { useGraphStore } from './stores/graphStore';
import { useUiStore } from './stores/uiStore';
import { useUserStore } from './stores/userStore';
import { exportBookTemplateAsJson, exportLibraryAsJson, importBookFromJson, importLibraryFromJson, isLibraryExport } from './db/importExport';
import GlobalSearch from './components/CommandBar/GlobalSearch';
import { ChapterTotalTooLowError, createBook, getBook, listBooks, updateBook } from './db/books';
import { listCategories } from './db/categories';
import { createAnnotation, deleteAnnotation, restoreAnnotation, updateAnnotation } from './db/annotations';
import { updateCharacter } from './db/characters';
import { createGroupRange, deleteGroupRange, restoreGroupRange, updateGroupRange } from './db/groupRanges';
import { createEvidenceImage, deleteEvidenceImage, restoreEvidenceImage, updateEvidenceImage } from './db/evidenceImages';
import { updateRelationship } from './db/relationships';
import { hasSpoilerSensitiveRoleAtChapter } from './lib/roles';
import { addSpoilerChapter, getSpoilerShieldToolbarAction, removeSpoilerChapter } from './lib/spoilerShield';
import { getTutorialDefaultViewMode, seedTutorialBook, type TutorialKind } from './lib/demoData';
import { isDesktopRuntime, openDesktopJsonFile, saveDesktopLibraryBackup, saveDesktopTextFile } from './lib/desktopFiles';
import { ALL_TIME_LAYERS_ID, resolveDefaultTimeLayerId } from './lib/timeLayers';
import { useT } from './i18n';
import type { Book, Category, EvidenceImageKind, TimeLayer } from './types';
import type { CharacterNodeViewMode } from './stores/uiStore';
import { EVIDENCE_IMAGE_DEFAULT_HEIGHT, EVIDENCE_IMAGE_DEFAULT_WIDTH } from './lib/evidenceImages';

const GITHUB_URL = 'https://github.com/Guesswhat-Studio/Calabash';
const ONBOARDING_SEEN_KEY = 'calabash-onboarding-seen';

const toolbarBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid transparent',
  borderRadius: 5,
  minWidth: 30,
  height: 30,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'var(--ink-600)',
  padding: '0 8px',
  flexShrink: 0,
  fontSize: 12,
  fontWeight: 500,
  gap: 6,
};

const dividerStyle: React.CSSProperties = {
  width: 1,
  height: 18,
  background: 'var(--ink-200)',
  margin: '0 6px',
  flexShrink: 0,
};

const toolbarClusterStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: 3,
  background: 'var(--bg-canvas)',
  border: '1px solid var(--ink-200)',
  borderRadius: 7,
  flexShrink: 0,
};

const historyClusterStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  border: '1px solid var(--ink-200)',
  borderRadius: 5,
  overflow: 'hidden',
  flexShrink: 0,
};

const primaryToolbarBtnStyle: React.CSSProperties = {
  ...toolbarBtnStyle,
  background: 'var(--ink-900)',
  borderColor: 'var(--ink-900)',
  color: 'var(--bg-panel)',
  padding: '0 11px 0 9px',
};

const sidebarUtilityButtonStyle: React.CSSProperties = {
  flex: 1,
  height: 30,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  background: 'transparent',
  border: '1px solid var(--ink-200)',
  borderRadius: 5,
  color: 'var(--ink-700)',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 500,
  padding: '0 8px',
};

const sidebarUtilitySecondaryButtonStyle: React.CSSProperties = {
  ...sidebarUtilityButtonStyle,
  gridColumn: '1 / -1',
  width: '100%',
  borderStyle: 'dashed',
  color: 'var(--ink-600)',
};

const phoneFallbackButtonStyle: React.CSSProperties = {
  minHeight: 38,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  padding: '8px 10px',
  border: '1px solid var(--ink-200)',
  borderRadius: 5,
  background: 'var(--bg-canvas)',
  color: 'var(--ink-800)',
  cursor: 'pointer',
  fontSize: 12.5,
  fontWeight: 700,
};

const toastStyle: React.CSSProperties = {
  position: 'fixed',
  left: '50%',
  bottom: 'calc(86px + var(--app-safe-bottom, 0px))',
  transform: 'translateX(-50%)',
  zIndex: 900,
  maxWidth: 'min(680px, calc(100vw - 32px))',
  padding: '9px 13px',
  background: 'var(--ink-900)',
  border: '1px solid var(--ink-700)',
  borderRadius: 6,
  color: 'var(--bg-panel)',
  boxShadow: 'var(--shadow-modal)',
  fontSize: 12,
  lineHeight: 1.45,
  overflowWrap: 'anywhere',
};

function BoardStyleSwitcher({
  value,
  onChange,
  t,
}: {
  value: CharacterNodeViewMode;
  onChange: (mode: CharacterNodeViewMode) => void;
  t: ReturnType<typeof useT>;
}) {
  const options: Array<{ value: CharacterNodeViewMode; label: string; icon: React.ReactNode }> = [
    { value: 'text', label: t('app.textMode'), icon: <FileText size={13} /> },
    { value: 'portrait', label: t('app.portraitMode'), icon: <ImageIcon size={13} /> },
  ];

  return (
    <div role="group" aria-label={t('app.viewMode')} className="view-mode-cluster" style={viewModeClusterStyle}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            className="view-mode-button"
            aria-pressed={active}
            title={option.label}
            onClick={() => onChange(option.value)}
            style={viewModeButtonStyle(active)}
          >
            {option.icon}
            <span className="view-mode-label">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function getTimeLayerThumbLabel(id: string, name: string, index: number) {
  if (id === ALL_TIME_LAYERS_ID) return 'All';
  const numeric = name.match(/\d+/)?.[0] ?? id.match(/\d+/)?.[0];
  if (numeric) return numeric;
  const compact = name.trim().replace(/\s+/g, '');
  return compact.slice(0, 2).toUpperCase() || String(index + 1);
}

function TimeLayerSwitcher({
  layers,
  value,
  onChange,
  onManage,
  disabled = false,
  t,
}: {
  layers: TimeLayer[];
  value: string;
  onChange: (id: string) => void;
  onManage: () => void;
  disabled?: boolean;
  t: ReturnType<typeof useT>;
}) {
  if (layers.length === 0) {
    return (
      <button
        type="button"
        className="time-layer-switcher"
        title={t('timeLayer.manage')}
        disabled={disabled}
        onClick={onManage}
        style={{
          ...toolbarBtnStyle,
          height: 34,
          borderColor: 'var(--ink-200)',
          borderRadius: 6,
          background: 'var(--bg-canvas)',
          color: disabled ? 'var(--ink-400)' : 'var(--ink-700)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          flexShrink: 0,
        }}
      >
        <Clock3 size={13} />
        <span>{t('timeLayer.addFirst')}</span>
      </button>
    );
  }

  const selectedIndex = layers.findIndex((layer) => layer.id === value);
  const selectedLayer = selectedIndex >= 0 ? layers[selectedIndex] : undefined;
  const selectedColor = selectedLayer?.color;
  const selectedName = selectedLayer?.name ?? t('timeLayer.all');
  const selectedThumb = selectedLayer
    ? getTimeLayerThumbLabel(selectedLayer.id, selectedLayer.name, selectedIndex)
    : 'All';

  return (
    <div
      className="time-layer-switcher"
      title={t('timeLayer.switcher')}
      style={{
        height: 34,
        minWidth: 0,
        maxWidth: 236,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '0 4px 0 8px',
        border: `1px solid ${selectedColor ?? 'var(--ink-200)'}`,
        borderRadius: 6,
        background: 'var(--bg-canvas)',
        color: selectedColor ?? 'var(--ink-600)',
        boxShadow: selectedColor ? `inset 3px 0 0 ${selectedColor}` : 'none',
        flexShrink: 1,
      }}
    >
      <Clock3 className="time-layer-switcher-icon" size={13} style={{ flexShrink: 0 }} />
      <span
        aria-hidden="true"
        className="time-layer-switcher-thumb"
        style={{
          background: selectedColor
            ? `color-mix(in srgb, ${selectedColor} 18%, var(--bg-panel))`
            : 'color-mix(in srgb, var(--bg-canvas) 82%, transparent)',
          borderColor: selectedColor ?? 'var(--ink-400)',
          color: selectedColor ?? 'var(--ink-600)',
        }}
      >
        {selectedThumb}
      </span>
      <select
        className="time-layer-switcher-select"
        aria-label={t('timeLayer.switcher')}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        title={selectedName}
        style={{
          minWidth: 0,
          width: '100%',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: selectedColor ?? 'var(--ink-800)',
          fontSize: 11.5,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <option value={ALL_TIME_LAYERS_ID}>{t('timeLayer.all')}</option>
        {layers.map((layer) => (
          <option key={layer.id} value={layer.id}>
            {layer.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="time-layer-switcher-manage"
        onClick={onManage}
        title={t('timeLayer.manage')}
        aria-label={t('timeLayer.manage')}
        style={{
          width: 24,
          height: 24,
          display: 'grid',
          placeItems: 'center',
          padding: 0,
          border: '1px solid transparent',
          borderRadius: 4,
          background: 'transparent',
          color: 'var(--ink-500)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <SettingsIcon size={12} />
      </button>
    </div>
  );
}

function TimeLayerRail({
  layers,
  value,
  onChange,
  disabled = false,
  t,
}: {
  layers: TimeLayer[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  t: ReturnType<typeof useT>;
}) {
  if (layers.length === 0) return null;

  const options = [
    { id: ALL_TIME_LAYERS_ID, name: t('timeLayer.all'), color: 'var(--ink-500)', thumb: 'All' },
    ...layers.map((layer, index) => ({
      id: layer.id,
      name: layer.name,
      color: layer.color ?? 'var(--ink-500)',
      thumb: getTimeLayerThumbLabel(layer.id, layer.name, index),
    })),
  ];

  return (
    <nav className="time-layer-rail" aria-label={t('timeLayer.switcher')}>
      {options.map((option) => {
        const active = value === option.id;
        const isAll = option.id === ALL_TIME_LAYERS_ID;
        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            title={option.name}
            onClick={() => onChange(option.id)}
            className="time-layer-rail-button"
            style={{
              borderColor: active ? option.color : 'transparent',
              background: active
                ? `color-mix(in srgb, ${option.color} 16%, var(--bg-panel))`
                : 'transparent',
              color: active ? 'var(--ink-900)' : 'var(--ink-700)',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            <span
              aria-hidden="true"
              className="time-layer-rail-thumb"
              style={{
                background: isAll
                  ? 'color-mix(in srgb, var(--bg-canvas) 82%, transparent)'
                  : `color-mix(in srgb, ${option.color} 18%, var(--bg-panel))`,
                borderColor: option.color,
                color: option.color,
                boxShadow: active ? `0 0 0 3px color-mix(in srgb, ${option.color} 18%, transparent)` : 'none',
              }}
            >
              {option.thumb}
            </span>
            <span className="time-layer-rail-label">{option.name}</span>
          </button>
        );
      })}
    </nav>
  );
}

const viewModeClusterStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 2,
  padding: 3,
  background: 'var(--bg-canvas)',
  border: '1px solid var(--ink-200)',
  borderRadius: 6,
  flexShrink: 0,
  position: 'relative',
  zIndex: 2,
};

function viewModeButtonStyle(active: boolean): React.CSSProperties {
  return {
    height: 26,
    minWidth: 0,
    padding: '0 9px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    border: 'none',
    borderRadius: 4,
    background: active ? 'var(--bg-panel)' : 'transparent',
    color: active ? 'var(--ink-900)' : 'var(--ink-500)',
    boxShadow: active ? '0 1px 2px rgba(40,28,12,.10), inset 0 0 0 1px var(--ink-200)' : 'none',
    cursor: 'pointer',
    fontSize: 11.5,
    fontWeight: active ? 600 : 500,
    whiteSpace: 'nowrap',
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Illustration file could not be read'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Illustration file could not be read'));
    reader.readAsDataURL(file);
  });
}

function loadImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || EVIDENCE_IMAGE_DEFAULT_WIDTH, height: img.naturalHeight || EVIDENCE_IMAGE_DEFAULT_HEIGHT });
    img.onerror = () => resolve({ width: EVIDENCE_IMAGE_DEFAULT_WIDTH, height: EVIDENCE_IMAGE_DEFAULT_HEIGHT });
    img.src = dataUrl;
  });
}

function fitEvidenceImageSize(dimensions: { width: number; height: number }) {
  const maxWidth = 820;
  const maxHeight = 560;
  const scale = Math.min(maxWidth / dimensions.width, maxHeight / dimensions.height, 1);
  return {
    width: Math.max(180, Math.round(dimensions.width * scale)),
    height: Math.max(120, Math.round(dimensions.height * scale)),
  };
}

function titleFromFileName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Illustration';
}

function slugifyFilePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5ぁ-んァ-ン一-龯]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'case';
}

function inferEvidenceImageKind(fileName: string): EvidenceImageKind {
  const normalized = fileName.toLowerCase();
  if (/floor|plan|map|layout|平面|地图|地圖/.test(normalized)) return 'floorPlan';
  if (/screenshot|screen|capture|table|sheet|chart|page|截图|截圖|表格|一覧|リスト|スクリーンショット|captura/.test(normalized)) return 'screenshot';
  return 'general';
}

function isTextEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function useMediaQuery(query: string): boolean {
  const read = () => (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(query).matches
  );
  const [matches, setMatches] = useState(read);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

function EmptyInspectorGuide({
  t,
  bookId,
  currentChapter,
}: {
  t: ReturnType<typeof useT>;
  bookId: string | null;
  currentChapter: number;
}) {
  const rows = [
    {
      icon: <UserPlus size={13} />,
      title: t('app.inspectCharacter'),
      body: t('app.inspectCharacterBody'),
    },
    {
      icon: <ArrowRight size={13} />,
      title: t('app.inspectRelationship'),
      body: t('app.inspectRelationshipBody'),
    },
    {
      icon: <StickyNote size={13} />,
      title: t('app.inspectNote'),
      body: t('app.inspectNoteBody'),
    },
    {
      icon: <CircleDashed size={13} />,
      title: t('app.inspectGroupRange'),
      body: t('app.inspectGroupRangeBody'),
    },
    {
      icon: <ImageIcon size={13} />,
      title: t('app.inspectEvidenceImage'),
      body: t('app.inspectEvidenceImageBody'),
    },
  ];

  return (
    <div
      data-testid="empty-inspector-guide"
      style={{ height: '100%', overflowY: 'auto', padding: 18, color: 'var(--ink-500)', fontSize: 13, lineHeight: 1.55 }}
    >
      <div style={{ fontSize: 9.5, color: 'var(--ink-400)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>
        {t('app.inspector')}
      </div>
      <div style={{ fontFamily: 'var(--font-case-title)', fontSize: 18, color: 'var(--ink-900)', marginTop: 4, marginBottom: 14 }}>
        {t('app.nothingSelected')}
      </div>
      <div data-testid="empty-inspector-guide-list">
        {rows.map((row) => (
          <div
            key={row.title}
            style={{
              display: 'grid',
              gridTemplateColumns: '28px 1fr',
              gap: 12,
              padding: '12px 0',
              borderTop: '1px solid var(--ink-150)',
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                display: 'grid',
                placeItems: 'center',
                background: 'var(--bg-canvas)',
                border: '1px solid var(--ink-200)',
                borderRadius: 4,
                color: 'var(--ink-600)',
              }}
            >
              {row.icon}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-case-title)', fontSize: 13.5, color: 'var(--ink-900)', lineHeight: 1.2 }}>
                {row.title}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 2, lineHeight: 1.5 }}>
                {row.body}
              </div>
            </div>
          </div>
        ))}
      </div>
      {bookId && (
        <div style={{ marginTop: 18 }}>
          <OpenCluesPanel bookId={bookId} currentChapter={currentChapter} />
        </div>
      )}
    </div>
  );
}

function PhoneFallback({
  activeUserId,
  onExportLibrary,
  onImportLibrary,
  onOpenSettings,
}: {
  activeUserId: string | null;
  onExportLibrary: () => void;
  onImportLibrary: () => void;
  onOpenSettings: () => void;
}) {
  const t = useT();
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadLibrary() {
      const [loadedBooks, loadedCategories] = await Promise.all([
        listBooks(activeUserId ?? undefined),
        listCategories(activeUserId ?? undefined),
      ]);
      if (cancelled) return;
      setBooks(loadedBooks);
      setCategories(loadedCategories);
    }
    void loadLibrary();
    return () => { cancelled = true; };
  }, [activeUserId]);

  const categoryIds = useMemo(() => new Set(categories.map((category) => category.id)), [categories]);
  const groups = useMemo(() => {
    const uncategorized = books.filter((book) => !book.categoryId || !categoryIds.has(book.categoryId));
    return [
      { id: 'uncategorized', name: t('sidebar.uncategorized'), books: uncategorized },
      ...categories.map((category) => ({
        id: category.id,
        name: category.name,
        books: books.filter((book) => book.categoryId === category.id),
      })),
    ].filter((group) => group.books.length > 0);
  }, [books, categories, categoryIds, t]);

  return (
    <main
      data-testid="phone-fallback"
      style={{
        minHeight: 'var(--app-viewport-height)',
        width: '100vw',
        overflowY: 'auto',
        background: 'var(--bg-canvas)',
        color: 'var(--ink-900)',
        padding: '22px 18px calc(28px + var(--app-safe-bottom, 0px))',
        boxSizing: 'border-box',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <div style={{ color: 'var(--accent)', flexShrink: 0 }}>
          <CalabashLogo size={42} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-case-title)', fontSize: 26, lineHeight: 1.05 }}>
            Calabash
          </div>
          <div style={{ marginTop: 4, fontSize: 10, letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--ink-500)', fontWeight: 700 }}>
            {t('app.subtitle')}
          </div>
        </div>
      </header>

      <section
        style={{
          padding: 16,
          border: '1px solid var(--ink-200)',
          borderTop: '3px solid var(--accent)',
          borderRadius: 6,
          background: 'var(--bg-panel)',
          boxShadow: 'var(--shadow-panel)',
        }}
      >
        <div style={{ fontFamily: 'var(--font-case-title)', fontSize: 21, lineHeight: 1.15 }}>
          {t('phoneFallback.title')}
        </div>
        <p style={{ margin: '9px 0 0', color: 'var(--ink-600)', fontSize: 13, lineHeight: 1.6 }}>
          {t('phoneFallback.body')}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
          <button type="button" onClick={onExportLibrary} style={phoneFallbackButtonStyle}>
            <Download size={14} />
            <span>{t('app.export')}</span>
          </button>
          <button type="button" onClick={onImportLibrary} style={phoneFallbackButtonStyle}>
            <Upload size={14} />
            <span>{t('app.import')}</span>
          </button>
          <button type="button" onClick={onOpenSettings} style={{ ...phoneFallbackButtonStyle, gridColumn: '1 / -1' }}>
            <SettingsIcon size={14} />
            <span>{t('app.settings')}</span>
          </button>
        </div>
      </section>

      <section style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 9 }}>
          <div style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ink-500)', fontWeight: 800 }}>
            {t('phoneFallback.library')}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-500)' }}>
            {t('phoneFallback.bookCount', { count: books.length })}
          </div>
        </div>
        {books.length === 0 ? (
          <div style={{ padding: 13, border: '1px dashed var(--ink-200)', borderRadius: 5, background: 'var(--bg-panel)', color: 'var(--ink-500)', fontSize: 12.5, lineHeight: 1.5 }}>
            {t('phoneFallback.empty')}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {groups.map((group) => (
              <div key={group.id} style={{ border: '1px solid var(--ink-200)', borderRadius: 5, background: 'var(--bg-panel)', overflow: 'hidden' }}>
                <div style={{ padding: '7px 10px', borderBottom: '1px solid var(--ink-150)', color: 'var(--ink-500)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 800 }}>
                  {group.name}
                </div>
                {group.books.map((book) => (
                  <div key={book.id} style={{ padding: '10px 11px', borderTop: '1px solid var(--ink-100)' }}>
                    <div style={{ fontFamily: 'var(--font-case-title)', fontSize: 15, lineHeight: 1.2, color: 'var(--ink-900)' }}>
                      {book.title}
                    </div>
                    <div style={{ marginTop: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, color: 'var(--ink-500)', fontSize: 11 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {book.author || t('phoneFallback.unknownAuthor')}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                        {book.currentChapter}/{book.totalChapters}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      <p style={{ margin: '16px 2px 0', color: 'var(--ink-500)', fontSize: 11.5, lineHeight: 1.55 }}>
        {t('phoneFallback.backupHint')}
      </p>
    </main>
  );
}

type StarterCardTone = 'default' | 'green' | 'blue' | 'violet' | 'ochre';

const starterCardAccent: Record<StarterCardTone, string> = {
  default: 'var(--accent)',
  green: '#4f7d4b',
  blue: 'var(--role-detective)',
  violet: '#6f5ca8',
  ochre: 'var(--role-witness)',
};

function StarterActionCard({
  icon,
  title,
  body,
  action,
  tone = 'default',
  disabled = false,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action: string;
  tone?: StarterCardTone;
  disabled?: boolean;
  onClick: () => void;
}) {
  const accent = starterCardAccent[tone];
  const defaultTone = tone === 'default';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        position: 'relative',
        minWidth: 0,
        minHeight: 168,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
        background: defaultTone
          ? 'var(--bg-panel)'
          : `linear-gradient(180deg, color-mix(in srgb, ${accent} 10%, var(--bg-panel)), var(--bg-panel) 78%)`,
        border: defaultTone
          ? '1px solid var(--ink-200)'
          : `1px solid color-mix(in srgb, ${accent} 42%, var(--ink-200))`,
        borderRadius: 7,
        boxShadow: defaultTone
          ? '0 1px 2px rgba(32, 24, 14, 0.04)'
          : '0 8px 24px -18px rgba(32, 24, 14, 0.36)',
        color: 'var(--ink-900)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        textAlign: 'left',
        overflow: 'hidden',
      }}
    >
      {!defaultTone && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: '0 0 auto',
            height: 3,
            background: accent,
          }}
        />
      )}
      <span
        aria-hidden="true"
        style={{
          width: 30,
          height: 30,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 5,
          background: defaultTone
            ? 'var(--bg-canvas)'
            : `color-mix(in srgb, ${accent} 12%, var(--bg-canvas))`,
          border: defaultTone
            ? '1px solid var(--ink-200)'
            : `1px solid color-mix(in srgb, ${accent} 34%, var(--ink-200))`,
          color: accent,
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{ fontFamily: 'var(--font-case-title)', fontSize: 16.5, lineHeight: 1.15, overflowWrap: 'anywhere' }}>
        {title}
      </span>
      <span
        style={{
          flex: 1,
          color: 'var(--ink-500)',
          fontSize: 11.5,
          lineHeight: 1.5,
          overflowWrap: 'anywhere',
        }}
      >
        {body}
      </span>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: accent,
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {action}
        <ArrowRight size={13} />
      </span>
    </button>
  );
}

export default function App() {
  const t = useT();
  const { loading } = useBookHydration();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const phoneShell = useMediaQuery('(max-width: 700px)');
  const tabletShell = useMediaQuery('(max-width: 1180px)');
  const coarsePointer = useMediaQuery('(pointer: coarse)');
  const touchOptimized = tabletShell || coarsePointer;
  const [newCharacterRequestId, setNewCharacterRequestId] = useState(0);
  const [startEdgeRequestId, setStartEdgeRequestId] = useState(0);
  const [startEdgeSourceId, setStartEdgeSourceId] = useState<string | null>(null);
  const [revealedSpoilerKey, setRevealedSpoilerKey] = useState<string | null>(null);
  const [spoilerConfirmOpen, setSpoilerConfirmOpen] = useState(false);
  const [activeBookSummary, setActiveBookSummary] = useState<Book | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [timeLayerManagerOpen, setTimeLayerManagerOpen] = useState(false);
  const [timeLayerSaving, setTimeLayerSaving] = useState(false);
  const libraryImportInputRef = useRef<HTMLInputElement>(null);
  const evidenceImageInputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeBookId = useBookStore((s) => s.activeBookId);
  const setActiveBook = useBookStore((s) => s.setActiveBook);
  const currentChapter = useBookStore((s) => s.currentChapter);
  const totalChapters = useBookStore((s) => s.totalChapters);
  const spoilerShield = useBookStore((s) => s.spoilerShield);
  const spoilerChapters = useBookStore((s) => s.spoilerChapters);
  const highlightedChapters = useBookStore((s) => s.highlightedChapters);
  const timeLayers = useBookStore((s) => s.timeLayers);
  const currentTimeLayerId = useBookStore((s) => s.currentTimeLayerId);
  const setCurrentChapter = useBookStore((s) => s.setCurrentChapter);
  const setCurrentChapterAndPersist = useBookStore((s) => s.setCurrentChapterAndPersist);
  const setTotalChapters = useBookStore((s) => s.setTotalChapters);
  const setSpoilerShield = useBookStore((s) => s.setSpoilerShield);
  const setSpoilerChapters = useBookStore((s) => s.setSpoilerChapters);
  const setHighlightedChapters = useBookStore((s) => s.setHighlightedChapters);
  const setTimeLayers = useBookStore((s) => s.setTimeLayers);
  const setCurrentTimeLayerId = useBookStore((s) => s.setCurrentTimeLayerId);

  const characters = useGraphStore((s) => s.characters);
  const relationships = useGraphStore((s) => s.relationships);
  const stickyNotes = useGraphStore((s) => s.stickyNotes);
  const groupRanges = useGraphStore((s) => s.groupRanges);
  const evidenceImages = useGraphStore((s) => s.evidenceImages);
  const setCharacters = useGraphStore((s) => s.setCharacters);
  const setRelationships = useGraphStore((s) => s.setRelationships);
  const setStickyNotes = useGraphStore((s) => s.setStickyNotes);
  const setGroupRanges = useGraphStore((s) => s.setGroupRanges);
  const setEvidenceImages = useGraphStore((s) => s.setEvidenceImages);
  const addStickyNote = useGraphStore((s) => s.addStickyNote);
  const removeStickyNote = useGraphStore((s) => s.removeStickyNote);
  const updateCharacterInStore = useGraphStore((s) => s.updateCharacterInStore);
  const updateRelationshipInStore = useGraphStore((s) => s.updateRelationshipInStore);
  const updateStickyNoteInStore = useGraphStore((s) => s.updateStickyNoteInStore);
  const addGroupRange = useGraphStore((s) => s.addGroupRange);
  const removeGroupRange = useGraphStore((s) => s.removeGroupRange);
  const updateGroupRangeInStore = useGraphStore((s) => s.updateGroupRangeInStore);
  const addEvidenceImage = useGraphStore((s) => s.addEvidenceImage);
  const removeEvidenceImage = useGraphStore((s) => s.removeEvidenceImage);
  const updateEvidenceImageInStore = useGraphStore((s) => s.updateEvidenceImageInStore);
  const pushUndo = useGraphStore((s) => s.pushUndo);
  const undo = useGraphStore((s) => s.undo);
  const redo = useGraphStore((s) => s.redo);
  const undoStack = useGraphStore((s) => s.undoStack);
  const redoStack = useGraphStore((s) => s.redoStack);

  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const resolvedLanguage = useUiStore((s) => s.resolvedLanguage);
  const characterNodeViewMode = useUiStore((s) => s.characterNodeViewMode);
  const setCharacterNodeViewMode = useUiStore((s) => s.setCharacterNodeViewMode);
  const activeUserId = useUserStore((s) => s.activeUserId);
  const setActiveUser = useUserStore((s) => s.setActiveUser);
  const refreshUsers = useUserStore((s) => s.refreshUsers);

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(message);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 4200);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!activeBookId) {
      setActiveBookSummary(null);
      return;
    }
    void getBook(activeBookId).then((book) => {
      if (!cancelled) setActiveBookSummary(book ?? null);
    });
    return () => { cancelled = true; };
  }, [activeBookId]);

  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARDING_SEEN_KEY)) setOnboardingOpen(true);
    } catch { /* test env */ }
  }, []);

  const previousTabletShellRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (tabletShell && previousTabletShellRef.current !== true) {
      setSidebarOpen(false);
      setInspectorOpen(false);
    }
    if (!tabletShell && previousTabletShellRef.current === true) {
      setSidebarOpen(true);
      setInspectorOpen(true);
    }
    previousTabletShellRef.current = tabletShell;
  }, [tabletShell]);

  // Inspector selection state
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [selectedRelId, setSelectedRelId] = useState<string | null>(null);
  const [selectedStickyNoteId, setSelectedStickyNoteId] = useState<string | null>(null);
  const [selectedGroupRangeId, setSelectedGroupRangeId] = useState<string | null>(null);
  const [selectedEvidenceImageId, setSelectedEvidenceImageId] = useState<string | null>(null);

  // Reset selection when active book changes
  useEffect(() => {
    setSelectedCharId(null);
    setSelectedRelId(null);
    setSelectedStickyNoteId(null);
    setSelectedGroupRangeId(null);
    setSelectedEvidenceImageId(null);
    setRevealedSpoilerKey(null);
    setSpoilerConfirmOpen(false);
  }, [activeBookId]);

  useEffect(() => {
    if (spoilerShield) setRevealedSpoilerKey(null);
    setSpoilerConfirmOpen(false);
  }, [spoilerShield]);

  useEffect(() => {
    if (currentTimeLayerId === ALL_TIME_LAYERS_ID) return;
    if (!timeLayers.some((layer) => layer.id === currentTimeLayerId)) {
      setCurrentTimeLayerId(ALL_TIME_LAYERS_ID);
    }
  }, [currentTimeLayerId, timeLayers]);

  // Auto-open inspector panel when a node or edge is selected
  useEffect(() => {
    if (selectedCharId || selectedRelId || selectedStickyNoteId || selectedGroupRangeId || selectedEvidenceImageId) {
      if (tabletShell) {
        setSidebarOpen(false);
        return;
      }
      setInspectorOpen(true);
    }
  }, [selectedCharId, selectedRelId, selectedStickyNoteId, selectedGroupRangeId, selectedEvidenceImageId, tabletShell]);

  useEffect(() => {
    if (tabletShell && activeBookId) setSidebarOpen(false);
  }, [activeBookId, tabletShell]);

  // fitView ref — populated by CalabashCanvas on mount
  const fitViewRef = useRef<((opts?: { padding?: number }) => void) | undefined>(undefined);
  const handleFitViewReady = useCallback((fn: () => void) => {
    fitViewRef.current = fn;
  }, []);

  // Layout ref — populated by CalabashCanvas (layout logic lives there for direct rfNodes access)
  const layoutRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const handleLayoutReady = useCallback((fn: () => Promise<void>) => {
    layoutRef.current = fn;
  }, []);

  async function handleExport() {
    try {
      const data = await exportLibraryAsJson();
      const text = JSON.stringify(data, null, 2);
      const fileName = `calabash-library-${new Date().toISOString().slice(0, 10)}.calabash.json`;

      if (isDesktopRuntime()) {
        const path = await saveDesktopTextFile({
          title: t('app.exportLibrary'),
          defaultPath: fileName,
          text,
        });
        if (path) showToast(t('app.exportSaved', { path }));
        return;
      }

      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export Calabash library', error);
      alert(t('app.exportFailed'));
    }
  }

  async function handleExportTemplate() {
    if (!activeBookId) return;
    try {
      const data = await exportBookTemplateAsJson(activeBookId);
      const text = JSON.stringify(data, null, 2);
      const fileName = `calabash-template-${slugifyFilePart(data.book.title)}-${new Date().toISOString().slice(0, 10)}.calabash-template.json`;

      if (isDesktopRuntime()) {
        const path = await saveDesktopTextFile({
          title: t('app.exportTemplate'),
          defaultPath: fileName,
          text,
        });
        if (path) showToast(t('app.exportSaved', { path }));
        return;
      }

      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export Calabash template', error);
      alert(t('app.exportTemplateFailed'));
    }
  }

  async function handleImport() {
    if (isDesktopRuntime()) {
      try {
        const selected = await openDesktopJsonFile(t('app.importLibrary'));
        if (selected) await handleImportText(selected.text);
      } catch (error) {
        console.error('Failed to import Calabash JSON from desktop file dialog', error);
        alert(t('app.invalidImport'));
      }
      return;
    }

    libraryImportInputRef.current?.click();
  }

  async function handleImportFile(file: File) {
    await handleImportText(await file.text());
  }

  async function handleImportText(text: string) {
    try {
      const payload = JSON.parse(text);
      if (isLibraryExport(payload)) {
        let backupPath: string | null = null;
        if (isDesktopRuntime()) {
          try {
            const currentLibrary = await exportLibraryAsJson();
            backupPath = await saveDesktopLibraryBackup(JSON.stringify(currentLibrary, null, 2));
          } catch (error) {
            console.error('Failed to create Calabash import backup', error);
            alert(t('app.importBackupFailed'));
            return;
          }
        }

        const result = await importLibraryFromJson(payload);
        await refreshUsers();
        if (result.activeUserId) setActiveUser(result.activeUserId);
        if (result.activeBookId) setActiveBook(result.activeBookId);
        showToast(backupPath ? t('app.importCompleteWithBackup', { path: backupPath }) : t('app.importComplete'));
        return;
      }
      const newBookId = await importBookFromJson(payload, activeUserId ?? undefined);
      setActiveBook(newBookId);
      showToast(t('app.importComplete'));
    } catch {
      alert(t('app.invalidImport'));
    }
  }

  function applyBookShell(book: Book) {
    setCurrentChapter(book.currentChapter);
    setTotalChapters(book.totalChapters);
    setSpoilerShield(book.spoilerShield);
    setSpoilerChapters(book.spoilerChapters);
    setHighlightedChapters(book.highlightedChapters);
    const nextTimeLayers = book.timeLayers ?? [];
    setTimeLayers(nextTimeLayers);
    setCurrentTimeLayerId(resolveDefaultTimeLayerId(nextTimeLayers, book.defaultTimeLayerId));
  }

  async function handleCreateStarterBook() {
    if (!activeUserId) return;
    const book = await createBook({
      userId: activeUserId,
      title: t('app.starterBlankBookTitle'),
      totalChapters: 30,
      spoilerShield: false,
    });
    setActiveBook(book.id);
    applyBookShell(book);
    setCharacters([]);
    setRelationships([]);
    setStickyNotes([]);
    setGroupRanges([]);
    setEvidenceImages([]);
    setCurrentTimeLayerId(ALL_TIME_LAYERS_ID);
  }

  async function handleCreateTutorialBook(kind: TutorialKind = 'ackroyd') {
    if (!activeUserId) return;
    const newBookId = await seedTutorialBook({ userId: activeUserId, language: resolvedLanguage, kind });
    const book = await getBook(newBookId);
    setCharacterNodeViewMode(getTutorialDefaultViewMode(kind));
    setActiveBook(newBookId);
    if (book) applyBookShell(book);
    setCharacters([]);
    setRelationships([]);
    setStickyNotes([]);
    setGroupRanges([]);
    setEvidenceImages([]);
  }

  function closeOnboarding() {
    try { localStorage.setItem(ONBOARDING_SEEN_KEY, 'true'); } catch { /* test env */ }
    setOnboardingOpen(false);
  }

  const scopedTimeLayerId = currentTimeLayerId === ALL_TIME_LAYERS_ID ? null : currentTimeLayerId;

  // Add sticky note at canvas centre, with undo support
  async function handleAddStickyNote() {
    if (!activeBookId) return;
    const note = await createAnnotation({
      bookId: activeBookId,
      content: '',
      position: { x: (Math.random() - 0.5) * 200, y: (Math.random() - 0.5) * 200 },
      chapterIntroduced: currentChapter,
      timeLayerId: scopedTimeLayerId,
    });
    addStickyNote(note);
    pushUndo(
      async () => { await deleteAnnotation(note.id); removeStickyNote(note.id); },
      async () => { await restoreAnnotation(note); addStickyNote(note); },
    );
  }

  async function handleAddGroupRange() {
    if (!activeBookId) return;
    const range = await createGroupRange({
      bookId: activeBookId,
      label: t('groupRange.defaultLabel'),
      position: { x: -180 + (Math.random() - 0.5) * 120, y: -110 + (Math.random() - 0.5) * 120 },
      chapterIntroduced: currentChapter,
      timeLayerId: scopedTimeLayerId,
    });
    addGroupRange(range);
    setSelectedCharId(null);
    setSelectedRelId(null);
    setSelectedStickyNoteId(null);
    setSelectedGroupRangeId(range.id);
    setSelectedEvidenceImageId(null);
    pushUndo(
      async () => { await deleteGroupRange(range.id); removeGroupRange(range.id); },
      async () => { await restoreGroupRange(range); addGroupRange(range); },
    );
  }

  const handleEvidenceImageFile = useCallback(async (
    file: File,
    options?: { title?: string; kind?: EvidenceImageKind },
  ) => {
    if (!activeBookId || !file.type.startsWith('image/')) return;
    const dataUrl = await readFileAsDataUrl(file);
    const dimensions = await loadImageDimensions(dataUrl);
    const size = fitEvidenceImageSize(dimensions);
    const kind = options?.kind ?? inferEvidenceImageKind(file.name);
    const image = await createEvidenceImage({
      bookId: activeBookId,
      title: options?.title ?? titleFromFileName(file.name),
      kind,
      dataUrl,
      mimeType: file.type,
      width: size.width,
      height: size.height,
      position: {
        x: -Math.round(size.width / 2) + (Math.random() - 0.5) * 120,
        y: -Math.round(size.height / 2) + (Math.random() - 0.5) * 120,
      },
      chapterIntroduced: currentChapter,
      timeLayerId: scopedTimeLayerId,
      layer: kind === 'floorPlan' ? 'background' : 'board',
    });
    addEvidenceImage(image);
    setSelectedCharId(null);
    setSelectedRelId(null);
    setSelectedStickyNoteId(null);
    setSelectedGroupRangeId(null);
    setSelectedEvidenceImageId(image.id);
    pushUndo(
      async () => { await deleteEvidenceImage(image.id); removeEvidenceImage(image.id); },
      async () => { await restoreEvidenceImage(image); addEvidenceImage(image); },
    );
  }, [activeBookId, addEvidenceImage, currentChapter, pushUndo, removeEvidenceImage, scopedTimeLayerId]);

  useEffect(() => {
    async function handlePaste(e: ClipboardEvent) {
      if (!activeBookId || isTextEditingTarget(e.target)) return;
      const item = Array.from(e.clipboardData?.items ?? []).find((candidate) => (
        candidate.kind === 'file' && candidate.type.startsWith('image/')
      ));
      const file = item?.getAsFile();
      if (!file) return;
      e.preventDefault();
      await handleEvidenceImageFile(file, {
        title: t('evidenceImage.pastedTitle'),
        kind: 'screenshot',
      });
    }

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activeBookId, handleEvidenceImageFile, t]);

  const chapterHasAutomaticSpoilers = useMemo(
    () => hasSpoilerSensitiveRoleAtChapter(characters, currentChapter),
    [characters, currentChapter],
  );
  const chapterManuallyProtected = spoilerChapters.includes(currentChapter);
  const currentChapterHighlighted = highlightedChapters.includes(currentChapter);
  const chapterProtected = chapterHasAutomaticSpoilers || chapterManuallyProtected;
  const currentSpoilerKey = activeBookId && chapterProtected
    ? `${activeBookId}:${currentChapter}`
    : null;
  const spoilerShieldCoverActive =
    spoilerShield &&
    currentSpoilerKey !== null &&
    revealedSpoilerKey !== currentSpoilerKey;
  const shieldButtonActive = spoilerShield && currentSpoilerKey !== null;
  const shieldButtonGuarding = spoilerShieldCoverActive;
  const chapterMarks = useMemo<ChapterSliderMark[]>(() => {
    const next = new Map<number, ChapterSliderMark>();
    const addReveal = (chapter: number) => {
      if (chapter < 1 || chapter > totalChapters || next.has(chapter)) return;
      next.set(chapter, {
        chapter,
        kind: 'reveal',
        label: t('app.sliderRevealMark', { chapter }),
      });
    };

    relationships.forEach((relationship) => addReveal(relationship.chapterRevealed));
    characters.forEach((character) => {
      character.roleReveals?.forEach((reveal) => addReveal(reveal.chapterRevealed));
    });
    spoilerChapters.forEach((chapter) => {
      if (chapter < 1 || chapter > totalChapters) return;
      next.set(chapter, {
        chapter,
        kind: 'protected',
        label: t('app.sliderProtectedMark', { chapter }),
      });
    });
    highlightedChapters.forEach((chapter) => {
      if (chapter < 1 || chapter > totalChapters || next.get(chapter)?.kind === 'protected') return;
      next.set(chapter, {
        chapter,
        kind: 'highlight',
        label: t('app.sliderHighlightMark', { chapter }),
      });
    });

    return [...next.values()].sort((a, b) => a.chapter - b.chapter);
  }, [characters, relationships, spoilerChapters, highlightedChapters, totalChapters, t]);

  async function handleToggleSpoilerShield() {
    if (!activeBookId) return;

    const action = getSpoilerShieldToolbarAction({
      activeBookId,
      spoilerShield,
      spoilerShieldCoverActive,
      currentSpoilerKey,
      revealedSpoilerKey,
      chapterProtected,
    });

    if (action === 'prompt-reveal') {
      setSpoilerConfirmOpen(true);
      return;
    }
    if (action === 'cover-current-reveal') {
      setRevealedSpoilerKey(null);
      setSpoilerConfirmOpen(false);
      return;
    }
    if (action === 'none') return;

    if (action === 'protect-current-chapter') {
      const nextChapters = addSpoilerChapter(spoilerChapters, currentChapter);
      setSpoilerChapters(nextChapters);
      setSpoilerShield(true);
      setRevealedSpoilerKey(null);
      setSpoilerConfirmOpen(false);
      await updateBook(activeBookId, { spoilerShield: true, spoilerChapters: nextChapters });
      return;
    }

    setSpoilerShield(true);
    setRevealedSpoilerKey(null);
    setSpoilerConfirmOpen(false);
    await updateBook(activeBookId, { spoilerShield: true });
  }

  async function handleRemoveCurrentChapterProtection() {
    if (!activeBookId) return;
    const nextChapters = removeSpoilerChapter(spoilerChapters, currentChapter);
    setSpoilerChapters(nextChapters);
    setRevealedSpoilerKey(null);
    setSpoilerConfirmOpen(false);
    await updateBook(activeBookId, { spoilerChapters: nextChapters });
  }

  async function handleToggleCurrentChapterHighlight() {
    if (!activeBookId) return;
    const nextChapters = currentChapterHighlighted
      ? highlightedChapters.filter((chapter) => chapter !== currentChapter)
      : [...highlightedChapters, currentChapter];
    const normalized = [...new Set(nextChapters)].sort((a, b) => a - b);
    setHighlightedChapters(normalized);
    await updateBook(activeBookId, { highlightedChapters: normalized });
  }

  useEffect(() => {
    if (!spoilerShieldCoverActive) setSpoilerConfirmOpen(false);
  }, [spoilerShieldCoverActive]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    fitView: () => fitViewRef.current?.(),
    onNewCharacter: () => setNewCharacterRequestId((id) => id + 1),
    onStartEdge: () => {
      setStartEdgeSourceId(selectedCharId);
      setStartEdgeRequestId((id) => id + 1);
    },
    openSearch: () => setSearchOpen(true),
  });

  function toggleSidebarPanel() {
    setSidebarOpen((open) => {
      const next = !open;
      if (tabletShell && next) setInspectorOpen(false);
      return next;
    });
  }

  function toggleInspectorPanel() {
    setInspectorOpen((open) => {
      const next = !open;
      if (tabletShell && next) setSidebarOpen(false);
      return next;
    });
  }

  function closeTabletPanels() {
    setSidebarOpen(false);
    setInspectorOpen(false);
  }

  function handleTimeLayerChange(id: string) {
    setCurrentTimeLayerId(id);
    setSelectedCharId(null);
    setSelectedRelId(null);
    setSelectedStickyNoteId(null);
    setSelectedGroupRangeId(null);
    setSelectedEvidenceImageId(null);
  }

  async function handleSaveTimeLayers(nextLayers: TimeLayer[]) {
    if (!activeBookId) return;
    setTimeLayerSaving(true);

    try {
      const nextLayerIds = new Set(nextLayers.map((layer) => layer.id));
      const removedLayerIds = new Set(
        timeLayers
          .filter((layer) => !nextLayerIds.has(layer.id))
          .map((layer) => layer.id),
      );

      const updatedBook = await updateBook(activeBookId, { timeLayers: nextLayers });
      const normalizedLayers = updatedBook.timeLayers ?? [];
      const normalizedLayerIds = new Set(normalizedLayers.map((layer) => layer.id));
      setTimeLayers(normalizedLayers);
      setActiveBookSummary(updatedBook);

      if (removedLayerIds.size > 0) {
        const hasRemovedLayer = (id?: string | null): id is string => Boolean(id && removedLayerIds.has(id));
        const stripRemovedLayerPositions = (positions?: Record<string, { x: number; y: number }>) => {
          if (!positions) return { changed: false, positions: undefined };
          const nextPositions = Object.fromEntries(
            Object.entries(positions).filter(([layerId]) => !removedLayerIds.has(layerId)),
          );
          return {
            changed: Object.keys(nextPositions).length !== Object.keys(positions).length,
            positions: Object.keys(nextPositions).length > 0 ? nextPositions : undefined,
          };
        };
        await Promise.all([
          ...characters.filter((character) => {
            const stripped = stripRemovedLayerPositions(character.timeLayerPositions);
            return hasRemovedLayer(character.timeLayerId) || stripped.changed;
          }).map(async (character) => {
            const stripped = stripRemovedLayerPositions(character.timeLayerPositions);
            const updated = await updateCharacter(character.id, {
              ...(hasRemovedLayer(character.timeLayerId) ? { timeLayerId: null } : {}),
              ...(stripped.changed ? { timeLayerPositions: stripped.positions } : {}),
            });
            updateCharacterInStore(updated);
          }),
          ...relationships.filter((rel) => hasRemovedLayer(rel.timeLayerId)).map(async (rel) => {
            const updated = await updateRelationship(rel.id, { timeLayerId: null });
            updateRelationshipInStore(updated);
          }),
          ...stickyNotes.filter((note) => hasRemovedLayer(note.timeLayerId)).map(async (note) => {
            const updated = await updateAnnotation(note.id, { timeLayerId: null });
            updateStickyNoteInStore(updated);
          }),
          ...groupRanges.filter((range) => hasRemovedLayer(range.timeLayerId)).map(async (range) => {
            const updated = await updateGroupRange(range.id, { timeLayerId: null });
            updateGroupRangeInStore(updated);
          }),
          ...evidenceImages.filter((image) => hasRemovedLayer(image.timeLayerId)).map(async (image) => {
            const updated = await updateEvidenceImage(image.id, { timeLayerId: null });
            updateEvidenceImageInStore(updated);
          }),
        ]);
      }

      if (currentTimeLayerId !== ALL_TIME_LAYERS_ID && !normalizedLayerIds.has(currentTimeLayerId)) {
        handleTimeLayerChange(ALL_TIME_LAYERS_ID);
      }

      setTimeLayerManagerOpen(false);
      showToast(t('timeLayer.saved'));
    } catch (error) {
      console.error('Failed to save time layers', error);
      showToast(t('timeLayer.saveFailed'));
    } finally {
      setTimeLayerSaving(false);
    }
  }

  if (phoneShell) {
    return (
      <div
        className="app-shell app-shell--phone app-shell--touch"
        style={{
          width: '100vw',
          minHeight: 'var(--app-viewport-height)',
          background: 'var(--bg-canvas)',
          color: 'var(--ink-900)',
          fontFamily: 'var(--font-ui)',
        }}
      >
        <PhoneFallback
          activeUserId={activeUserId}
          onExportLibrary={() => void handleExport()}
          onImportLibrary={() => void handleImport()}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <input
          ref={libraryImportInputRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImportFile(file);
            e.target.value = '';
          }}
        />
        {settingsOpen && (
          <SettingsPanel
            onClose={() => setSettingsOpen(false)}
            onExportLibrary={() => void handleExport()}
            onImportLibrary={() => void handleImport()}
            onOpenOnboarding={() => setOnboardingOpen(true)}
            onCreateTutorial={(kind) => void handleCreateTutorialBook(kind)}
          />
        )}
        {toastMessage && (
          <div role="status" aria-live="polite" style={toastStyle}>
            {toastMessage}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={[
        'app-shell',
        tabletShell ? 'app-shell--tablet' : '',
        touchOptimized ? 'app-shell--touch' : '',
        tabletShell && (sidebarOpen || inspectorOpen) ? 'app-shell--panel-open' : '',
      ].filter(Boolean).join(' ')}
      style={{
        display: 'flex',
        width: '100vw',
        height: 'var(--app-viewport-height)',
        overflow: 'hidden',
        background: 'var(--bg-canvas)',
        color: 'var(--ink-900)',
        fontFamily: 'var(--font-ui)',
        position: 'relative',
      }}
    >
      {/* Left sidebar */}
      <aside
        className={`app-sidebar ${sidebarOpen ? 'app-sidebar--open' : ''}`}
        style={{
          width: sidebarOpen ? 264 : 0,
          minWidth: 0,
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'width var(--transition-panel)',
          borderRight: sidebarOpen ? '1px solid var(--ink-200)' : 'none',
        }}
      >
        <div style={{ width: 264, height: '100%', background: 'var(--bg-panel)', display: 'flex', flexDirection: 'column' }}>
          {/* App title */}
          <div
            style={{
              padding: '18px 18px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div style={{ color: 'var(--accent)', flexShrink: 0 }}>
              <CalabashLogo size={30} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--font-case-title)',
                  fontSize: 22,
                  fontWeight: 400,
                  color: 'var(--ink-900)',
                  letterSpacing: '0',
                  lineHeight: 1.1,
                }}
              >
                Calabash
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-500)',
                }}
              >
                {t('app.subtitle')}
              </div>
            </div>
          </div>

          <div style={{ padding: '4px 14px 12px' }}>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 10px',
                background: 'var(--bg-canvas)',
                border: '1px solid var(--ink-200)',
                borderRadius: 5,
                color: 'var(--ink-500)',
                fontSize: 12,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Search size={13} />
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t('app.search')}
              </span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10.5,
                  color: 'var(--ink-400)',
                  letterSpacing: '0.04em',
                }}
              >
                /
              </span>
            </button>
          </div>

          {/* Book list */}
          <BookList />

          <div
            style={{
              borderTop: '1px solid var(--ink-150)',
              padding: '8px 10px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 6,
            }}
          >
            <button
              type="button"
              onClick={() => void handleExport()}
              style={sidebarUtilityButtonStyle}
              title={t('app.exportLibrary')}
              aria-label={t('app.exportLibrary')}
            >
              <Download size={13} />
              <span>{t('app.export')}</span>
            </button>
            <button
              type="button"
              onClick={() => void handleImport()}
              style={sidebarUtilityButtonStyle}
              title={t('app.importLibrary')}
              aria-label={t('app.importLibrary')}
            >
              <Upload size={13} />
              <span>{t('app.import')}</span>
            </button>
            <button
              type="button"
              disabled={!activeBookId}
              onClick={() => void handleExportTemplate()}
              style={{
                ...sidebarUtilitySecondaryButtonStyle,
                opacity: activeBookId ? 1 : 0.45,
                cursor: activeBookId ? 'pointer' : 'not-allowed',
              }}
              title={t('app.exportTemplate')}
              aria-label={t('app.exportTemplate')}
            >
              <FileText size={13} />
              <span>{t('app.exportCurrentBook')}</span>
            </button>
            <input
              ref={libraryImportInputRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImportFile(file);
                e.target.value = '';
              }}
            />
          </div>

          <div style={{ borderTop: '1px solid var(--ink-200)' }}>
            <div
              style={{
                height: 52,
                padding: '8px 10px',
                color: 'var(--ink-600)',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <button
                onClick={() => setSettingsOpen(true)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: 5,
                  padding: '6px 10px',
                  cursor: 'pointer',
                  color: 'var(--ink-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 400,
                }}
                title={t('app.settings')}
                aria-label={t('app.settings')}
              >
                <SettingsIcon size={13} />
                {t('app.settings')}
              </button>
              <button
                onClick={toggleTheme}
                style={{
                  background: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: 5,
                  width: 30,
                  height: 30,
                  cursor: 'pointer',
                  color: 'var(--ink-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
                title={t('app.switchTheme')}
                aria-label={t('app.switchTheme')}
              >
                {theme === 'light' ? <Moon size={13} /> : <Sun size={13} />}
              </button>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                title="GitHub"
                aria-label="GitHub"
                style={{
                  width: 30,
                  height: 30,
                  background: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: 5,
                  color: 'var(--ink-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                }}
              >
                <Github size={14} />
              </a>
            </div>
          </div>
        </div>
      </aside>

      <button
        type="button"
        className="app-panel-scrim"
        aria-label="Close panels"
        onClick={closeTabletPanels}
      />

      {/* Centre canvas area — flex-grow */}
      <main
        className="app-main"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-canvas)',
          overflow: 'hidden',
        }}
      >
        {/* Top toolbar */}
        <div
          className="top-toolbar"
          style={{
            height: 48,
            flexShrink: 0,
            borderBottom: '1px solid var(--ink-200)',
            background: 'var(--bg-panel)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 12px',
            zIndex: 1,
            containerType: 'inline-size',
          }}
        >
          {/* Sidebar toggle */}
          <button
            className="toolbar-btn"
            onClick={toggleSidebarPanel}
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            style={{
              ...toolbarBtnStyle,
              padding: 0,
              minWidth: 30,
              color: sidebarOpen ? 'var(--ink-900)' : 'var(--ink-600)',
              background: sidebarOpen ? 'var(--bg-hover)' : 'transparent',
              borderColor: sidebarOpen ? 'var(--ink-200)' : 'transparent',
            }}
          >
            <PanelLeft size={15} />
          </button>

          <div className="toolbar-cluster" style={toolbarClusterStyle}>
            <button
              className="toolbar-btn toolbar-primary-btn"
              onClick={() => setNewCharacterRequestId((id) => id + 1)}
              disabled={!activeBookId}
              title={`${t('app.addCharacter')} (N)`}
              style={primaryToolbarBtnStyle}
            >
              <UserPlus size={13} />
              <span className="toolbar-label">{t('app.addCharacter')}</span>
              <span
                className="toolbar-shortcut"
                style={{
                  marginLeft: 2,
                  padding: '1px 5px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9.5,
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  color: 'rgba(255,255,255,0.78)',
                  borderRadius: 3,
                }}
              >
                N
              </span>
            </button>

            {/* Sticky note */}
            <button
              className="toolbar-btn"
              onClick={() => void handleAddStickyNote()}
              disabled={!activeBookId}
              title={t('app.note')}
              style={{ ...toolbarBtnStyle, border: 'none' }}
            >
              <StickyNote size={13} />
              <span className="toolbar-label">{t('app.note')}</span>
            </button>

            <button
              className="toolbar-btn"
              onClick={() => void handleAddGroupRange()}
              disabled={!activeBookId}
              title={t('app.range')}
              style={{ ...toolbarBtnStyle, border: 'none' }}
            >
              <CircleDashed size={13} />
              <span className="toolbar-label">{t('app.range')}</span>
            </button>

            <button
              className="toolbar-btn"
              onClick={() => evidenceImageInputRef.current?.click()}
              disabled={!activeBookId}
              title={t('app.image')}
              style={{ ...toolbarBtnStyle, border: 'none' }}
            >
              <ImageIcon size={13} />
              <span className="toolbar-label">{t('app.image')}</span>
            </button>
            <input
              ref={evidenceImageInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleEvidenceImageFile(file);
                e.target.value = '';
              }}
            />
          </div>

          <div className="toolbar-history-cluster" style={historyClusterStyle}>
            {/* Undo */}
            <button
              className="toolbar-btn"
              onClick={() => void undo()}
              disabled={undoStack.length === 0}
              title="Undo (Ctrl+Z)"
              style={{ ...toolbarBtnStyle, padding: 0, minWidth: 28, height: 26, border: 'none', borderRadius: 0 }}
            >
              <Undo2 size={14} />
            </button>
            <div style={{ width: 1, height: 16, background: 'var(--ink-200)' }} />
            {/* Redo */}
            <button
              className="toolbar-btn"
              onClick={() => void redo()}
              disabled={redoStack.length === 0}
              title="Redo (Ctrl+Shift+Z)"
              style={{ ...toolbarBtnStyle, padding: 0, minWidth: 28, height: 26, border: 'none', borderRadius: 0 }}
            >
              <Redo2 size={14} />
            </button>
          </div>

          <BoardStyleSwitcher
            value={characterNodeViewMode}
            onChange={setCharacterNodeViewMode}
            t={t}
          />

          <TimeLayerSwitcher
            layers={timeLayers}
            value={currentTimeLayerId}
            onChange={handleTimeLayerChange}
            onManage={() => setTimeLayerManagerOpen(true)}
            disabled={!activeBookId}
            t={t}
          />

          <div
            className="toolbar-book-title"
            style={{
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'baseline',
              gap: 8,
              minWidth: 0,
              marginLeft: 8,
              padding: '0 20px',
              pointerEvents: 'none',
              overflow: 'hidden',
            }}
          >
            <span
              className="toolbar-book-name"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 15,
                color: 'var(--ink-900)',
                letterSpacing: '-0.005em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 140,
                maxWidth: 280,
              }}
            >
              {activeBookSummary?.title ?? t('app.noActiveBook')}
            </span>
            {activeBookSummary?.author && (
              <>
                <span style={{ color: 'var(--ink-400)' }}>·</span>
                <span
                  className="toolbar-book-author"
                  style={{
                    fontSize: 11,
                    color: 'var(--ink-500)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 120,
                  }}
                >
                  {activeBookSummary.author}
                </span>
              </>
            )}
          </div>

          {/* Auto-layout */}
          <button
            className="toolbar-btn"
            onClick={() => void layoutRef.current?.()}
            disabled={!activeBookId}
            title="Auto-layout — rearrange all visible nodes"
            data-toolbar-action="layout"
            style={toolbarBtnStyle}
          >
            <LayoutGrid size={13} />
            <span className="toolbar-label">{t('app.layout')}</span>
          </button>

          {/* Spoiler Shield */}
          <button
            className="toolbar-btn"
            onClick={() => void handleToggleSpoilerShield()}
            disabled={!activeBookId}
            title={
              shieldButtonGuarding
                ? t('app.revealProtectedChapter')
                : spoilerShield && currentSpoilerKey !== null && revealedSpoilerKey === currentSpoilerKey
                  ? t('app.coverChapterAgain')
                : chapterProtected
                  ? t('app.enableShield')
                  : t('app.protectCurrentChapter', { chapter: currentChapter })
            }
            style={{
              ...toolbarBtnStyle,
              color: shieldButtonActive ? 'var(--accent)' : 'var(--ink-600)',
              borderColor: shieldButtonActive ? 'color-mix(in srgb, var(--accent) 36%, transparent)' : 'transparent',
              background: shieldButtonActive ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
            }}
          >
            {shieldButtonGuarding ? <ShieldOff size={13} /> : <Shield size={13} />}
            <span className="toolbar-label">{t('app.shield')}</span>
          </button>

          <div className="toolbar-divider" style={dividerStyle} />

          {/* Inspector toggle */}
          <button
            className="toolbar-btn"
            onClick={toggleInspectorPanel}
            title={inspectorOpen ? 'Hide inspector' : 'Show inspector'}
            style={{
              ...toolbarBtnStyle,
              padding: 0,
              minWidth: 30,
              color: inspectorOpen ? 'var(--ink-900)' : 'var(--ink-600)',
              background: inspectorOpen ? 'var(--bg-hover)' : 'transparent',
              borderColor: inspectorOpen ? 'var(--ink-200)' : 'transparent',
            }}
          >
            <PanelRight size={15} />
          </button>
        </div>

        {/* Canvas fills remaining space */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {loading ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--ink-500)',
                fontSize: 14,
                gap: 10,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                  <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                </path>
              </svg>
              {t('app.loading')}
            </div>
          ) : activeBookId === null ? (
            <div style={{
              display: 'grid',
              placeItems: 'center',
              height: '100%',
              color: 'var(--ink-600)',
              fontSize: 13,
              textAlign: 'center',
              padding: 32,
              overflowY: 'auto',
            }}>
              <div style={{ width: 'min(820px, 100%)' }}>
                <div
                  aria-label={t('app.emptyStamp')}
                  style={{
                    width: 60,
                    height: 60,
                    margin: '0 auto 14px',
                    borderRadius: 999,
                    background: 'color-mix(in srgb, var(--accent) 8%, var(--bg-panel))',
                    border: '1.5px solid color-mix(in srgb, var(--accent) 32%, var(--ink-200))',
                    display: 'grid',
                    placeItems: 'center',
                    boxShadow: 'var(--shadow-soft)',
                  }}
                >
                  <CalabashLogo size={42} title={t('app.emptyStamp')} />
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-case-title)',
                    fontSize: 30,
                    color: 'var(--ink-800)',
                    letterSpacing: 0,
                    lineHeight: 1.1,
                  }}
                >
                  {t('app.emptyTitle')}
                </div>
                <div style={{ maxWidth: 560, margin: '10px auto 0', lineHeight: 1.6 }}>
                  {t('app.emptyBody')}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
                    gap: 12,
                    marginTop: 24,
                    alignItems: 'stretch',
                  }}
                >
                  <StarterActionCard
                    icon={<FilePlus2 size={16} />}
                    title={t('app.starterBlankTitle')}
                    body={t('app.starterBlankBody')}
                    action={t('app.starterBlankAction')}
                    onClick={() => void handleCreateStarterBook()}
                    disabled={!activeUserId}
                  />
                  <StarterActionCard
                    tone="green"
                    icon={<LayoutGrid size={16} />}
                    title={t('app.starterContestTitle')}
                    body={t('app.starterContestBody')}
                    action={t('app.starterContestAction')}
                    onClick={() => void handleCreateTutorialBook('contest')}
                    disabled={!activeUserId}
                  />
                  <StarterActionCard
                    tone="blue"
                    icon={<BookOpen size={16} />}
                    title={t('app.starterAckroydTitle')}
                    body={t('app.starterAckroydBody')}
                    action={t('onboarding.createAckroydTutorial')}
                    onClick={() => void handleCreateTutorialBook('ackroyd')}
                    disabled={!activeUserId}
                  />
                  <StarterActionCard
                    tone="violet"
                    icon={<UserPlus size={16} />}
                    title={t('app.starterHidaTitle')}
                    body={t('app.starterHidaBody')}
                    action={t('onboarding.createHidaTutorial')}
                    onClick={() => void handleCreateTutorialBook('hida')}
                    disabled={!activeUserId}
                  />
                  <StarterActionCard
                    tone="ochre"
                    icon={<Clock3 size={16} />}
                    title={t('app.starterSevenDeathsTitle')}
                    body={t('app.starterSevenDeathsBody')}
                    action={t('onboarding.createSevenDeathsTutorial')}
                    onClick={() => void handleCreateTutorialBook('sevenDeaths')}
                    disabled={!activeUserId}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleImport()}
                  style={{
                    marginTop: 16,
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    fontSize: 12.5,
                    fontWeight: 700,
                    textDecoration: 'underline',
                    textUnderlineOffset: 3,
                  }}
                >
                  {t('app.starterImportLink')}
                </button>
                <div style={{ maxWidth: 640, margin: '18px auto 0', color: 'var(--ink-500)', fontSize: 12, lineHeight: 1.55 }}>
                  {t('app.starterLocalHint')}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  filter: spoilerShieldCoverActive ? 'blur(9px)' : 'none',
                  transform: 'translateZ(0)',
                  transition: 'filter 160ms ease',
                  pointerEvents: spoilerShieldCoverActive ? 'none' : 'auto',
                }}
              >
                <CalabashCanvas
                  characters={characters}
                  relationships={relationships}
                  stickyNotes={stickyNotes}
                  groupRanges={groupRanges}
                  evidenceImages={evidenceImages}
                  characterNodeViewMode={characterNodeViewMode}
                  currentChapter={currentChapter}
                  currentTimeLayerId={currentTimeLayerId}
                  timeLayers={timeLayers}
                  bookId={activeBookId}
                  newCharacterRequestId={newCharacterRequestId}
                  startEdgeRequestId={startEdgeRequestId}
                  startEdgeSourceId={startEdgeSourceId}
                  touchMode={touchOptimized}
                  onRequestInspector={() => {
                    setSidebarOpen(false);
                    setInspectorOpen(true);
                  }}
                  onNodeSelect={(id) => {
                    setSelectedCharId(id);
                    if (id) {
                      setSelectedRelId(null);
                      setSelectedStickyNoteId(null);
                      setSelectedGroupRangeId(null);
                      setSelectedEvidenceImageId(null);
                    }
                  }}
                  onEdgeSelect={(id) => {
                    setSelectedRelId(id);
                    if (id) {
                      setSelectedCharId(null);
                      setSelectedStickyNoteId(null);
                      setSelectedGroupRangeId(null);
                      setSelectedEvidenceImageId(null);
                    }
                  }}
                  onStickyNoteSelect={(id) => {
                    setSelectedStickyNoteId(id);
                    if (id) {
                      setSelectedCharId(null);
                      setSelectedRelId(null);
                      setSelectedGroupRangeId(null);
                      setSelectedEvidenceImageId(null);
                    }
                  }}
                  onGroupRangeSelect={(id) => {
                    setSelectedGroupRangeId(id);
                    if (id) {
                      setSelectedCharId(null);
                      setSelectedRelId(null);
                      setSelectedStickyNoteId(null);
                      setSelectedEvidenceImageId(null);
                    }
                  }}
                  onEvidenceImageSelect={(id) => {
                    setSelectedEvidenceImageId(id);
                    if (id) {
                      setSelectedCharId(null);
                      setSelectedRelId(null);
                      setSelectedStickyNoteId(null);
                      setSelectedGroupRangeId(null);
                    }
                  }}
                  onFitViewReady={handleFitViewReady}
                  onLayoutReady={handleLayoutReady}
                />
              </div>
              {timeLayers.length > 0 && !spoilerShieldCoverActive && (
                <TimeLayerRail
                  layers={timeLayers}
                  value={currentTimeLayerId}
                  onChange={handleTimeLayerChange}
                  t={t}
                />
              )}
              {spoilerShieldCoverActive && (
                <button
                  onClick={() => setSpoilerConfirmOpen(true)}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 20,
                  border: 'none',
                    background: 'color-mix(in srgb, var(--bg-canvas) 70%, transparent)',
                    color: 'var(--ink-900)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 10,
                    font: 'inherit',
                  }}
                >
                  <Shield size={28} color="var(--accent)" />
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500 }}>{t('app.spoilerShield')}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>
                    {t('app.spoilerCoverBody', { chapter: currentChapter })}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Chapter slider */}
        {activeBookId !== null && (
          <ChapterSlider
            bookId={activeBookId}
            totalChapters={totalChapters}
            currentChapter={currentChapter}
            currentChapterHighlighted={currentChapterHighlighted}
            marks={chapterMarks}
            onChange={setCurrentChapter}
            onCommit={(n) => void setCurrentChapterAndPersist(activeBookId, n)}
            onToggleCurrentChapterHighlight={() => void handleToggleCurrentChapterHighlight()}
            onTotalChaptersChange={async (n) => {
              try {
                const updated = await updateBook(activeBookId, { totalChapters: n });
                setTotalChapters(updated.totalChapters);
              } catch (error) {
                if (error instanceof ChapterTotalTooLowError) {
                  showToast(t('chapterSlider.totalTooLow', { minimum: error.minimumTotalChapters }));
                  return;
                }
                console.error('Failed to update total chapters', error);
                showToast(t('chapterSlider.totalUpdateFailed'));
              }
            }}
          />
        )}
      </main>

      {/* Right inspector panel */}
      <aside
        className={`app-inspector ${inspectorOpen ? 'app-inspector--open' : ''}`}
        style={{
          width: inspectorOpen ? 340 : 0,
          minWidth: 0,
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'width var(--transition-panel)',
          borderLeft: inspectorOpen ? '1px solid var(--ink-200)' : 'none',
        }}
      >
        <div style={{ width: 340, height: '100%', background: 'var(--bg-panel)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {selectedCharId && activeBookId ? (
              <CharacterInspector
                characterId={selectedCharId}
                bookId={activeBookId}
                timeLayers={timeLayers}
                onDeleted={() => setSelectedCharId(null)}
                onDuplicated={(id) => setSelectedCharId(id)}
              />
            ) : selectedRelId && activeBookId ? (
              <RelationshipInspector
                relationshipId={selectedRelId}
                bookId={activeBookId}
                timeLayers={timeLayers}
                onDeleted={() => setSelectedRelId(null)}
                onDuplicated={(id) => setSelectedRelId(id)}
              />
            ) : selectedStickyNoteId && activeBookId ? (
              <StickyNoteInspector
                stickyNoteId={selectedStickyNoteId}
                timeLayers={timeLayers}
                onDeleted={() => setSelectedStickyNoteId(null)}
              />
            ) : selectedGroupRangeId && activeBookId ? (
              <GroupRangeInspector
                groupRangeId={selectedGroupRangeId}
                bookId={activeBookId}
                timeLayers={timeLayers}
                onDeleted={() => setSelectedGroupRangeId(null)}
                onDuplicated={(id) => setSelectedGroupRangeId(id)}
              />
            ) : selectedEvidenceImageId && activeBookId ? (
              <EvidenceImageInspector
                evidenceImageId={selectedEvidenceImageId}
                bookId={activeBookId}
                timeLayers={timeLayers}
                onDeleted={() => setSelectedEvidenceImageId(null)}
                onDuplicated={(id) => setSelectedEvidenceImageId(id)}
              />
            ) : (
              <EmptyInspectorGuide t={t} bookId={activeBookId} currentChapter={currentChapter} />
            )}
          </div>
        </div>
      </aside>

      {/* Global search overlay */}
      {searchOpen && (
        <GlobalSearch
          onSelectCharacter={(id) => {
            setSelectedCharId(id);
            setSelectedRelId(null);
            setSelectedStickyNoteId(null);
            setSelectedGroupRangeId(null);
            setSelectedEvidenceImageId(null);
            setInspectorOpen(true);
          }}
          onSelectRelationship={(id) => {
            setSelectedRelId(id);
            setSelectedCharId(null);
            setSelectedStickyNoteId(null);
            setSelectedGroupRangeId(null);
            setSelectedEvidenceImageId(null);
            setInspectorOpen(true);
          }}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {settingsOpen && (
        <SettingsPanel
          onClose={() => setSettingsOpen(false)}
          onExportLibrary={() => void handleExport()}
          onImportLibrary={() => void handleImport()}
          onOpenOnboarding={() => setOnboardingOpen(true)}
          onCreateTutorial={(kind) => void handleCreateTutorialBook(kind)}
        />
      )}

      {onboardingOpen && (
        <OnboardingPanel
          onClose={closeOnboarding}
          onCreateBlank={() => {
            void handleCreateStarterBook();
            closeOnboarding();
          }}
          onCreateTutorial={(kind) => {
            void handleCreateTutorialBook(kind);
            closeOnboarding();
          }}
        />
      )}

      {timeLayerManagerOpen && activeBookId && (
        <TimeLayerManagerModal
          layers={timeLayers}
          saving={timeLayerSaving}
          onClose={() => setTimeLayerManagerOpen(false)}
          onSave={(layers) => void handleSaveTimeLayers(layers)}
        />
      )}

      {toastMessage && (
        <div role="status" aria-live="polite" style={toastStyle}>
          {toastMessage}
        </div>
      )}

      {spoilerConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('app.revealSpoilers')}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'color-mix(in srgb, var(--ink-900) 34%, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setSpoilerConfirmOpen(false)}
        >
          <div
            style={{
              width: 380,
              maxWidth: 'calc(100vw - 32px)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--ink-200)',
              borderRadius: 8,
              boxShadow: 'var(--shadow-modal)',
              color: 'var(--ink-900)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '18px 22px 6px' }}>
              <Shield size={16} color="var(--accent)" />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500 }}>{t('app.revealSpoilers')}</div>
            </div>
            <p style={{ margin: '4px 22px 16px', fontSize: 13, lineHeight: 1.6, color: 'var(--ink-600)' }}>
              {t('app.revealSpoilersBody', { chapter: currentChapter })}
            </p>
            <div
              style={{
                padding: '12px 16px',
                borderTop: '1px solid var(--ink-150)',
                background: 'var(--bg-panel)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
              }}
            >
              {chapterManuallyProtected && !chapterHasAutomaticSpoilers && (
                <button
                  onClick={() => void handleRemoveCurrentChapterProtection()}
                  style={{
                    marginRight: 'auto',
                    padding: '6px 12px',
                    borderRadius: 5,
                    border: '1px solid var(--ink-200)',
                    background: 'transparent',
                    color: 'var(--ink-600)',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  {t('app.removeChapterProtection')}
                </button>
              )}
              <button
                onClick={() => setSpoilerConfirmOpen(false)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 5,
                  border: '1px solid var(--ink-200)',
                  background: 'transparent',
                  color: 'var(--ink-700)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {t('app.keepCovered')}
              </button>
              <button
                onClick={() => {
                  setRevealedSpoilerKey(currentSpoilerKey);
                  setSpoilerConfirmOpen(false);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 5,
                  border: 'none',
                  background: 'var(--accent)',
                  color: 'var(--accent-ink)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {t('app.reveal')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
