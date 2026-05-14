import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ArrowRight, BookOpen, CircleDashed, Download, FilePlus2, FileText, Github, Image as ImageIcon, Moon, Sun, PanelLeft, PanelRight, Undo2, Redo2, LayoutGrid, StickyNote, Shield, ShieldOff, Settings as SettingsIcon, Search, Upload, UserPlus } from 'lucide-react';
import CalabashCanvas from './components/Canvas/CalabashCanvas';
import ChapterSlider, { type ChapterSliderMark } from './components/Canvas/ChapterSlider';
import BookList from './components/Sidebar/BookList';
import CharacterInspector from './components/Inspector/CharacterInspector';
import RelationshipInspector from './components/Inspector/RelationshipInspector';
import StickyNoteInspector from './components/Inspector/StickyNoteInspector';
import GroupRangeInspector from './components/Inspector/GroupRangeInspector';
import SettingsPanel from './components/Settings/SettingsPanel';
import OnboardingPanel from './components/Onboarding/OnboardingPanel';
import CalabashLogo from './components/Brand/CalabashLogo';
import { useBookHydration } from './hooks/useBookHydration';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useBookStore } from './stores/bookStore';
import { useGraphStore } from './stores/graphStore';
import { useUiStore } from './stores/uiStore';
import { useUserStore } from './stores/userStore';
import { exportLibraryAsJson, importBookFromJson, importLibraryFromJson, isLibraryExport } from './db/importExport';
import GlobalSearch from './components/CommandBar/GlobalSearch';
import { createBook, getBook, updateBook } from './db/books';
import { createAnnotation, deleteAnnotation, restoreAnnotation } from './db/annotations';
import { createGroupRange, deleteGroupRange, restoreGroupRange } from './db/groupRanges';
import { hasSpoilerSensitiveRoleAtChapter } from './lib/roles';
import { addSpoilerChapter, getSpoilerShieldToolbarAction, removeSpoilerChapter } from './lib/spoilerShield';
import { seedTutorialBook, type TutorialKind } from './lib/demoData';
import { useT } from './i18n';
import type { Book } from './types';
import type { CharacterNodeViewMode } from './stores/uiStore';

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
    <div role="group" aria-label={t('app.viewMode')} style={viewModeClusterStyle}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            title={option.label}
            onClick={() => onChange(option.value)}
            style={viewModeButtonStyle(active)}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
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

