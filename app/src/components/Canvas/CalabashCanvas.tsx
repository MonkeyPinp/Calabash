import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  ControlButton,
  Controls,
  MiniMap,
  MarkerType,
  Position,
  applyNodeChanges,
  useReactFlow,
  type Node,
  type Edge,
  type NodeChange,
  type OnSelectionChangeParams,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from '@xyflow/react';
import { CircleDashed, Clock3, FileText, Image as ImageIcon, LayoutGrid, Link2, Lock, PanelRight, Shield, StickyNote as StickyNoteIcon, Trash2, Unlock, UserPlus } from 'lucide-react';
import '@xyflow/react/dist/style.css';
import type { Character, EvidenceImage, GroupRange, Relationship, StickyNote, TimeLayer } from '@/types';
import CharacterNode from './CharacterNode';
import RelationshipEdge from './RelationshipEdge';
import StickyNoteNode from './StickyNoteNode';
import GroupRangeNode from './GroupRangeNode';
import EvidenceImageNode from './EvidenceImageNode';
import NewCharacterModal from './NewCharacterModal';
import NewRelationshipModal from './NewRelationshipModal';
import { resolveDisplayName } from '@/lib/aliases';
import { formatNonCharacterKind, normalizeCharacterKind } from '@/lib/characterKinds';
import { formatCharacterRole, getCharacterRoleVisualKey, resolveCharacterRole } from '@/lib/roles';
import { getRelationshipTypeMarkerColor, isRelationshipDirected } from '@/lib/relationshipTypes';
import { deleteCharacter, restoreCharacter, updateCharacter } from '@/db/characters';
import { deleteRelationship, restoreRelationship } from '@/db/relationships';
import { updateAnnotation, deleteAnnotation, restoreAnnotation } from '@/db/annotations';
import { deleteGroupRange, restoreGroupRange, updateGroupRange } from '@/db/groupRanges';
import { deleteEvidenceImage, restoreEvidenceImage, updateEvidenceImage } from '@/db/evidenceImages';
import { computeForceLayout } from '@/lib/layout';
import { isStickyNoteVisibleAtChapter } from '@/lib/stickyNotes';
import { GROUP_RANGE_COLOR_MAP, isGroupRangeVisibleAtChapter } from '@/lib/groupRanges';
import { isEvidenceImageVisibleAtChapter } from '@/lib/evidenceImages';
import { ALL_TIME_LAYERS_ID, isVisibleInTimeLayer, resolveTimeLayerPosition } from '@/lib/timeLayers';
import { exportReactFlowBoard, warmReactFlowBoardExport, type BoardExportFn } from '@/lib/boardExport';
import { useGraphStore } from '@/stores/graphStore';
import { useT } from '@/i18n';
import type { CharacterNodeViewMode } from '@/stores/uiStore';

const nodeTypes = { groupRange: GroupRangeNode, evidenceImage: EvidenceImageNode, character: CharacterNode, stickyNote: StickyNoteNode };
const edgeTypes = { relationship: RelationshipEdge };
const EMPTY_STICKY_NOTES: StickyNote[] = [];
const EMPTY_GROUP_RANGES: GroupRange[] = [];
const EMPTY_EVIDENCE_IMAGES: EvidenceImage[] = [];
type LayoutMove = {
  id: string;
  before: { x: number; y: number };
  after: { x: number; y: number };
};

function characterPositionPatchForLayer(
  character: Character,
  position: { x: number; y: number },
  currentTimeLayerId: string,
): Pick<Character, 'position'> | Pick<Character, 'timeLayerPositions'> {
  if (currentTimeLayerId === ALL_TIME_LAYERS_ID || character.timeLayerId) {
    return { position };
  }
  return {
    timeLayerPositions: {
      ...(character.timeLayerPositions ?? {}),
      [currentTimeLayerId]: position,
    },
  };
}

const DEFAULT_CHARACTER_NODE_WIDTH = 184;
const CHARACTER_NODE_MAX_WIDTH = 440;
const CHARACTER_NODE_MIN_HEIGHT = 82;
const CHARACTER_NODE_TEXT_INSET = 78;
const PORTRAIT_CHARACTER_NODE_WIDTH = 176;
const PORTRAIT_CHARACTER_NODE_HEIGHT = 252;
const PORTRAIT_CHARACTER_NODE_TEXT_INSET = 66;

function longestWordLength(text: string) {
  return text.split(/\s+/).reduce((longest, word) => Math.max(longest, word.length), 0);
}

function estimateWrappedLines(text: string | undefined, availableWidth: number, averageCharWidth: number) {
  const cleaned = text?.trim();
  if (!cleaned) return 0;
  const byLength = Math.ceil((cleaned.length * averageCharWidth) / availableWidth);
  const byWord = Math.ceil((longestWordLength(cleaned) * averageCharWidth) / availableWidth);
  return Math.max(1, byLength, byWord);
}

function estimateCharacterNodeSize(name: string, roleLabel: string, subtitle?: string) {
  const texts = [name, roleLabel, subtitle].filter(Boolean) as string[];
  const longestWord = texts.reduce((longest, text) => Math.max(longest, longestWordLength(text)), 0);
  const longestText = texts.reduce((longest, text) => Math.max(longest, text.length), 0);
  const width = Math.min(
    CHARACTER_NODE_MAX_WIDTH,
    Math.max(
      DEFAULT_CHARACTER_NODE_WIDTH,
      96 + Math.min(longestText, 48) * 6.2,
      96 + longestWord * 7.2,
    ),
  );
  const textWidth = Math.max(120, width - CHARACTER_NODE_TEXT_INSET);
  const metaText = [roleLabel, subtitle].filter(Boolean).join(' · ');
  const nameLines = estimateWrappedLines(name, textWidth, 8.1);
  const metaLines = estimateWrappedLines(metaText, textWidth, 6.5);
  const height = Math.max(
    CHARACTER_NODE_MIN_HEIGHT,
    34 + nameLines * 19 + (metaLines > 0 ? 5 + metaLines * 16 : 0) + 18,
  );
  return { width, height };
}

function estimatePortraitCharacterNodeSize(name: string, subtitle?: string) {
  const textWidth = PORTRAIT_CHARACTER_NODE_WIDTH - PORTRAIT_CHARACTER_NODE_TEXT_INSET;
  const nameLines = estimateWrappedLines(name, textWidth, 8.1);
  const subtitleLines = estimateWrappedLines(subtitle, textWidth, 6.5);
  const height = Math.max(
    PORTRAIT_CHARACTER_NODE_HEIGHT,
    213 + nameLines * 19 + (subtitleLines > 0 ? 4 + subtitleLines * 15 : 0),
  );
  return { width: PORTRAIT_CHARACTER_NODE_WIDTH, height };
}

