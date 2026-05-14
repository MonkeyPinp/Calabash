import type { GroupRange, GroupRangeColor } from '@/types';

export const GROUP_RANGE_COLORS: GroupRangeColor[] = ['ochre', 'blue', 'green', 'red', 'violet'];
export const GROUP_RANGE_DEFAULT_LABEL_FONT_SIZE = 16;
export const GROUP_RANGE_MIN_LABEL_FONT_SIZE = 12;
export const GROUP_RANGE_MAX_LABEL_FONT_SIZE = 64;
export const GROUP_RANGE_DEFAULT_LABEL_POSITION = { x: 0.5, y: 0.18 };

export const GROUP_RANGE_COLOR_MAP: Record<GroupRangeColor, { fill: string; border: string; text: string }> = {
  ochre:  { fill: 'rgba(188, 139, 39, 0.14)', border: '#b98522', text: '#6a4a11' },
  blue:   { fill: 'rgba(65, 112, 150, 0.13)', border: '#416f95', text: '#274b68' },
  green:  { fill: 'rgba(78, 124, 86, 0.13)', border: '#4e7c56', text: '#2f5a37' },
  red:    { fill: 'rgba(147, 57, 43, 0.12)', border: '#93392b', text: '#6d241d' },
  violet: { fill: 'rgba(112, 82, 143, 0.12)', border: '#70528f', text: '#4d3865' },
};

export function normalizeGroupRangeChapter(value: unknown, fallback = 1): number {
  const parsed = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
}

export function normalizeGroupRangeLabelFontSize(
  value: unknown,
  fallback = GROUP_RANGE_DEFAULT_LABEL_FONT_SIZE,
): number {
  const parsed = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10);
  const size = Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
  return Math.min(GROUP_RANGE_MAX_LABEL_FONT_SIZE, Math.max(GROUP_RANGE_MIN_LABEL_FONT_SIZE, size));
}

export function normalizeGroupRangeLabelPosition(value: unknown): { x: number; y: number } {
  const point = value && typeof value === 'object'
    ? value as { x?: unknown; y?: unknown }
    : GROUP_RANGE_DEFAULT_LABEL_POSITION;
  const parsedX = typeof point.x === 'number' ? point.x : Number(point.x);
  const parsedY = typeof point.y === 'number' ? point.y : Number(point.y);
  let x = Number.isFinite(parsedX) ? parsedX : GROUP_RANGE_DEFAULT_LABEL_POSITION.x;
  let y = Number.isFinite(parsedY) ? parsedY : GROUP_RANGE_DEFAULT_LABEL_POSITION.y;

  x = Math.min(0.92, Math.max(0.08, x));
  y = Math.min(0.88, Math.max(0.12, y));

  const dx = x - 0.5;
  const dy = y - 0.5;
  const radiusX = 0.42;
  const radiusY = 0.38;
  const ellipseDistance = (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY);
  if (ellipseDistance > 1) {
    const scale = 1 / Math.sqrt(ellipseDistance);
    x = 0.5 + dx * scale;
    y = 0.5 + dy * scale;
  }

  return { x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) };
}

export function getGroupRangeDisplayTag(range: Pick<GroupRange, 'chapterIntroduced'>): string {
  return `CH.${String(normalizeGroupRangeChapter(range.chapterIntroduced)).padStart(2, '0')}`;
}

export function isGroupRangeVisibleAtChapter(range: GroupRange, chapter: number): boolean {
  return normalizeGroupRangeChapter(range.chapterIntroduced) <= chapter;
}

export function normalizeGroupRange(range: GroupRange): GroupRange {
  return {
    ...range,
    label: range.label?.trim() || 'Group',
    width: Math.max(160, Number.isFinite(range.width) ? range.width : 360),
    height: Math.max(120, Number.isFinite(range.height) ? range.height : 220),
    color: GROUP_RANGE_COLORS.includes(range.color) ? range.color : 'ochre',
    labelFontSize: normalizeGroupRangeLabelFontSize(range.labelFontSize),
    labelPosition: normalizeGroupRangeLabelPosition(range.labelPosition),
    chapterIntroduced: normalizeGroupRangeChapter(range.chapterIntroduced),
  };
}
