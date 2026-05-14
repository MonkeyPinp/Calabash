import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
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
import '@xyflow/react/dist/style.css';
import type { Character, Relationship, StickyNote } from '@/types';
import CharacterNode from './CharacterNode';
import RelationshipEdge from './RelationshipEdge';
import StickyNoteNode from './StickyNoteNode';
import NewCharacterModal from './NewCharacterModal';
import NewRelationshipModal from './NewRelationshipModal';
import { resolveDisplayName } from '@/lib/aliases';
import { formatCharacterRole, getCharacterRoleVisualKey, resolveCharacterRole } from '@/lib/roles';
import { getRelationshipTypeMarkerColor, isRelationshipDirected } from '@/lib/relationshipTypes';
import { deleteCharacter, restoreCharacter, updateCharacter } from '@/db/characters';
import { deleteRelationship, restoreRelationship } from '@/db/relationships';
import { updateAnnotation, deleteAnnotation, restoreAnnotation } from '@/db/annotations';
import { computeForceLayout } from '@/lib/layout';
import { isStickyNoteVisibleAtChapter } from '@/lib/stickyNotes';
import { useGraphStore } from '@/stores/graphStore';
import { useT } from '@/i18n';
import type { CharacterNodeViewMode } from '@/stores/uiStore';

const nodeTypes = { character: CharacterNode, stickyNote: StickyNoteNode };
const edgeTypes = { relationship: RelationshipEdge };
const EMPTY_STICKY_NOTES: StickyNote[] = [];

const DEFAULT_CHARACTER_NODE_WIDTH = 184;
const CHARACTER_NODE_MAX_WIDTH = 440;
const CHARACTER_NODE_MIN_HEIGHT = 76;
const CHARACTER_NODE_TEXT_INSET = 78;
const PORTRAIT_CHARACTER_NODE_WIDTH = 176;
const PORTRAIT_CHARACTER_NODE_HEIGHT = 252;

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
  const nameLines = estimateWrappedLines(name, textWidth, 7.3);
  const metaLines = estimateWrappedLines(metaText, textWidth, 5.8);
  const height = Math.max(
    CHARACTER_NODE_MIN_HEIGHT,
    32 + nameLines * 17 + (metaLines > 0 ? 4 + metaLines * 14 : 0) + 18,
  );
  return { width, height };
}

function getCharacterNodeSize(
  viewMode: CharacterNodeViewMode,
  name: string,
  roleLabel: string,
  subtitle?: string,
) {
  return viewMode === 'portrait'
    ? { width: PORTRAIT_CHARACTER_NODE_WIDTH, height: PORTRAIT_CHARACTER_NODE_HEIGHT }
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
  characterNodeViewMode?: CharacterNodeViewMode;
  currentChapter: number;
  bookId: string | null;
  newCharacterRequestId?: number;
  startEdgeRequestId?: number;
  startEdgeSourceId?: string | null;
  onNodeSelect?: (id: string | null) => void;
  onEdgeSelect?: (id: string | null) => void;
  onStickyNoteSelect?: (id: string | null) => void;
  onFitViewReady?: (fn: () => void) => void;
  onLayoutReady?: (fn: () => Promise<void>) => void;
}