function getCharacterNodeSize(
  viewMode: CharacterNodeViewMode,
  name: string,
  roleLabel: string,
  subtitle?: string,
) {
  return viewMode === 'portrait'
    ? estimatePortraitCharacterNodeSize(name, subtitle)
    : estimateCharacterNodeSize(name, roleLabel, subtitle);
}

const kbdStyle: React.CSSProperties = {
  minWidth: 20,
  height: 18,
  padding: '0 5px',
  borderRadius: 3,
  border: '1px solid var(--ink-200)',
  borderBottom: '2px solid var(--ink-200)',
  background: 'var(--bg-canvas)',
  color: 'var(--ink-700)',
  fontSize: 10,
  fontWeight: 700,
  lineHeight: '17px',
  textAlign: 'center',
  boxSizing: 'border-box',
};

/** Choose which handles to use based on the relative position of two node centres. */
function pickHandles(sx: number, sy: number, tx: number, ty: number) {
  const dx = tx - sx;
  const dy = ty - sy;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourceHandle: 'source-right', targetHandle: 'target-left',  sourcePosition: Position.Right, targetPosition: Position.Left  }
      : { sourceHandle: 'source-left',  targetHandle: 'target-right', sourcePosition: Position.Left,  targetPosition: Position.Right };
  }
  return dy >= 0
    ? { sourceHandle: 'source-bottom', targetHandle: 'target-top',    sourcePosition: Position.Bottom, targetPosition: Position.Top    }
    : { sourceHandle: 'source-top',    targetHandle: 'target-bottom', sourcePosition: Position.Top,    targetPosition: Position.Bottom };
}

export interface CalabashCanvasProps {
  characters: Character[];
  relationships: Relationship[];
  stickyNotes?: StickyNote[];
  groupRanges?: GroupRange[];
  evidenceImages?: EvidenceImage[];
  characterNodeViewMode?: CharacterNodeViewMode;
  currentChapter: number;
  currentTimeLayerId?: string;
  timeLayers?: TimeLayer[];
  bookId: string | null;
  newCharacterRequestId?: number;
  startEdgeRequestId?: number;
  startEdgeSourceId?: string | null;
  onNodeSelect?: (id: string | null) => void;
  onEdgeSelect?: (id: string | null) => void;
  onStickyNoteSelect?: (id: string | null) => void;
  onGroupRangeSelect?: (id: string | null) => void;
  onEvidenceImageSelect?: (id: string | null) => void;
  touchMode?: boolean;
  onRequestInspector?: () => void;
  onFitViewReady?: (fn: () => void) => void;
  onLayoutReady?: (fn: () => Promise<void>) => void;
  onExportReady?: (fn: BoardExportFn) => void;
}

