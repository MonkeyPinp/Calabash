import { db } from './schema';
import type { GroupRange, GroupRangeColor } from '@/types';
import {
  GROUP_RANGE_DEFAULT_LABEL_FONT_SIZE,
  GROUP_RANGE_DEFAULT_LABEL_POSITION,
  normalizeGroupRange,
} from '@/lib/groupRanges';

export interface CreateGroupRangeInput {
  bookId: string;
  label?: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  color?: GroupRangeColor;
  labelFontSize?: number;
  labelPosition?: { x: number; y: number };
  chapterIntroduced?: number;
  timeLayerId?: string | null;
  locked?: boolean;
}

export async function createGroupRange(input: CreateGroupRangeInput): Promise<GroupRange> {
  const now = Date.now();
  const range: GroupRange = normalizeGroupRange({
    id: crypto.randomUUID(),
    bookId: input.bookId,
    label: input.label ?? 'Group',
    position: input.position,
    width: input.width ?? 360,
    height: input.height ?? 220,
    color: input.color ?? 'ochre',
    labelFontSize: input.labelFontSize ?? GROUP_RANGE_DEFAULT_LABEL_FONT_SIZE,
    labelPosition: input.labelPosition ?? GROUP_RANGE_DEFAULT_LABEL_POSITION,
    chapterIntroduced: input.chapterIntroduced ?? 1,
    timeLayerId: input.timeLayerId ?? null,
    locked: input.locked === true,
    createdAt: now,
    updatedAt: now,
  });
  await db.groupRanges.add(range);
  return range;
}

export async function listGroupRangesByBook(bookId: string): Promise<GroupRange[]> {
  const ranges = await db.groupRanges.where('bookId').equals(bookId).toArray();
  return ranges.map(normalizeGroupRange);
}

export async function updateGroupRange(
  id: string,
  patch: Partial<Omit<GroupRange, 'id' | 'bookId' | 'createdAt'>>,
): Promise<GroupRange> {
  const existing = await db.groupRanges.get(id);
  if (!existing) throw new Error(`Group range ${id} not found`);
  const next = normalizeGroupRange({ ...existing, ...patch, updatedAt: Date.now() });
  await db.groupRanges.put(next);
  return next;
}

export async function deleteGroupRange(id: string): Promise<void> {
  await db.groupRanges.delete(id);
}

export async function restoreGroupRange(range: GroupRange): Promise<void> {
  await db.groupRanges.put(normalizeGroupRange(range));
}
