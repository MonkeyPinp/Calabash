import { importBookFromJson, type CalabashBookImportTemplate } from '@/db/importExport';
import type { CharacterNodeViewMode, ResolvedLanguage } from '@/stores/uiStore';

export interface BundledTemplate {
  id: string;
  language: string;
  title: string;
  description?: string;
  category?: string;
  defaultViewMode: CharacterNodeViewMode;
  tags: string[];
  payload: CalabashBookImportTemplate;
}

const templateModules = import.meta.glob('./*.calabash-template.json', {
  eager: true,
}) as Record<string, { default?: unknown } | unknown>;

const bundledTemplates: BundledTemplate[] = Object.entries(templateModules)
  .flatMap(([path, module]) => {
    const payload = readModuleDefault(module);
    if (!isTemplatePayload(payload)) return [];
    const template = payload.template ?? {};
    const title = template.title ?? payload.book.title;
    const defaultViewMode: CharacterNodeViewMode = template.defaultViewMode === 'portrait' ? 'portrait' : 'text';
    return [{
      id: template.id ?? inferTemplateId(path),
      language: template.language ?? inferTemplateLanguage(path),
      title,
      description: template.description,
      category: template.category,
      defaultViewMode,
      tags: Array.isArray(template.tags) ? template.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      payload,
    }];
  })
  .sort((a, b) => a.id.localeCompare(b.id) || a.language.localeCompare(b.language));

export function listBundledTemplates(): BundledTemplate[] {
  return bundledTemplates;
}

export function getBundledTemplate(id: string, language: ResolvedLanguage): BundledTemplate {
  const localized = bundledTemplates.find((template) => template.id === id && template.language === language);
  const english = bundledTemplates.find((template) => template.id === id && template.language === 'en');
  const fallback = bundledTemplates.find((template) => template.id === id);
  const template = localized ?? english ?? fallback;
  if (!template) throw new Error(`Bundled template ${id} not found`);
  return template;
}

export async function createBookFromBundledTemplate(
  id: string,
  options: { userId?: string; language: ResolvedLanguage },
): Promise<{ bookId: string; defaultViewMode: CharacterNodeViewMode }> {
  const template = getBundledTemplate(id, options.language);
  const bookId = await importBookFromJson(template.payload, options.userId);
  return { bookId, defaultViewMode: template.defaultViewMode };
}

function readModuleDefault(module: { default?: unknown } | unknown): unknown {
  return isRecord(module) && 'default' in module ? module.default : module;
}

function isTemplatePayload(value: unknown): value is CalabashBookImportTemplate {
  return isRecord(value) && isRecord(value.book) && typeof value.book.title === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function inferTemplateId(path: string): string {
  return path
    .replace(/^\.\/|\.calabash-template\.json$/g, '')
    .replace(/\.(en|zh-CN|ja|es|pt-BR)$/u, '');
}

function inferTemplateLanguage(path: string): string {
  return /\.(en|zh-CN|ja|es|pt-BR)\.calabash-template\.json$/u.exec(path)?.[1] ?? 'en';
}
