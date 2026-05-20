import type { Node } from '@xyflow/react';
import { toBlob } from 'html-to-image';
import { jsPDF } from 'jspdf';

export type BoardExportFormat = 'png' | 'pdf';

export interface BoardExportOptions {
  format: BoardExportFormat;
  transparent: boolean;
}

export type BoardExportFn = (options: BoardExportOptions) => Promise<Blob>;

const EXPORT_PADDING = 96;
const EXPORT_MAX_LONG_SIDE = 2600;
const EXPORT_MIN_LONG_SIDE = 1200;

interface ExportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function getVisibleNodeBounds(nodes: Node[]): ExportBounds | null {
  const exportableNodes = nodes.filter((node) => node.type !== undefined);
  if (exportableNodes.length === 0) return null;

  return exportableNodes.reduce<ExportBounds>((bounds, node) => {
    const width = getNodeDimension(node, 'width', 180);
    const height = getNodeDimension(node, 'height', 120);
    return {
      minX: Math.min(bounds.minX, node.position.x),
      minY: Math.min(bounds.minY, node.position.y),
      maxX: Math.max(bounds.maxX, node.position.x + width),
      maxY: Math.max(bounds.maxY, node.position.y + height),
    };
  }, {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  });
}

function getNodeDimension(node: Node, dimension: 'width' | 'height', fallback: number) {
  const explicit = node[dimension];
  if (typeof explicit === 'number' && explicit > 0) return explicit;

  const measured = node.measured?.[dimension];
  if (typeof measured === 'number' && measured > 0) return measured;

  return fallback;
}

export function getBoardExportDimensions(bounds: ExportBounds) {
  const contentWidth = Math.max(1, bounds.maxX - bounds.minX + EXPORT_PADDING * 2);
  const contentHeight = Math.max(1, bounds.maxY - bounds.minY + EXPORT_PADDING * 2);
  const longSide = Math.max(contentWidth, contentHeight);
  const targetLongSide = Math.min(EXPORT_MAX_LONG_SIDE, Math.max(EXPORT_MIN_LONG_SIDE, longSide));
  const scale = targetLongSide / longSide;

  return {
    width: Math.round(contentWidth * scale),
    height: Math.round(contentHeight * scale),
    scale,
    offsetX: Math.round((-bounds.minX + EXPORT_PADDING) * scale),
    offsetY: Math.round((-bounds.minY + EXPORT_PADDING) * scale),
  };
}

export async function exportReactFlowBoard(input: {
  container: HTMLElement | null;
  nodes: Node[];
  options: BoardExportOptions;
}): Promise<Blob> {
  const viewport = input.container?.querySelector<HTMLElement>('.react-flow__viewport');
  const bounds = getVisibleNodeBounds(input.nodes);
  if (!viewport || !bounds) throw new Error('No board content to export');

  const dimensions = getBoardExportDimensions(bounds);
  const backgroundColor = input.options.transparent
    ? 'transparent'
    : cssVar('--bg-canvas', '#f4ecd3');

  const pngBlob = await toBlob(viewport, {
    backgroundColor,
    // Portraits are backed by blob: URLs; adding cache-busting query params breaks them.
    cacheBust: false,
    width: dimensions.width,
    height: dimensions.height,
    pixelRatio: 1,
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return true;
      return !(
        node.classList.contains('react-flow__handle') ||
        node.classList.contains('react-flow__resize-control')
      );
    },
    style: {
      width: `${dimensions.width}px`,
      height: `${dimensions.height}px`,
      overflow: 'visible',
      transform: `translate(${dimensions.offsetX}px, ${dimensions.offsetY}px) scale(${dimensions.scale})`,
      transformOrigin: 'top left',
    },
  });

  if (!pngBlob) throw new Error('Board export failed');
  if (input.options.format === 'png') return pngBlob;

  const pdf = new jsPDF({
    orientation: dimensions.width >= dimensions.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [dimensions.width, dimensions.height],
    compress: true,
  });
  pdf.addImage(await blobToDataUrl(pngBlob), 'PNG', 0, 0, dimensions.width, dimensions.height);
  return pdf.output('blob');
}

function cssVar(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image data'));
    reader.readAsDataURL(blob);
  });
}
