import type { TimeLayer } from '@/types';

export const ALL_TIME_LAYERS_ID = 'all';

const TIME_LAYER_COLORS = ['#8f2f1f', '#1f5f7a', '#9f6b14', '#4e7c56', '#70528f', '#6a4f1b'];

function slugify(value: string): string | undefined {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function normalizeTimeLayers(value: unknown): TimeLayer[] {
  if (!Array.isArray(value)) return [];

  const used = new Set<string>();
  return value.flatMap((raw, index): TimeLayer[] => {
    if (typeof raw === 'string') {
      const name = raw.trim();
      if (!name) return [];
      const id = uniqueTimeLayerId(slugify(name) ?? `layer-${index + 1}`, used);
      return [{ id, name, order: index, color: TIME_LAYER_COLORS[index % TIME_LAYER_COLORS.length] }];
    }

    if (!raw || typeof raw !== 'object') return [];
    const record = raw as { id?: unknown; name?: unknown; label?: unknown; order?: unknown; color?: unknown };
    const name = stringValue(record.name) ?? stringValue(record.label);
    if (!name) return [];
    const id = uniqueTimeLayerId(stringValue(record.id) ?? slugify(name) ?? `layer-${index + 1}`, used);
    const parsedOrder = typeof record.order === 'number' ? record.order : Number(record.order);
    return [{
      id,
      name,
      order: Number.isFinite(parsedOrder) ? Math.trunc(parsedOrder) : index,
      color: stringValue(record.color) ?? TIME_LAYER_COLORS[index % TIME_LAYER_COLORS.length],
    }];
  }).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

export function uniqueTimeLayerId(value: string, used: Set<string>): string {
  const base = slugify(value) ?? 'layer';
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate) || candidate === ALL_TIME_LAYERS_ID) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

export function timeLayerLookup(layers: TimeLayer[]): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const layer of layers) {
    lookup.set(layer.id, layer.id);
    lookup.set(layer.name, layer.id);
  }
  return lookup;
}

export function normalizeTimeLayerReference(value: unknown, layers: TimeLayer[]): string | null {
  const raw = stringValue(value);
  if (!raw || raw === ALL_TIME_LAYERS_ID || raw.toLowerCase() === 'all') return null;
  return timeLayerLookup(layers).get(raw) ?? raw;
}

export function normalizeDefaultTimeLayerReference(value: unknown, layers: TimeLayer[]): string | null {
  const normalized = normalizeTimeLayerReference(value, layers);
  if (!normalized) return null;
  return layers.some((layer) => layer.id === normalized) ? normalized : null;
}

export function isVisibleInTimeLayer(itemTimeLayerId: string | null | undefined, currentTimeLayerId: string): boolean {
  if (currentTimeLayerId === ALL_TIME_LAYERS_ID) return true;
  if (!itemTimeLayerId) return true;
  return itemTimeLayerId === currentTimeLayerId;
}

export function getTimeLayerName(layers: TimeLayer[], id: string | null | undefined): string | undefined {
  if (!id) return undefined;
  return layers.find((layer) => layer.id === id)?.name ?? id;
}

export function getTimeLayerColor(layers: TimeLayer[], id: string | null | undefined): string | undefined {
  if (!id || id === ALL_TIME_LAYERS_ID) return undefined;
  return layers.find((layer) => layer.id === id)?.color;
}

export function resolveDefaultTimeLayerId(layers: TimeLayer[], id: string | null | undefined): string {
  if (id && layers.some((layer) => layer.id === id)) return id;
  return ALL_TIME_LAYERS_ID;
}