function CalabashCanvasInner({
  characters,
  relationships,
  stickyNotes = EMPTY_STICKY_NOTES,
  characterNodeViewMode = 'text',
  currentChapter,
  bookId,
  newCharacterRequestId = 0,
  startEdgeRequestId = 0,
  startEdgeSourceId = null,
  onNodeSelect,
  onEdgeSelect,
  onStickyNoteSelect,
  onFitViewReady,
  onLayoutReady,
}: CalabashCanvasProps) {
  const t = useT();
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null);
  const [pendingConnection, setPendingConnection] = useState<{ sourceId: string; targetId: string } | null>(null);
  const [edgeStartId, setEdgeStartId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    onFitViewReady?.(fitView);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Character nodes
  const characterNodes: Node[] = useMemo(
    () =>
      characters
        .filter((c) => c.chapterIntroduced <= currentChapter)
        .map((c) => {
          const name = resolveDisplayName(c.aliases, currentChapter);
          const role = resolveCharacterRole(c, currentChapter);
          const roleLabel = formatCharacterRole(role, t);
          const { width, height } = getCharacterNodeSize(characterNodeViewMode, name, roleLabel, c.profession);
          return {
            id: c.id,
            type: 'character',
            position: c.position,
            width,
            height,
            style: { width, minHeight: height },
            data: {
              name,
              width,
              height,
              viewMode: characterNodeViewMode,
              role,
              profession: c.profession,
              portraitId: c.portraitId,
              chapterIntroduced: c.chapterIntroduced,
            },
          };
        }),
    [characters, currentChapter, characterNodeViewMode, t],
  );

  // Sticky note nodes
  const stickyNoteNodes: Node[] = useMemo(
    () =>
      stickyNotes
        .filter((s) => isStickyNoteVisibleAtChapter(s, currentChapter))
        .map((s) => ({
          id: s.id,
          type: 'stickyNote',
          position: s.position,
          width: s.width,
          height: s.height,
          style: { width: s.width, height: s.height },
          data: { note: s },
        })),
    [stickyNotes, currentChapter],
  );

  const allComputedNodes: Node[] = useMemo(
    () => [...characterNodes, ...stickyNoteNodes],
    [characterNodes, stickyNoteNodes],
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
    setRfNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const edges: Edge[] = useMemo(() => {
    const visible = relationships.filter(
      (r) =>
        r.chapterRevealed <= currentChapter &&
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

      const color = getRelationshipTypeMarkerColor(r.type);
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
        data: { certainty: r.certainty, type: r.type, relationship: r, pathOffset },
      };
    });
  }, [relationships, visibleCharIds, currentChapter, nodeCenter]);

  // ── Auto-layout (lives here so it has direct access to setRfNodes + fitView) ──

  const runLayout = useCallback(async () => {
    if (!bookId) return;
    const visible = characters.filter((c) => c.chapterIntroduced <= currentChapter);
    const visibleIds = new Set(visible.map((c) => c.id));
    const nodeSizes = new Map(
      visible.map((c) => {
        const name = resolveDisplayName(c.aliases, currentChapter);
        const role = resolveCharacterRole(c, currentChapter);
        const roleLabel = formatCharacterRole(role, t);
        return [c.id, getCharacterNodeSize(characterNodeViewMode, name, roleLabel, c.profession)] as const;
      }),
    );
    const visibleEdges = relationships
      .filter((r) => r.chapterRevealed <= currentChapter && visibleIds.has(r.sourceId) && visibleIds.has(r.targetId))
      .map((r) => ({ source: r.sourceId, target: r.targetId, directed: isRelationshipDirected(r) }));

    const positions = computeForceLayout(
      visible.map((c) => c.id),
      visibleEdges,
      characterNodeViewMode === 'portrait' ? 1800 : 1400,
      characterNodeViewMode === 'portrait' ? 1300 : 1000,
      { nodeSizes },
    );

    // Write to DB + Zustand
    await Promise.all(
      visible.map(async (c) => {
        const pos = positions.get(c.id);
        if (!pos) return;
        await updateCharacter(c.id, { position: pos });
        updateCharacterInStore({ ...c, position: pos });
      }),
    );

    // Directly update rfNodes (bypasses the async useEffect chain)
    setRfNodes((nds) =>
      nds.map((n) => {
        if (n.type !== 'character') return n;
        const pos = positions.get(n.id);
        return pos ? { ...n, position: pos } : n;
      }),
    );

    // fitView after React Flow renders the new rfNodes (double rAF ensures post-paint)
    requestAnimationFrame(() => requestAnimationFrame(() => fitView({ padding: 0.15, maxZoom: 1.1 })));
  }, [bookId, characters, relationships, currentChapter, characterNodeViewMode, t, updateCharacterInStore, fitView]);

  useEffect(() => {
    onLayoutReady?.(runLayout);
  }, [onLayoutReady, runLayout]);

  // ── Selection handlers ─────────────────────────────────────────────────────

  const handleNodeClick = useCallback<NodeMouseHandler>(
    (_event, node) => {
      if (node.type === 'stickyNote') {
        setSelectedNodeIds(new Set([node.id]));
        setSelectedEdgeIds(new Set());
        setEdgeStartId(null);
        onNodeSelect?.(null);
        onEdgeSelect?.(null);
        onStickyNoteSelect?.(node.id);
        return;
      }
      if (edgeStartId && edgeStartId !== node.id) {
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
    },
    [edgeStartId, onNodeSelect, onEdgeSelect, onStickyNoteSelect],
  );

  const handleEdgeClick = useCallback<EdgeMouseHandler>(
    (_event, edge) => {
      setSelectedEdgeIds(new Set([edge.id]));
      setSelectedNodeIds(new Set());
      onEdgeSelect?.(edge.id);
      onNodeSelect?.(null);
      onStickyNoteSelect?.(null);
    },
    [onEdgeSelect, onNodeSelect, onStickyNoteSelect],
  );

  const handlePaneClick = useCallback(() => {
    setEdgeStartId(null);
    setSelectedNodeIds(new Set());
    setSelectedEdgeIds(new Set());
    onNodeSelect?.(null);
    onEdgeSelect?.(null);
    onStickyNoteSelect?.(null);
  }, [onNodeSelect, onEdgeSelect, onStickyNoteSelect]);

  const handleSelectionChange = useCallback(
    ({ nodes: selNodes, edges: selEdges }: OnSelectionChangeParams) => {
      if (selNodes.length + selEdges.length === 0) return;
      const nodeIds = new Set(selNodes.map((n) => n.id));
      const edgeIds = new Set(selEdges.map((e) => e.id));
      setSelectedNodeIds(nodeIds);
      setSelectedEdgeIds(edgeIds);
      if (selNodes.length === 1 && selEdges.length === 0 && selNodes[0].type !== 'stickyNote') {
        onNodeSelect?.(selNodes[0].id);
        onEdgeSelect?.(null);
        onStickyNoteSelect?.(null);
      } else if (selNodes.length === 1 && selEdges.length === 0 && selNodes[0].type === 'stickyNote') {
        onNodeSelect?.(null);
        onEdgeSelect?.(null);
        onStickyNoteSelect?.(selNodes[0].id);
      } else if (selEdges.length === 1 && selNodes.length === 0) {
        onEdgeSelect?.(selEdges[0].id);
        onNodeSelect?.(null);
        onStickyNoteSelect?.(null);
      }
    },
    [onNodeSelect, onEdgeSelect, onStickyNoteSelect],
  );

  // ── Delete key ─────────────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        setEdgeStartId(null);
        return;
      }
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      if (selectedNodeIds.size > 0) {
        const charsToDelete = characters.filter((c) => selectedNodeIds.has(c.id));
        const stickiesToDelete = stickyNotes.filter((s) => selectedNodeIds.has(s.id));
        const relsToDelete = relationships.filter(
          (r) => selectedNodeIds.has(r.sourceId) || selectedNodeIds.has(r.targetId),
        );
        for (const rel of relsToDelete) { await deleteRelationship(rel.id); removeRelationship(rel.id); }
        for (const char of charsToDelete) { await deleteCharacter(char.id); removeCharacter(char.id); }
        for (const note of stickiesToDelete) { await deleteAnnotation(note.id); removeStickyNote(note.id); }
        if (stickiesToDelete.length > 0) onStickyNoteSelect?.(null);
        pushUndo(
          async () => {
            for (const char of charsToDelete) { await restoreCharacter(char); addCharacter(char); }
            for (const rel of relsToDelete) { await restoreRelationship(rel); addRelationship(rel); }
            for (const note of stickiesToDelete) { await restoreAnnotation(note); addStickyNote(note); }
          },
          async () => {
            for (const rel of relsToDelete) { await deleteRelationship(rel.id); removeRelationship(rel.id); }
            for (const char of charsToDelete) { await deleteCharacter(char.id); removeCharacter(char.id); }
            for (const note of stickiesToDelete) { await deleteAnnotation(note.id); removeStickyNote(note.id); }
          },
        );
      }

      if (selectedEdgeIds.size > 0) {
        const relsToDelete = relationships.filter((r) => selectedEdgeIds.has(r.id));
        for (const rel of relsToDelete) { await deleteRelationship(rel.id); removeRelationship(rel.id); }
        pushUndo(
          async () => { for (const rel of relsToDelete) { await restoreRelationship(rel); addRelationship(rel); } },
          async () => { for (const rel of relsToDelete) { await deleteRelationship(rel.id); removeRelationship(rel.id); } },
        );
      }
    },
    [selectedNodeIds, selectedEdgeIds, characters, relationships, stickyNotes,
     addCharacter, removeCharacter, addRelationship, removeRelationship,
     addStickyNote, removeStickyNote, pushUndo, onStickyNoteSelect],
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
  }, [characters, selectedNodeIds]);

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
    isDraggingRef.current = true;
    // Record starting position for undo
    dragStartPositions.current.set(node.id, { x: node.position.x, y: node.position.y });
  }, []);

  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      isDraggingRef.current = false;
      if (!bookId) return;

      const oldPos = dragStartPositions.current.get(node.id);
      const newPos = node.position;
      dragStartPositions.current.delete(node.id);

      if (node.type === 'character') {
        const char = characters.find((c) => c.id === node.id);
        if (!char) return;
        void updateCharacter(node.id, { position: newPos });
        updateCharacterInStore({ ...char, position: newPos });
        // Character position undo is optional; skip for now to keep undo stack cleaner
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
      }
    },
    [bookId, characters, stickyNotes, updateCharacterInStore, updateStickyNoteInStore, pushUndo],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ width: '100%', height: '100%', outline: 'none', position: 'relative' }}
    >
      <ReactFlow
        nodes={rfNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        panOnDrag
        selectionOnDrag
        selectionKeyCode="Shift"
        nodeDragThreshold={1}
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
          if (!bookId || !connection.source || !connection.target) return;
          const sourceIsStickyNote = stickyNotes.some((s) => s.id === connection.source);
          const targetIsStickyNote = stickyNotes.some((s) => s.id === connection.target);
          if (sourceIsStickyNote || targetIsStickyNote) return;
          setPendingConnection({ sourceId: connection.source, targetId: connection.target });
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="var(--ink-200)" />
        <Controls position="bottom-left" />
        <MiniMap
          position="bottom-right"
          nodeColor={(node) => {
            if (node.type === 'stickyNote') {
              const note = (node.data as { note?: { color?: string } }).note;
              const colorMap: Record<string, string> = {
                yellow: '#fde047', green: '#86efac', blue: '#93c5fd',
                pink: '#f9a8d4', purple: '#c4b5fd',
              };
              return colorMap[note?.color ?? 'yellow'] ?? '#fde047';
            }
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

      <div
        aria-label="Keyboard shortcuts"
        data-testid="keyboard-shortcuts-legend"
        className="shortcut-legend"
        style={{
          position: 'absolute',
          right: 14,
          top: 14,
          zIndex: 8,
          width: 178,
          boxSizing: 'border-box',
          padding: 0,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 6,
        }}
      >
        <div
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
          Shortcuts
        </div>
        <div
          className="shortcut-panel"
          style={{
            width: 178,
            boxSizing: 'border-box',
            padding: '10px 12px 11px',
            borderRadius: 6,
            border: '1px solid var(--ink-200)',
            background: 'var(--bg-panel)',
            boxShadow: 'var(--shadow-pop)',
            opacity: 0,
            transform: 'translateY(-4px)',
            transition: 'opacity var(--transition-fast), transform var(--transition-fast)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              columnGap: 10,
              rowGap: 5,
              fontSize: 11,
              color: 'var(--ink-600)',
            }}
          >
            {shortcuts.map(([key, label]) => (
              <div key={`${key}-${label}`} style={{ display: 'contents' }}>
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

      <style>{`
        .shortcut-legend {
          pointer-events: auto !important;
        }
        .shortcut-legend:hover .shortcut-panel,
        .shortcut-legend:focus-within .shortcut-panel {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
      `}</style>

      {pendingPosition !== null && bookId !== null && (
        <NewCharacterModal
          position={pendingPosition}
          bookId={bookId}
          currentChapter={currentChapter}
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