function EmptyInspectorGuide({ t }: { t: ReturnType<typeof useT> }) {
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
  ];

  return (
    <div style={{ padding: 18, color: 'var(--ink-500)', fontSize: 13, lineHeight: 1.55 }}>
      <div style={{ fontSize: 9.5, color: 'var(--ink-400)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>
        {t('app.inspector')}
      </div>
      <div style={{ fontFamily: 'var(--font-case-title)', fontSize: 18, color: 'var(--ink-900)', marginTop: 4, marginBottom: 14 }}>
        {t('app.nothingSelected')}
      </div>
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
  );
}

function StarterActionCard({
  icon,
  title,
  body,
  action,
  primary = false,
  disabled = false,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action: string;
  primary?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        minHeight: 156,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        background: primary ? 'var(--ink-900)' : 'var(--bg-panel)',
        border: primary
          ? '1px solid var(--ink-900)'
          : '1px solid var(--ink-200)',
        borderRadius: 7,
        boxShadow: primary ? '0 14px 34px rgba(32, 24, 14, 0.14)' : '0 1px 2px rgba(32, 24, 14, 0.04)',
        color: primary ? 'var(--bg-panel)' : 'var(--ink-900)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        textAlign: 'left',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 30,
          height: 30,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 5,
          background: primary ? 'rgba(255,255,255,0.13)' : 'var(--bg-canvas)',
          border: primary ? '1px solid rgba(255,255,255,0.18)' : '1px solid var(--ink-200)',
          color: primary ? 'var(--bg-panel)' : 'var(--accent)',
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{ fontFamily: 'var(--font-case-title)', fontSize: 18, lineHeight: 1.15 }}>
        {title}
      </span>
      <span
        style={{
          flex: 1,
          color: primary ? 'color-mix(in srgb, var(--bg-panel) 78%, transparent)' : 'var(--ink-500)',
          fontSize: 12,
          lineHeight: 1.55,
        }}
      >
        {body}
      </span>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: primary ? 'var(--bg-panel)' : 'var(--accent)',
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
  const [newCharacterRequestId, setNewCharacterRequestId] = useState(0);
  const [startEdgeRequestId, setStartEdgeRequestId] = useState(0);
  const [startEdgeSourceId, setStartEdgeSourceId] = useState<string | null>(null);
  const [revealedSpoilerKey, setRevealedSpoilerKey] = useState<string | null>(null);
  const [spoilerConfirmOpen, setSpoilerConfirmOpen] = useState(false);
  const [activeBookSummary, setActiveBookSummary] = useState<Book | null>(null);
  const libraryImportInputRef = useRef<HTMLInputElement>(null);

  const activeBookId = useBookStore((s) => s.activeBookId);
  const setActiveBook = useBookStore((s) => s.setActiveBook);
  const currentChapter = useBookStore((s) => s.currentChapter);
  const totalChapters = useBookStore((s) => s.totalChapters);
  const spoilerShield = useBookStore((s) => s.spoilerShield);
  const spoilerChapters = useBookStore((s) => s.spoilerChapters);
  const highlightedChapters = useBookStore((s) => s.highlightedChapters);
  const setCurrentChapter = useBookStore((s) => s.setCurrentChapter);
  const setCurrentChapterAndPersist = useBookStore((s) => s.setCurrentChapterAndPersist);
  const setTotalChapters = useBookStore((s) => s.setTotalChapters);
  const setSpoilerShield = useBookStore((s) => s.setSpoilerShield);
  const setSpoilerChapters = useBookStore((s) => s.setSpoilerChapters);
  const setHighlightedChapters = useBookStore((s) => s.setHighlightedChapters);

  const characters = useGraphStore((s) => s.characters);
  const relationships = useGraphStore((s) => s.relationships);
  const stickyNotes = useGraphStore((s) => s.stickyNotes);
  const groupRanges = useGraphStore((s) => s.groupRanges);
  const setCharacters = useGraphStore((s) => s.setCharacters);
  const setRelationships = useGraphStore((s) => s.setRelationships);
  const setStickyNotes = useGraphStore((s) => s.setStickyNotes);
  const setGroupRanges = useGraphStore((s) => s.setGroupRanges);
  const addStickyNote = useGraphStore((s) => s.addStickyNote);
  const removeStickyNote = useGraphStore((s) => s.removeStickyNote);
  const addGroupRange = useGraphStore((s) => s.addGroupRange);
  const removeGroupRange = useGraphStore((s) => s.removeGroupRange);
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

  // Inspector selection state
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [selectedRelId, setSelectedRelId] = useState<string | null>(null);
  const [selectedStickyNoteId, setSelectedStickyNoteId] = useState<string | null>(null);
  const [selectedGroupRangeId, setSelectedGroupRangeId] = useState<string | null>(null);

  // Reset selection when active book changes
  useEffect(() => {
    setSelectedCharId(null);
    setSelectedRelId(null);
    setSelectedStickyNoteId(null);
    setSelectedGroupRangeId(null);
    setRevealedSpoilerKey(null);
    setSpoilerConfirmOpen(false);
  }, [activeBookId]);

  useEffect(() => {
    if (spoilerShield) setRevealedSpoilerKey(null);
    setSpoilerConfirmOpen(false);
  }, [spoilerShield]);

  // Auto-open inspector panel when a node or edge is selected
  useEffect(() => {
    if (selectedCharId || selectedRelId || selectedStickyNoteId || selectedGroupRangeId) setInspectorOpen(true);
  }, [selectedCharId, selectedRelId, selectedStickyNoteId, selectedGroupRangeId]);

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
    const data = await exportLibraryAsJson();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calabash-library-${new Date().toISOString().slice(0, 10)}.calabash.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(file: File) {
    const text = await file.text();
    try {
      const payload = JSON.parse(text);
      if (isLibraryExport(payload)) {
        const result = await importLibraryFromJson(payload);
        await refreshUsers();
        if (result.activeUserId) setActiveUser(result.activeUserId);
        if (result.activeBookId) setActiveBook(result.activeBookId);
        return;
      }
      const newBookId = await importBookFromJson(payload, activeUserId ?? undefined);
      setActiveBook(newBookId);
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
  }

  async function handleCreateTutorialBook(kind: TutorialKind = 'ackroyd') {
    if (!activeUserId) return;
    const newBookId = await seedTutorialBook({ userId: activeUserId, language: resolvedLanguage, kind });
    const book = await getBook(newBookId);
    setActiveBook(newBookId);
    if (book) applyBookShell(book);
    setCharacters([]);
    setRelationships([]);
    setStickyNotes([]);
    setGroupRanges([]);
  }

  function closeOnboarding() {
    try { localStorage.setItem(ONBOARDING_SEEN_KEY, 'true'); } catch { /* test env */ }
    setOnboardingOpen(false);
  }

  // Add sticky note at canvas centre, with undo support
  async function handleAddStickyNote() {
    if (!activeBookId) return;
    const note = await createAnnotation({
      bookId: activeBookId,
      content: '',
      position: { x: (Math.random() - 0.5) * 200, y: (Math.random() - 0.5) * 200 },
      chapterIntroduced: currentChapter,
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
    });
    addGroupRange(range);
    setSelectedCharId(null);
    setSelectedRelId(null);
    setSelectedStickyNoteId(null);
    setSelectedGroupRangeId(range.id);
    pushUndo(
      async () => { await deleteGroupRange(range.id); removeGroupRange(range.id); },
      async () => { await restoreGroupRange(range); addGroupRange(range); },
    );
  }

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

  return (
    <div
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg-canvas)',
        color: 'var(--ink-900)',
        fontFamily: 'var(--font-ui)',
      }}
    >
      {/* Left sidebar */}
      <aside
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
              display: 'flex',
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
              onClick={() => libraryImportInputRef.current?.click()}
              style={sidebarUtilityButtonStyle}
              title={t('app.importLibrary')}
              aria-label={t('app.importLibrary')}
            >
              <Upload size={13} />
              <span>{t('app.import')}</span>
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

      {/* Centre canvas area — flex-grow */}
      <main
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
          }}
        >
          {/* Sidebar toggle */}
          <button
            className="toolbar-btn"
            onClick={() => setSidebarOpen((v) => !v)}
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

          <div style={toolbarClusterStyle}>
            <button
              className="toolbar-btn"
              onClick={() => setNewCharacterRequestId((id) => id + 1)}
              disabled={!activeBookId}
              title={`${t('app.addCharacter')} (N)`}
              style={primaryToolbarBtnStyle}
            >
              <UserPlus size={13} />
              {t('app.addCharacter')}
              <span
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
              {t('app.note')}
            </button>

            <button
              className="toolbar-btn"
              onClick={() => void handleAddGroupRange()}
              disabled={!activeBookId}
              title={t('app.range')}
              style={{ ...toolbarBtnStyle, border: 'none' }}
            >
              <CircleDashed size={13} />
              {t('app.range')}
            </button>
          </div>

          <div style={historyClusterStyle}>
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
            }}
          >
            <span
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
            style={toolbarBtnStyle}
          >
            <LayoutGrid size={13} />
            {t('app.layout')}
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
            {t('app.shield')}
          </button>

          <div style={dividerStyle} />

          {/* Inspector toggle */}
          <button
            className="toolbar-btn"
            onClick={() => setInspectorOpen((v) => !v)}
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
                  aria-hidden="true"
                  style={{
                    width: 60,
                    height: 60,
                    margin: '0 auto 14px',
                    borderRadius: 999,
                    background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
                    border: '1.5px dashed color-mix(in srgb, var(--accent) 50%, transparent)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--accent)',
                    fontFamily: 'var(--font-case-title)',
                    fontSize: 11,
                    letterSpacing: '0.14em',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    lineHeight: 1.1,
                  }}
                >
                  {t('app.emptyStamp')}
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
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 12,
                    marginTop: 24,
                    alignItems: 'stretch',
                  }}
                >
                  <StarterActionCard
                    primary
                    icon={<BookOpen size={16} />}
                    title={t('app.starterAckroydTitle')}
                    body={t('app.starterAckroydBody')}
                    action={t('onboarding.createAckroydTutorial')}
                    onClick={() => void handleCreateTutorialBook('ackroyd')}
                    disabled={!activeUserId}
                  />
                  <StarterActionCard
                    icon={<FilePlus2 size={16} />}
                    title={t('app.starterBlankTitle')}
                    body={t('app.starterBlankBody')}
                    action={t('app.starterBlankAction')}
                    onClick={() => void handleCreateStarterBook()}
                    disabled={!activeUserId}
                  />
                  <StarterActionCard
                    icon={<Upload size={16} />}
                    title={t('app.starterImportTitle')}
                    body={t('app.starterImportBody')}
                    action={t('app.importLibrary')}
                    onClick={() => libraryImportInputRef.current?.click()}
                  />
                  <StarterActionCard
                    icon={<UserPlus size={16} />}
                    title={t('app.starterHidaTitle')}
                    body={t('app.starterHidaBody')}
                    action={t('onboarding.createHidaTutorial')}
                    onClick={() => void handleCreateTutorialBook('hida')}
                    disabled={!activeUserId}
                  />
                </div>
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
                  characterNodeViewMode={characterNodeViewMode}
                  currentChapter={currentChapter}
                  bookId={activeBookId}
                  newCharacterRequestId={newCharacterRequestId}
                  startEdgeRequestId={startEdgeRequestId}
                  startEdgeSourceId={startEdgeSourceId}
                  onNodeSelect={(id) => {
                    setSelectedCharId(id);
                    if (id) {
                      setSelectedRelId(null);
                      setSelectedStickyNoteId(null);
                      setSelectedGroupRangeId(null);
                    }
                  }}
                  onEdgeSelect={(id) => {
                    setSelectedRelId(id);
                    if (id) {
                      setSelectedCharId(null);
                      setSelectedStickyNoteId(null);
                      setSelectedGroupRangeId(null);
                    }
                  }}
                  onStickyNoteSelect={(id) => {
                    setSelectedStickyNoteId(id);
                    if (id) {
                      setSelectedCharId(null);
                      setSelectedRelId(null);
                      setSelectedGroupRangeId(null);
                    }
                  }}
                  onGroupRangeSelect={(id) => {
                    setSelectedGroupRangeId(id);
                    if (id) {
                      setSelectedCharId(null);
                      setSelectedRelId(null);
                      setSelectedStickyNoteId(null);
                    }
                  }}
                  onFitViewReady={handleFitViewReady}
                  onLayoutReady={handleLayoutReady}
                />
              </div>
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
              setTotalChapters(n);
              await updateBook(activeBookId, { totalChapters: n });
            }}
          />
        )}
      </main>

      {/* Right inspector panel */}
      <aside
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
                onDeleted={() => setSelectedCharId(null)}
                onDuplicated={(id) => setSelectedCharId(id)}
              />
            ) : selectedRelId && activeBookId ? (
              <RelationshipInspector
                relationshipId={selectedRelId}
                bookId={activeBookId}
                onDeleted={() => setSelectedRelId(null)}
                onDuplicated={(id) => setSelectedRelId(id)}
              />
            ) : selectedStickyNoteId && activeBookId ? (
              <StickyNoteInspector
                stickyNoteId={selectedStickyNoteId}
                onDeleted={() => setSelectedStickyNoteId(null)}
              />
            ) : selectedGroupRangeId && activeBookId ? (
              <GroupRangeInspector
                groupRangeId={selectedGroupRangeId}
                bookId={activeBookId}
                onDeleted={() => setSelectedGroupRangeId(null)}
                onDuplicated={(id) => setSelectedGroupRangeId(id)}
              />
            ) : (
              <EmptyInspectorGuide t={t} />
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
            setInspectorOpen(true);
          }}
          onSelectRelationship={(id) => {
            setSelectedRelId(id);
            setSelectedCharId(null);
            setSelectedStickyNoteId(null);
            setSelectedGroupRangeId(null);
            setInspectorOpen(true);
          }}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {settingsOpen && (
        <SettingsPanel
          onClose={() => setSettingsOpen(false)}
          onExportLibrary={() => void handleExport()}
          onImportLibrary={(file) => void handleImportFile(file)}
          onOpenOnboarding={() => setOnboardingOpen(true)}
          onCreateTutorial={(kind) => void handleCreateTutorialBook(kind)}
        />
      )}

      {onboardingOpen && (
        <OnboardingPanel
          onClose={closeOnboarding}
          onCreateTutorial={(kind) => {
            void handleCreateTutorialBook(kind);
            closeOnboarding();
          }}
        />
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