function CalabashCanvasInner({
  characters,
  relationships,
  stickyNotes = EMPTY_STICKY_NOTES,
  groupRanges = EMPTY_GROUP_RANGES,
  evidenceImages = EMPTY_EVIDENCE_IMAGES,
  characterNodeViewMode = 'text',
  currentChapter,
  currentTimeLayerId = ALL_TIME_LAYERS_ID,
  timeLayers = [],
  bookId,
  newCharacterRequestId = 0,
  startEdgeRequestId = 0,
  startEdgeSourceId = null,
  onNodeSelect,
  onEdgeSelect,
  onStickyNoteSelect,
  onGroupRangeSelect,
  onEvidenceImageSelect,
  touchMode = false,
  onRequestInspector,
  onFitViewReady,
  onLayoutReady,
  onExportReady,
}: CalabashCanvasProps) {
  const t = useT();
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null);
  const [pendingConnection, setPendingConnection] = useState<{ sourceId: string; targetId: string } | null>(null);
  const [edgeStartId, setEdgeStartId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(new Set());
  const [boardLocked, setBoardLocked] = useState(false);

  const timeLayerColorById = useMemo(
    () => new Map(timeLayers.map((layer) => [layer.id, layer.color] as const)),
    [timeLayers],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const handledNewCharacterRequestId = useRef(0);
  const handledStartEdgeRequestId = useRef(0);
  // Track node positions before drag for undo
  const dragStartPositions = useRef<Map<string, { x: number; y: number }>>(new Map());

  const addCharacter = useGraphStore((s) => s.addCharacter);
  const removeCharacter = useGraphStore((s) => s.removeCharacter);
  const updateCharacterInStore = useGraphStore((s) => s.updateCharacterInStore);
  const addRelationship = useGraphStore((s) => s.addRelationship);
  const removeRelationship = useGraphStore((s) => s.removeRelationship);
  const addStickyNote = useGraphStore((s) => s.addStickyNote);
  const removeStickyNote = useGraphStore((s) => s.removeStickyNote);
  const updateStickyNoteInStore = useGraphStore((s) => s.updateStickyNoteInStore);
  const addGroupRange = useGraphStore((s) => s.addGroupRange);
  const removeGroupRange = useGraphStore((s) => s.removeGroupRange);
  const updateGroupRangeInStore = useGraphStore((s) => s.updateGroupRangeInStore);
  const addEvidenceImage = useGraphStore((s) => s.addEvidenceImage);
  const removeEvidenceImage = useGraphStore((s) => s.removeEvidenceImage);
  const updateEvidenceImageInStore = useGraphStore((s) => s.updateEvidenceImageInStore);
  const pushUndo = useGraphStore((s) => s.pushUndo);

  const { fitView, screenToFlowPosition, getViewport } = useReactFlow();
  const shortcuts = useMemo(
    () => [
      ['N', t('shortcut.newCharacter')],
      ['E', t('shortcut.connectEdge')],
      ['F', t('shortcut.fitToView')],
      ['/', t('shortcut.search')],
      ['Del', t('shortcut.deleteSelection')],
      ['Ctrl Z', t('shortcut.undo')],
    ] as const,
    [t],
  );
  const helpTools = useMemo(
    () => [
      { key: 'node', icon: <UserPlus size={12} />, label: t('app.addCharacter'), body: t('help.tool.addNode') },
      { key: 'note', icon: <StickyNoteIcon size={12} />, label: t('app.note'), body: t('help.tool.note') },
      { key: 'group', icon: <CircleDashed size={12} />, label: t('app.range'), body: t('help.tool.group') },
      { key: 'illustration', icon: <ImageIcon size={12} />, label: t('app.image'), body: t('help.tool.illustration') },
      { key: 'text', icon: <FileText size={12} />, label: t('app.textMode'), body: t('help.tool.textMode') },
      { key: 'portrait', icon: <ImageIcon size={12} />, label: t('app.portraitMode'), body: t('help.tool.portraitMode') },
      { key: 'timeLayer', icon: <Clock3 size={12} />, label: t('timeLayer.switcher'), body: t('help.tool.timeLayer') },
      { key: 'layout', icon: <LayoutGrid size={12} />, label: t('app.layout'), body: t('help.tool.layout') },
      { key: 'shield', icon: <Shield size={12} />, label: t('app.shield'), body: t('help.tool.shield') },
      { key: 'lock', icon: <Lock size={12} />, label: t('canvas.lockBoard'), body: t('help.tool.lockBoard') },
    ],
    [t],
  );
  const [helpOpen, setHelpOpen] = useState(false);

  const scheduleFitView = useCallback(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => fitView({ padding: 0.15, maxZoom: 1.1 })));
  }, [fitView]);

  const applyCharacterLayoutMoves = useCallback(
    async (moves: LayoutMove[], phase: 'before' | 'after') => {
      const positionById = new Map(moves.map((move) => [move.id, move[phase]]));
      await Promise.all(
        moves.map(async (move) => {
          const character = useGraphStore.getState().characters.find((item) => item.id === move.id);
          if (!character) return;
          const updated = await updateCharacter(
            move.id,
            characterPositionPatchForLayer(character, move[phase], currentTimeLayerId),
          );
          updateCharacterInStore(updated);
        }),
      );

      setRfNodes((nds) =>
        nds.map((node) => {
          if (node.type !== 'character') return node;
          const position = positionById.get(node.id);
          return position ? { ...node, position } : node;
        }),
      );
      scheduleFitView();
    },
    [currentTimeLayerId, scheduleFitView, updateCharacterInStore],
  );

  useEffect(() => {
    onFitViewReady?.(fitView);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Character nodes
  const characterNodes: Node[] = useMemo(
    () =>
      characters
        .filter((c) => (
          c.chapterIntroduced <= currentChapter &&
          isVisibleInTimeLayer(c.timeLayerId, currentTimeLayerId)
        ))
        .map((c) => {
          const name = resolveDisplayName(c.aliases, currentChapter);
          const kind = normalizeCharacterKind(c.kind);
          const kindLabel = formatNonCharacterKind(kind, t);
          const role = resolveCharacterRole(c, currentChapter);
          const roleLabel = formatCharacterRole(role, t);
          const metaLabel = [kindLabel, roleLabel].filter(Boolean).join(' · ');
          const subtitle = [kindLabel, c.profession].filter(Boolean).join(' · ');
          const { width, height } = getCharacterNodeSize(characterNodeViewMode, name, metaLabel, subtitle);
          return {
            id: c.id,
            type: 'character',
            position: resolveTimeLayerPosition(c, currentTimeLayerId),
            width,
            height,
            draggable: !boardLocked && c.locked !== true,
            style: { width, minHeight: height },
            data: {
              name,
              width,
              height,
              viewMode: characterNodeViewMode,
              kind,
              role,
              profession: c.profession,
              portraitId: c.portraitId,
              chapterIntroduced: c.chapterIntroduced,
              locked: c.locked === true,
            },
          };
        }),
    [characters, currentChapter, currentTimeLayerId, characterNodeViewMode, t, boardLocked],
  );

  // Sticky note nodes
  const stickyNoteNodes: Node[] = useMemo(
    () =>
      stickyNotes
        .filter((s) => (
          isStickyNoteVisibleAtChapter(s, currentChapter) &&
          isVisibleInTimeLayer(s.timeLayerId, currentTimeLayerId)
        ))
        .map((s) => ({
          id: s.id,
          type: 'stickyNote',
          position: s.position,
          width: s.width,
          height: s.height,
          draggable: !boardLocked && s.locked !== true,
          style: { width: s.width, height: s.height },
          data: { note: s },
        })),
    [stickyNotes, currentChapter, currentTimeLayerId, boardLocked],
  );

  // Group range nodes stay visually behind characters, notes, and relationship edges.
  const groupRangeNodes: Node[] = useMemo(
    () =>
      groupRanges
        .filter((r) => (
          isGroupRangeVisibleAtChapter(r, currentChapter) &&
          isVisibleInTimeLayer(r.timeLayerId, currentTimeLayerId)
        ))
        .map((r) => ({
          id: r.id,
          type: 'groupRange',
          position: r.position,
          width: r.width,
          height: r.height,
          draggable: !boardLocked && r.locked !== true,
          zIndex: -20,
          style: { width: r.width, height: r.height, zIndex: -20 },
          data: { range: r },
        })),
    [groupRanges, currentChapter, currentTimeLayerId, boardLocked],
  );

  const evidenceImageNodes: Node[] = useMemo(
    () =>
      evidenceImages
        .filter((image) => (
          isEvidenceImageVisibleAtChapter(image, currentChapter) &&
          isVisibleInTimeLayer(image.timeLayerId, currentTimeLayerId)
        ))
        .map((image) => {
          const zIndex = image.layer === 'background' ? -30 : -1;
          return {
            id: image.id,
            type: 'evidenceImage',
            position: image.position,
            width: image.width,
            height: image.height,
            draggable: !boardLocked && image.locked !== true,
            zIndex,
            style: { width: image.width, height: image.height, zIndex },
            data: { image },
          };
        }),
    [evidenceImages, currentChapter, currentTimeLayerId, boardLocked],
  );

  const allComputedNodes: Node[] = useMemo(
    () => [...groupRangeNodes, ...evidenceImageNodes, ...characterNodes, ...stickyNoteNodes],
    [groupRangeNodes, evidenceImageNodes, characterNodes, stickyNoteNodes],
  );

  const lockedNodeIds = useMemo(
    () =>
      new Set([
        ...characters.filter((character) => character.locked === true).map((character) => character.id),
        ...stickyNotes.filter((note) => note.locked === true).map((note) => note.id),
        ...groupRanges.filter((range) => range.locked === true).map((range) => range.id),
        ...evidenceImages.filter((image) => image.locked === true).map((image) => image.id),
      ]),
    [characters, stickyNotes, groupRanges, evidenceImages],
  );

  const visibleCharIds = useMemo(() => new Set(characterNodes.map((n) => n.id)), [characterNodes]);

  // Position map (node centres) for smart handle selection
  const nodeCenter = useMemo(
    () =>
      new Map(
        characterNodes.map((n) => [
          n.id,
          { x: n.position.x + (n.width ?? DEFAULT_CHARACTER_NODE_WIDTH) / 2, y: n.position.y + (n.height ?? CHARACTER_NODE_MIN_HEIGHT) / 2 },
        ]),
      ),
    [characterNodes],
  );

  // Local RF node copy for smooth drag
  const [rfNodes, setRfNodes] = useState<Node[]>(allComputedNodes);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!isDraggingRef.current) setRfNodes(allComputedNodes);
  }, [allComputedNodes]);

  const handleNodesChange = useCallback((changes: NodeChange<Node>[]) => {
    const allowedChanges = changes.filter((change) => {
      if (boardLocked && 'id' in change && change.type === 'position') return false;
      if (!('id' in change) || !lockedNodeIds.has(change.id)) return true;
      return change.type !== 'position' && change.type !== 'dimensions';
    });
    if (allowedChanges.length === 0) return;
    setRfNodes((nds) => applyNodeChanges(allowedChanges, nds));
  }, [boardLocked, lockedNodeIds]);

  const edges: Edge[] = useMemo(() => {
    const visible = relationships.filter(
      (r) =>
        r.chapterRevealed <= currentChapter &&
        isVisibleInTimeLayer(r.timeLayerId, currentTimeLayerId) &&
        visibleCharIds.has(r.sourceId) &&
        visibleCharIds.has(r.targetId),
    );

    const pairCount = new Map<string, number>();
    const pairIndex = new Map<string, number>();
    for (const r of visible) {
      const key = [r.sourceId, r.targetId].sort().join('::');
      pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
    }

    return visible.map((r) => {
      const key = [r.sourceId, r.targetId].sort().join('::');
      const count = pairCount.get(key) ?? 1;
      const idx = pairIndex.get(key) ?? 0;
      pairIndex.set(key, idx + 1);

      const spread = 45;
      const pathOffset = count === 1 ? 0 : (idx - (count - 1) / 2) * spread;

      const timeLayerColor = r.timeLayerId ? timeLayerColorById.get(r.timeLayerId) : undefined;
      const color = timeLayerColor ?? getRelationshipTypeMarkerColor(r.type);
      const filled = { type: MarkerType.ArrowClosed, color, width: 14, height: 14 };

      const markerEnd = isRelationshipDirected(r) ? filled : undefined;

      const sc = nodeCenter.get(r.sourceId);
      const tc = nodeCenter.get(r.targetId);
      const handles = sc && tc
        ? pickHandles(sc.x, sc.y, tc.x, tc.y)
        : { sourceHandle: 'source-right', targetHandle: 'target-left',
            sourcePosition: Position.Right, targetPosition: Position.Left };

      return {
        id: r.id,
        source: r.sourceId,
        target: r.targetId,
        sourceHandle: handles.sourceHandle,
        targetHandle: handles.targetHandle,
        sourcePosition: handles.sourcePosition,
        targetPosition: handles.targetPosition,
        type: 'relationship',
        markerEnd,
        data: { certainty: r.certainty, type: r.type, relationship: r, pathOffset, timeLayerColor },
      };
    });
  }, [relationships, visibleCharIds, currentChapter, currentTimeLayerId, nodeCenter, timeLayerColorById]);

  // ── Auto-layout (lives here so it has direct access to setRfNodes + fitView) ──

  const runLayout = useCallback(async () => {
    if (!bookId || boardLocked) return;
    const visible = characters.filter((c) => (
      c.chapterIntroduced <= currentChapter &&
      isVisibleInTimeLayer(c.timeLayerId, currentTimeLayerId)
    ));
    const visibleIds = new Set(visible.map((c) => c.id));
    const nodeSizes = new Map(
      visible.map((c) => {
        const name = resolveDisplayName(c.aliases, currentChapter);
        const kindLabel = formatNonCharacterKind(c.kind, t);
        const role = resolveCharacterRole(c, currentChapter);
        const roleLabel = formatCharacterRole(role, t);
        const metaLabel = [kindLabel, roleLabel].filter(Boolean).join(' · ');
        const subtitle = [kindLabel, c.profession].filter(Boolean).join(' · ');
        return [c.id, getCharacterNodeSize(characterNodeViewMode, name, metaLabel, subtitle)] as const;
      }),
    );
    const visibleEdges = relationships
      .filter((r) => (
        r.chapterRevealed <= currentChapter &&
        isVisibleInTimeLayer(r.timeLayerId, currentTimeLayerId) &&
        visibleIds.has(r.sourceId) &&
        visibleIds.has(r.targetId)
      ))
      .map((r) => ({ source: r.sourceId, target: r.targetId, directed: isRelationshipDirected(r) }));

    const positions = computeForceLayout(
      visible.map((c) => c.id),
      visibleEdges,
      characterNodeViewMode === 'portrait' ? 1800 : 1400,
      characterNodeViewMode === 'portrait' ? 1300 : 1000,
      { nodeSizes },
    );

    const moves = visible
      .filter((c) => c.locked !== true)
      .map((c): LayoutMove | null => {
        const pos = positions.get(c.id);
        if (!pos) return null;
        const before = resolveTimeLayerPosition(c, currentTimeLayerId);
        if (before.x === pos.x && before.y === pos.y) return null;
        return {
          id: c.id,
          before,
          after: pos,
        };
      })
      .filter((move): move is LayoutMove => move !== null);

    if (moves.length === 0) return;

    await applyCharacterLayoutMoves(moves, 'after');
    pushUndo(
      async () => applyCharacterLayoutMoves(moves, 'before'),
      async () => applyCharacterLayoutMoves(moves, 'after'),
    );
  }, [bookId, boardLocked, characters, relationships, currentChapter, currentTimeLayerId, characterNodeViewMode, t, applyCharacterLayoutMoves, pushUndo]);

  useEffect(() => {
    onLayoutReady?.(runLayout);
  }, [onLayoutReady, runLayout]);

  const exportBoard = useCallback<BoardExportFn>(
    (options) => exportReactFlowBoard({ container: containerRef.current, nodes: rfNodes, options }),
    [rfNodes],
  );

  useEffect(() => {
    onExportReady?.(exportBoard);
  }, [onExportReady, exportBoard]);

  useEffect(() => {
    if (!bookId) return;
    const timeout = window.setTimeout(() => {
      warmReactFlowBoardExport(containerRef.current);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [bookId]);

  // ── Selection handlers ─────────────────────────────────────────────────────

  const handleNodeClick = useCallback<NodeMouseHandler>(
    (_event, node) => {
      if (boardLocked) return;
      if (node.type === 'stickyNote') {
        setSelectedNodeIds(new Set([node.id]));
        setSelectedEdgeIds(new Set());
        setEdgeStartId(null);
        onNodeSelect?.(null);
        onEdgeSelect?.(null);
        onStickyNoteSelect?.(node.id);
        onGroupRangeSelect?.(null);
        onEvidenceImageSelect?.(null);
        return;
      }
      if (node.type === 'groupRange') {
        setSelectedNodeIds(new Set([node.id]));
        setSelectedEdgeIds(new Set());
        setEdgeStartId(null);
        onNodeSelect?.(null);
        onEdgeSelect?.(null);
        onStickyNoteSelect?.(null);
        onGroupRangeSelect?.(node.id);
        onEvidenceImageSelect?.(null);
        return;
      }
      if (node.type === 'evidenceImage') {
        setSelectedNodeIds(new Set([node.id]));
        setSelectedEdgeIds(new Set());
        setEdgeStartId(null);
        onNodeSelect?.(null);
        onEdgeSelect?.(null);
        onStickyNoteSelect?.(null);
        onGroupRangeSelect?.(null);
        onEvidenceImageSelect?.(node.id);
        return;
      }
      if (edgeStartId && edgeStartId !== node.id && node.type === 'character') {
        setPendingConnection({ sourceId: edgeStartId, targetId: node.id });
        setEdgeStartId(null);
        setSelectedNodeIds(new Set([node.id]));
        setSelectedEdgeIds(new Set());
        return;
      }
      if (edgeStartId === node.id) setEdgeStartId(null);
      setSelectedNodeIds(new Set([node.id]));
      setSelectedEdgeIds(new Set());
      onNodeSelect?.(node.id);
      onEdgeSelect?.(null);
      onStickyNoteSelect?.(null);
      onGroupRangeSelect?.(null);
      onEvidenceImageSelect?.(null);
    },
    [boardLocked, edgeStartId, onNodeSelect, onEdgeSelect, onStickyNoteSelect, onGroupRangeSelect, onEvidenceImageSelect],
  );

  const handleEdgeClick = useCallback<EdgeMouseHandler>(
    (_event, edge) => {
      if (boardLocked) return;
      setSelectedEdgeIds(new Set([edge.id]));
      setSelectedNodeIds(new Set());
      onEdgeSelect?.(edge.id);
      onNodeSelect?.(null);
      onStickyNoteSelect?.(null);
      onGroupRangeSelect?.(null);
      onEvidenceImageSelect?.(null);
    },
    [boardLocked, onEdgeSelect, onNodeSelect, onStickyNoteSelect, onGroupRangeSelect, onEvidenceImageSelect],
  );

  const handlePaneClick = useCallback(() => {
    if (boardLocked) return;
    setEdgeStartId(null);
    setSelectedNodeIds(new Set());
    setSelectedEdgeIds(new Set());
    onNodeSelect?.(null);
    onEdgeSelect?.(null);
    onStickyNoteSelect?.(null);
    onGroupRangeSelect?.(null);
    onEvidenceImageSelect?.(null);
  }, [boardLocked, onNodeSelect, onEdgeSelect, onStickyNoteSelect, onGroupRangeSelect, onEvidenceImageSelect]);

  const handleSelectionChange = useCallback(
    ({ nodes: selNodes, edges: selEdges }: OnSelectionChangeParams) => {
      if (boardLocked) return;
      if (selNodes.length + selEdges.length === 0) return;
      const nodeIds = new Set(selNodes.map((n) => n.id));
      const edgeIds = new Set(selEdges.map((e) => e.id));
      setSelectedNodeIds(nodeIds);
      setSelectedEdgeIds(edgeIds);
      if (selNodes.length === 1 && selEdges.length === 0 && selNodes[0].type === 'character') {
        onNodeSelect?.(selNodes[0].id);
        onEdgeSelect?.(null);
        onStickyNoteSelect?.(null);
        onGroupRangeSelect?.(null);
        onEvidenceImageSelect?.(null);
      } else if (selNodes.length === 1 && selEdges.length === 0 && selNodes[0].type === 'stickyNote') {
        onNodeSelect?.(null);
        onEdgeSelect?.(null);
        onStickyNoteSelect?.(selNodes[0].id);
        onGroupRangeSelect?.(null);
        onEvidenceImageSelect?.(null);
      } else if (selNodes.length === 1 && selEdges.length === 0 && selNodes[0].type === 'groupRange') {
        onNodeSelect?.(null);
        onEdgeSelect?.(null);
        onStickyNoteSelect?.(null);
        onGroupRangeSelect?.(selNodes[0].id);
        onEvidenceImageSelect?.(null);
      } else if (selNodes.length === 1 && selEdges.length === 0 && selNodes[0].type === 'evidenceImage') {
        onNodeSelect?.(null);
        onEdgeSelect?.(null);
        onStickyNoteSelect?.(null);
        onGroupRangeSelect?.(null);
        onEvidenceImageSelect?.(selNodes[0].id);
      } else if (selEdges.length === 1 && selNodes.length === 0) {
        onEdgeSelect?.(selEdges[0].id);
        onNodeSelect?.(null);
        onStickyNoteSelect?.(null);
        onGroupRangeSelect?.(null);
        onEvidenceImageSelect?.(null);
      }
    },
    [boardLocked, onNodeSelect, onEdgeSelect, onStickyNoteSelect, onGroupRangeSelect, onEvidenceImageSelect],
  );

  const selectedCharacterIds = useMemo(
    () => [...selectedNodeIds].filter((id) => characters.some((character) => character.id === id)),
    [characters, selectedNodeIds],
  );

  // ── Selection tools + Delete key ──────────────────────────────────────────

  const clearSelection = useCallback(() => {
    setSelectedNodeIds(new Set());
    setSelectedEdgeIds(new Set());
    onNodeSelect?.(null);
    onEdgeSelect?.(null);
    onStickyNoteSelect?.(null);
    onGroupRangeSelect?.(null);
    onEvidenceImageSelect?.(null);
  }, [onNodeSelect, onEdgeSelect, onStickyNoteSelect, onGroupRangeSelect, onEvidenceImageSelect]);

  const deleteSelection = useCallback(
    async () => {
      if (boardLocked) return;
      if (selectedNodeIds.size === 0 && selectedEdgeIds.size === 0) return;
      const deletedRelationshipIds = new Set<string>();

      if (selectedNodeIds.size > 0) {
        const charsToDelete = characters.filter((c) => selectedNodeIds.has(c.id));
        const stickiesToDelete = stickyNotes.filter((s) => selectedNodeIds.has(s.id));
        const rangesToDelete = groupRanges.filter((r) => selectedNodeIds.has(r.id));
        const evidenceImagesToDelete = evidenceImages.filter((image) => selectedNodeIds.has(image.id));
        const relsToDelete = relationships.filter(
          (r) => selectedNodeIds.has(r.sourceId) || selectedNodeIds.has(r.targetId),
        );
        for (const rel of relsToDelete) {
          deletedRelationshipIds.add(rel.id);
          await deleteRelationship(rel.id);
          removeRelationship(rel.id);
        }
        for (const char of charsToDelete) { await deleteCharacter(char.id); removeCharacter(char.id); }
        for (const note of stickiesToDelete) { await deleteAnnotation(note.id); removeStickyNote(note.id); }
        for (const range of rangesToDelete) { await deleteGroupRange(range.id); removeGroupRange(range.id); }
        for (const image of evidenceImagesToDelete) { await deleteEvidenceImage(image.id); removeEvidenceImage(image.id); }
        if (
          charsToDelete.length > 0 ||
          stickiesToDelete.length > 0 ||
          rangesToDelete.length > 0 ||
          evidenceImagesToDelete.length > 0
        ) {
          clearSelection();
        }
        pushUndo(
          async () => {
            for (const char of charsToDelete) { await restoreCharacter(char); addCharacter(char); }
            for (const rel of relsToDelete) { await restoreRelationship(rel); addRelationship(rel); }
            for (const note of stickiesToDelete) { await restoreAnnotation(note); addStickyNote(note); }
            for (const range of rangesToDelete) { await restoreGroupRange(range); addGroupRange(range); }
            for (const image of evidenceImagesToDelete) { await restoreEvidenceImage(image); addEvidenceImage(image); }
          },
          async () => {
            for (const rel of relsToDelete) { await deleteRelationship(rel.id); removeRelationship(rel.id); }
            for (const char of charsToDelete) { await deleteCharacter(char.id); removeCharacter(char.id); }
            for (const note of stickiesToDelete) { await deleteAnnotation(note.id); removeStickyNote(note.id); }
            for (const range of rangesToDelete) { await deleteGroupRange(range.id); removeGroupRange(range.id); }
            for (const image of evidenceImagesToDelete) { await deleteEvidenceImage(image.id); removeEvidenceImage(image.id); }
          },
        );
      }

      if (selectedEdgeIds.size > 0) {
        const relsToDelete = relationships.filter((r) => selectedEdgeIds.has(r.id) && !deletedRelationshipIds.has(r.id));
        for (const rel of relsToDelete) { await deleteRelationship(rel.id); removeRelationship(rel.id); }
        if (relsToDelete.length > 0) clearSelection();
        pushUndo(
          async () => { for (const rel of relsToDelete) { await restoreRelationship(rel); addRelationship(rel); } },
          async () => { for (const rel of relsToDelete) { await deleteRelationship(rel.id); removeRelationship(rel.id); } },
        );
      }
    },
    [selectedNodeIds, selectedEdgeIds, characters, relationships, stickyNotes, groupRanges, evidenceImages,
     addCharacter, removeCharacter, addRelationship, removeRelationship,
     addStickyNote, removeStickyNote, addGroupRange, removeGroupRange, addEvidenceImage, removeEvidenceImage,
     pushUndo, clearSelection, boardLocked],
  );

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        setEdgeStartId(null);
        return;
      }
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const target = e.target as HTMLElement;
      if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      e.preventDefault();
      await deleteSelection();
    },
    [deleteSelection],
  );

  // ── Node add + drag ────────────────────────────────────────────────────────

  const handleAddCharacterClick = useCallback(() => {
    if (!bookId) return;
    const container = containerRef.current;
    if (!container) return;
    const bounds = container.getBoundingClientRect();
    const position = screenToFlowPosition({
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    });
    const { zoom } = getViewport();
    const jitter = (characters.length % 5) * (60 / zoom);
    setPendingPosition({ x: position.x + jitter, y: position.y + jitter });
  }, [bookId, screenToFlowPosition, getViewport, characters.length]);

  const handleStartEdgeFromSelection = useCallback((requestedSourceId?: string | null) => {
    if (boardLocked) return;
    if (requestedSourceId && characters.some((character) => character.id === requestedSourceId)) {
      setSelectedNodeIds(new Set([requestedSourceId]));
      setSelectedEdgeIds(new Set());
      setEdgeStartId(requestedSourceId);
      return;
    }

    const selectedCharacterIds = [...selectedNodeIds].filter((id) =>
      characters.some((character) => character.id === id),
    );
    if (selectedCharacterIds.length !== 1) return;
    setEdgeStartId(selectedCharacterIds[0]);
  }, [boardLocked, characters, selectedNodeIds]);

  useEffect(() => {
    if (
      newCharacterRequestId > 0 &&
      newCharacterRequestId !== handledNewCharacterRequestId.current
    ) {
      handledNewCharacterRequestId.current = newCharacterRequestId;
      handleAddCharacterClick();
    }
  }, [newCharacterRequestId, handleAddCharacterClick]);

  useEffect(() => {
    if (
      startEdgeRequestId > 0 &&
      startEdgeRequestId !== handledStartEdgeRequestId.current
    ) {
      handledStartEdgeRequestId.current = startEdgeRequestId;
      handleStartEdgeFromSelection(startEdgeSourceId);
    }
  }, [startEdgeRequestId, startEdgeSourceId, handleStartEdgeFromSelection]);

  const handleNodeDragStart = useCallback((_event: React.MouseEvent, node: Node) => {
    if (boardLocked) return;
    if (lockedNodeIds.has(node.id)) return;
    isDraggingRef.current = true;
    // Record starting position for undo
    dragStartPositions.current.set(node.id, { x: node.position.x, y: node.position.y });
  }, [boardLocked, lockedNodeIds]);

  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      isDraggingRef.current = false;
      if (!bookId) return;
      if (boardLocked) return;
      if (lockedNodeIds.has(node.id)) return;

      const oldPos = dragStartPositions.current.get(node.id);
      const newPos = node.position;
      dragStartPositions.current.delete(node.id);

      if (node.type === 'character') {
        const char = characters.find((c) => c.id === node.id);
        if (!char) return;
        const newPatch = characterPositionPatchForLayer(char, newPos, currentTimeLayerId);
        void updateCharacter(node.id, newPatch);
        updateCharacterInStore({ ...char, ...newPatch });
        if (oldPos && (oldPos.x !== newPos.x || oldPos.y !== newPos.y)) {
          const oldPatch = characterPositionPatchForLayer(char, oldPos, currentTimeLayerId);
          pushUndo(
            async () => {
              const latest = useGraphStore.getState().characters.find((c) => c.id === node.id) ?? char;
              const updated = await updateCharacter(
                node.id,
                characterPositionPatchForLayer(latest, oldPos, currentTimeLayerId),
              );
              updateCharacterInStore(updated);
            },
            async () => {
              const latest = useGraphStore.getState().characters.find((c) => c.id === node.id) ?? { ...char, ...oldPatch };
              const updated = await updateCharacter(
                node.id,
                characterPositionPatchForLayer(latest, newPos, currentTimeLayerId),
              );
              updateCharacterInStore(updated);
            },
          );
        }
      } else if (node.type === 'stickyNote') {
        const note = stickyNotes.find((s) => s.id === node.id);
        if (!note) return;
        void updateAnnotation(node.id, { position: newPos });
        updateStickyNoteInStore({ ...note, position: newPos });
        // Add undo for sticky note position
        if (oldPos && (oldPos.x !== newPos.x || oldPos.y !== newPos.y)) {
          pushUndo(
            async () => { await updateAnnotation(node.id, { position: oldPos }); updateStickyNoteInStore({ ...note, position: oldPos }); },
            async () => { await updateAnnotation(node.id, { position: newPos }); updateStickyNoteInStore({ ...note, position: newPos }); },
          );
        }
      } else if (node.type === 'groupRange') {
        const range = groupRanges.find((r) => r.id === node.id);
        if (!range) return;
        void updateGroupRange(node.id, { position: newPos });
        updateGroupRangeInStore({ ...range, position: newPos });
        if (oldPos && (oldPos.x !== newPos.x || oldPos.y !== newPos.y)) {
          pushUndo(
            async () => { await updateGroupRange(node.id, { position: oldPos }); updateGroupRangeInStore({ ...range, position: oldPos }); },
            async () => { await updateGroupRange(node.id, { position: newPos }); updateGroupRangeInStore({ ...range, position: newPos }); },
          );
        }
      } else if (node.type === 'evidenceImage') {
        const image = evidenceImages.find((item) => item.id === node.id);
        if (!image) return;
        void updateEvidenceImage(node.id, { position: newPos });
        updateEvidenceImageInStore({ ...image, position: newPos });
        if (oldPos && (oldPos.x !== newPos.x || oldPos.y !== newPos.y)) {
          pushUndo(
            async () => { await updateEvidenceImage(node.id, { position: oldPos }); updateEvidenceImageInStore({ ...image, position: oldPos }); },
            async () => { await updateEvidenceImage(node.id, { position: newPos }); updateEvidenceImageInStore({ ...image, position: newPos }); },
          );
        }
      }
    },
    [bookId, boardLocked, lockedNodeIds, characters, stickyNotes, groupRanges, evidenceImages, currentTimeLayerId, updateCharacterInStore, updateStickyNoteInStore, updateGroupRangeInStore, updateEvidenceImageInStore, pushUndo],
  );

  const toggleBoardLocked = useCallback(() => {
    setBoardLocked((locked) => {
      const next = !locked;
      if (next) setEdgeStartId(null);
      return next;
    });
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ width: '100%', height: '100%', outline: 'none', position: 'relative' }}
    >
      <ReactFlow
        className={[
          touchMode ? 'react-flow--touch-mode' : '',
          boardLocked ? 'react-flow--board-locked' : '',
        ].filter(Boolean).join(' ') || undefined}
        nodes={rfNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={!boardLocked}
        nodesConnectable={!boardLocked}
        elementsSelectable={!boardLocked}
        panOnDrag={!boardLocked}
        zoomOnScroll={!boardLocked}
        zoomOnPinch={!boardLocked}
        zoomOnDoubleClick={!boardLocked}
        selectionOnDrag={!boardLocked && !touchMode}
        selectionKeyCode="Shift"
        nodeDragThreshold={touchMode ? 6 : 1}
        paneClickDistance={touchMode ? 8 : 0}
        nodeClickDistance={touchMode ? 8 : 0}
        connectionDragThreshold={touchMode ? 8 : 1}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1.1 }}
        onNodesChange={handleNodesChange}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        onSelectionChange={handleSelectionChange}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        connectionLineStyle={{ stroke: 'var(--accent)', strokeDasharray: '6 3', strokeWidth: 1.5, opacity: 0.7 }}
        proOptions={{ hideAttribution: true }}
        onConnect={(connection) => {
          if (boardLocked) return;
          if (!bookId || !connection.source || !connection.target) return;
          if (!visibleCharIds.has(connection.source) || !visibleCharIds.has(connection.target)) return;
          setPendingConnection({ sourceId: connection.source, targetId: connection.target });
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="var(--ink-200)" />
        <Controls position="bottom-left" showInteractive={false}>
          <ControlButton
            className={`react-flow__controls-interactive ${boardLocked ? 'is-locked' : ''}`}
            onClick={toggleBoardLocked}
            title={boardLocked ? t('canvas.unlockBoard') : t('canvas.lockBoard')}
            aria-label={boardLocked ? t('canvas.unlockBoard') : t('canvas.lockBoard')}
            aria-pressed={boardLocked}
          >
            {boardLocked ? <Lock size={13} /> : <Unlock size={13} />}
          </ControlButton>
        </Controls>
        <MiniMap
          position="bottom-right"
          nodeColor={(node) => {
            if (node.type === 'groupRange') {
              const range = (node.data as { range?: GroupRange }).range;
              return GROUP_RANGE_COLOR_MAP[range?.color ?? 'ochre'].border;
            }
            if (node.type === 'stickyNote') {
              const note = (node.data as { note?: { color?: string } }).note;
              const colorMap: Record<string, string> = {
                yellow: '#fde047', green: '#86efac', blue: '#93c5fd',
                pink: '#f9a8d4', purple: '#c4b5fd',
              };
              return colorMap[note?.color ?? 'yellow'] ?? '#fde047';
            }
            if (node.type === 'evidenceImage') return '#8a6d3b';
            const role = getCharacterRoleVisualKey((node.data as { role?: string }).role);
            const map: Record<string, string> = {
              detective: '#2c5f7c', suspect: '#8b2e2e', victim: '#5c5c5c',
              witness: '#7c6f2c', bystander: '#9a9a95', murderer: '#111111', other: '#6b6b65',
            };
            return map[role] ?? '#6b6b65';
          }}
          nodeStrokeWidth={0}
          maskColor="color-mix(in srgb, var(--ink-900) 12%, transparent)"
          style={{ width: 180, height: 110, borderRadius: 5 }}
          zoomable
          pannable
        />
      </ReactFlow>

      {boardLocked && (
        <div className="board-lock-indicator" data-testid="board-lock-indicator">
          <Lock size={13} />
          <span>{t('canvas.boardLocked')}</span>
        </div>
      )}

      <div
        aria-label={t('help.ariaLabel')}
        title={t('help.ariaLabel')}
        data-testid="keyboard-shortcuts-legend"
        data-help-surface="canvas"
        className={`shortcut-legend ${helpOpen ? 'shortcut-legend--open' : ''}`}
        style={{
          position: 'absolute',
          right: 14,
          top: 14,
          zIndex: 8,
          width: 'min(520px, calc(100vw - 36px))',
          boxSizing: 'border-box',
          padding: 0,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 6,
        }}
      >
        <button
          type="button"
          data-testid="canvas-help-trigger"
          aria-expanded={helpOpen}
          onClick={() => setHelpOpen((open) => !open)}
          style={{
            padding: '5px 9px 5px 8px',
            background: 'var(--bg-panel)',
            border: '1px solid var(--ink-200)',
            borderRadius: 999,
            boxShadow: 'var(--shadow-soft)',
            fontSize: 11,
            color: 'var(--ink-600)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            font: 'inherit',
            pointerEvents: 'auto',
          }}
        >
          <span
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 14,
              height: 14,
              borderRadius: 999,
              border: '1px solid var(--ink-300)',
              color: 'var(--ink-500)',
              fontSize: 9.5,
              fontWeight: 600,
            }}
          >
            ?
          </span>
          {t('help.title')}
        </button>
        <div
          className="shortcut-panel"
          data-testid="canvas-help-panel"
          style={{
            width: 'min(520px, calc(100vw - 36px))',
            maxWidth: 'calc(100vw - 36px)',
            boxSizing: 'border-box',
            padding: '11px 12px 12px',
            borderRadius: 6,
            border: '1px solid var(--ink-200)',
            background: 'var(--bg-panel)',
            boxShadow: 'var(--shadow-pop)',
            opacity: helpOpen ? 1 : 0,
            transform: helpOpen ? 'translateY(0)' : 'translateY(-4px)',
            pointerEvents: helpOpen ? 'auto' : 'none',
            transition: 'opacity var(--transition-fast), transform var(--transition-fast)',
          }}
        >
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--ink-400)',
            letterSpacing: '.12em',
            textTransform: 'uppercase',
            fontWeight: 700,
            marginBottom: 7,
          }}>
            {t('help.shortcuts')}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))',
              gap: 6,
              fontSize: 11,
              color: 'var(--ink-600)',
            }}
          >
            {shortcuts.map(([key, label]) => (
              <div
                key={`${key}-${label}`}
                style={{
                  minWidth: 0,
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr',
                  alignItems: 'center',
                  columnGap: 6,
                  padding: '4px 5px',
                  border: '1px solid var(--ink-150)',
                  borderRadius: 4,
                  background: 'color-mix(in srgb, var(--bg-canvas) 70%, transparent)',
                }}
              >
                <span style={kbdStyle}>{key}</span>
                <span
                  style={{
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontWeight: 500,
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div
            style={{
              height: 1,
              background: 'var(--ink-150)',
              margin: '10px 0 9px',
            }}
          />
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--ink-400)',
            letterSpacing: '.12em',
            textTransform: 'uppercase',
            fontWeight: 700,
            marginBottom: 7,
          }}>
            {t('help.tools')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 8 }}>
            {helpTools.map((tool) => (
              <div
                key={tool.key}
                style={{
                  minWidth: 0,
                  display: 'grid',
                  gridTemplateColumns: '18px 1fr',
                  columnGap: 8,
                  alignItems: 'start',
                  padding: '6px',
                  border: '1px solid var(--ink-150)',
                  borderRadius: 4,
                  background: 'color-mix(in srgb, var(--bg-canvas) 62%, transparent)',
                  color: 'var(--ink-600)',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    border: '1px solid var(--ink-200)',
                    background: 'var(--bg-canvas)',
                    color: 'var(--ink-600)',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {tool.icon}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-900)', fontWeight: 700, lineHeight: 1.15 }}>
                    {tool.label}
                  </span>
                  <span style={{ display: 'block', marginTop: 1, fontSize: 10.5, color: 'var(--ink-500)', lineHeight: 1.3 }}>
                    {tool.body}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {edgeStartId && (
        <div
          data-testid="edge-start-hint"
          style={{
            position: 'absolute',
            top: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9,
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid color-mix(in srgb, var(--accent) 40%, var(--ink-200))',
            background: 'color-mix(in srgb, var(--bg-panel) 94%, transparent)',
            color: 'var(--ink-900)',
            boxShadow: 'var(--shadow-panel)',
            fontSize: 12,
            fontWeight: 600,
            pointerEvents: 'none',
          }}
        >
          {t('shortcut.edgeModeHint')}
        </div>
      )}

      {touchMode && !boardLocked && (selectedNodeIds.size > 0 || selectedEdgeIds.size > 0) && (
        <div
          className="canvas-action-dock"
          data-testid="canvas-action-dock"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="canvas-action-button"
            onClick={onRequestInspector}
            title={t('app.editSelection')}
          >
            <PanelRight size={15} />
            <span>{t('app.editSelection')}</span>
          </button>
          {selectedCharacterIds.length === 1 && (
            <button
              type="button"
              className="canvas-action-button"
              onClick={() => handleStartEdgeFromSelection(selectedCharacterIds[0])}
              title={t('shortcut.connectEdge')}
            >
              <Link2 size={15} />
              <span>{t('shortcut.connectEdge')}</span>
            </button>
          )}
          <button
            type="button"
            className="canvas-action-button canvas-action-button--danger"
            onClick={() => void deleteSelection()}
            title={t('shortcut.deleteSelection')}
          >
            <Trash2 size={15} />
            <span>{t('shortcut.deleteSelection')}</span>
          </button>
        </div>
      )}

      <style>{`
        .react-flow__node-groupRange {
          z-index: -20 !important;
        }
        .react-flow__node-groupRange.selected {
          z-index: 1 !important;
          pointer-events: none;
        }
        .react-flow__node-groupRange.selected [data-testid="group-range-node"] {
          background: transparent !important;
          pointer-events: none;
        }
        .react-flow__node-groupRange.selected [data-testid="group-range-label"],
        .react-flow__node-groupRange.selected .react-flow__resize-control {
          pointer-events: auto !important;
        }
        .calabash-board-exporting [data-testid="group-range-label"] {
          max-width: none !important;
          overflow: visible !important;
          text-overflow: clip !important;
          white-space: nowrap !important;
        }
        .shortcut-legend {
          pointer-events: none !important;
        }
        .shortcut-legend--open .shortcut-panel {
          opacity: 1 !important;
          transform: translateY(0) !important;
          pointer-events: auto !important;
        }
      `}</style>

      {pendingPosition !== null && bookId !== null && (
        <NewCharacterModal
          position={pendingPosition}
          bookId={bookId}
          currentChapter={currentChapter}
          timeLayerId={currentTimeLayerId === ALL_TIME_LAYERS_ID ? null : currentTimeLayerId}
          onClose={() => setPendingPosition(null)}
          onCreated={() => setPendingPosition(null)}
        />
      )}

      {pendingConnection !== null && bookId !== null && (
        <NewRelationshipModal
          bookId={bookId}
          sourceId={pendingConnection.sourceId}
          targetId={pendingConnection.targetId}
          currentChapter={currentChapter}
          timeLayerId={currentTimeLayerId === ALL_TIME_LAYERS_ID ? null : currentTimeLayerId}
          onClose={() => setPendingConnection(null)}
          onCreated={() => setPendingConnection(null)}
        />
      )}
    </div>
  );
}

export default function CalabashCanvas(props: CalabashCanvasProps) {
  return (
    <ReactFlowProvider>
      <CalabashCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
