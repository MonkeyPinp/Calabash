import type { GroupRange, GroupRangeColor } from '@/types';

export const GROUP_RANGE_COLORS: GroupRangeColor[] = ['ochre', 'blue', 'green', 'red', 'violet'];

export const GROUP_RANGE_COLOR_MAP: Record<GroupRangeColor, { fill: string; border: string; text: string }> = {
  ochre:  { fill: 'rgba(188, 139, 39, 0.14)', border: '#b98522', text: '#6a4a11' },
  blue:   { fill: 'rgba(65, 112, 150, 0.13)', border: '#416f95', text: '#274b68' },
  green:  { fill: 'rgba(78, 124, 86, 0.13)', border: '#4e7c56', text: '#2f5a37' },
  red:    { fill: 'rgba(147, 57, 43, 0.12)', border: '#93392b', text: '#6d241d' },
  violet: { fill: 'rgba(112, 82, 143, 0.12)', border: '#70528f', text: '#4d3865' },
};

export function normalizeGroupRange(range: GroupRange): GroupRange {
  return {
    ...range,
    label: range.label?.trim() || 'Group',
    width: Math.max(160, Number.isFinite(range.width) ? range.width : 360),
    height: Math.max(120, Number.isFinite(range.height) ? range.height : 220),
    color: GROUP_RANGE_COLORS.includes(range.color) ? range.color : 'ochre',
  };
}
