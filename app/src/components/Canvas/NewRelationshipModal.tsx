import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Relationship } from '@/types';
import { createRelationship, deleteRelationship, restoreRelationship } from '@/db/relationships';
import { useGraphStore } from '@/stores/graphStore';
import { useT } from '@/i18n';
import {
  directedOverrideForChoice,
  formatRelationshipType,
  isDirected,
  normalizeRelationshipType,
  orientRelationshipEndpoints,
  type RelationshipDirectionChoice,
  RELATIONSHIP_TYPE_PRESETS,
} from '@/lib/relationshipTypes';
import PresetTextInput from '@/components/Form/PresetTextInput';
import DirectionSegmentedControl from '@/components/Form/DirectionSegmentedControl';

const CERTAINTY_LEVELS = ['confirmed', 'suspected', 'disproven'] as const;

const schema = z.object({
  type: z.string().max(80).optional(),
  direction: z.enum(['forward', 'reverse', 'undirected']),
  label: z.string().optional(),
  chapterRevealed: z.number().min(1),
  certainty: z.enum(CERTAINTY_LEVELS),
});

type FormValues = z.infer<typeof schema>;

export interface NewRelationshipModalProps {
  bookId: string;
  sourceId: string;
  targetId: string;
  currentChapter: number;
  onClose: () => void;
  onCreated: (rel: Relationship) => void;
}

export default function NewRelationshipModal({
  bookId,
  sourceId,
  targetId,
  currentChapter,
  onClose,
  onCreated,
}: NewRelationshipModalProps) {
  const t = useT();
  const addRelationship = useGraphStore((s) => s.addRelationship);
  const removeRelationship = useGraphStore((s) => s.removeRelationship);
  const pushUndo = useGraphStore((s) => s.pushUndo);
  const characters = useGraphStore((s) => s.characters);
  const directionTouchedRef = useRef(false);

  const { control, register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: '',
      direction: 'undirected',
      label: '',
      chapterRevealed: currentChapter,
      certainty: 'suspected',
    },
  });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const watchedType = watch('type');
  const watchedDirection = watch('direction');
  useEffect(() => {
    if (!directionTouchedRef.current) {
      setValue('direction', isDirected(watchedType) ? 'forward' : 'undirected', { shouldDirty: false });
    }
  }, [watchedType, setValue]);

  async function onSubmit(values: FormValues) {
    const type = normalizeRelationshipType(values.type);
    const endpoints = orientRelationshipEndpoints(sourceId, targetId, values.direction);
    const rel = await createRelationship({
      bookId,
      ...endpoints,
      type,
      directed: directedOverrideForChoice(type, values.direction),
      label: values.label || undefined,
      chapterRevealed: values.chapterRevealed,
      certainty: values.certainty,
    });
    addRelationship(rel);
    pushUndo(
      async () => { await deleteRelationship(rel.id); removeRelationship(rel.id); },
      async () => { await restoreRelationship(rel); addRelationship(rel); },
    );
    onCreated(rel);
    onClose();
  }

  const typeOptions = RELATIONSHIP_TYPE_PRESETS.map((type) => ({
    value: type,
    label: formatRelationshipType(type, t),
  }));
  const sourceName = characters.find((c) => c.id === sourceId)?.name ?? sourceId;
  const targetName = characters.find((c) => c.id === targetId)?.name ?? targetId;

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('relationship.add')}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'color-mix(in srgb, var(--ink-900) 34%, transparent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 24,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--ink-200)',
          borderRadius: 8,
          maxWidth: 'min(430px, calc(100vw - 32px))',
          width: '100%',
          boxShadow: 'var(--shadow-modal)',
          overflow: 'visible',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid var(--ink-150)' }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, color: 'var(--ink-900)' }}>
            {t('relationship.add')}
          </h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ padding: '16px 18px 4px' }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'var(--ink-500)', marginBottom: 6 }}>
              {t('relationship.type')}
            </label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <PresetTextInput
                  ref={field.ref}
                  name={field.name}
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  options={typeOptions}
                  placeholder={t('common.optional')}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    border: '1px solid var(--ink-200)',
                    borderRadius: 4,
                    background: 'var(--bg-canvas)',
                    color: 'var(--ink-900)',
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              )}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'var(--ink-500)', marginBottom: 6 }}>
              {t('relationship.direction')}
            </label>
            <DirectionSegmentedControl
              value={watchedDirection as RelationshipDirectionChoice}
              sourceName={sourceName}
              targetName={targetName}
              onChange={(direction) => {
                directionTouchedRef.current = true;
                setValue('direction', direction, { shouldDirty: true });
              }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'var(--ink-500)', marginBottom: 6 }}>
              {t('relationship.labelOptional')}
            </label>
            <input
              {...register('label')}
              placeholder={t('relationship.labelPlaceholder')}
              style={{
                width: '100%',
                padding: '6px 10px',
                border: '1px solid var(--ink-200)',
                borderRadius: 4,
                background: 'var(--bg-canvas)',
                color: 'var(--ink-900)',
                fontSize: 13,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'var(--ink-500)', marginBottom: 6 }}>
              {t('relationship.chapterRevealed')}
            </label>
            <input
              {...register('chapterRevealed', { valueAsNumber: true })}
              type="number"
              min={1}
              style={{
                width: '100%',
                padding: '6px 10px',
                border: '1px solid var(--ink-200)',
                borderRadius: 4,
                background: 'var(--bg-canvas)',
                color: 'var(--ink-900)',
                fontSize: 13,
                boxSizing: 'border-box',
              }}
            />
            {errors.chapterRevealed && (
              <span style={{ fontSize: 11, color: 'var(--accent)' }}>{errors.chapterRevealed.message}</span>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'var(--ink-500)', marginBottom: 6 }}>
              {t('relationship.certainty')}
            </label>
            <select
              {...register('certainty')}
              style={{
                width: '100%',
                padding: '6px 10px',
                border: '1px solid var(--ink-200)',
                borderRadius: 4,
                background: 'var(--bg-canvas)',
                color: 'var(--ink-900)',
                fontSize: 13,
                boxSizing: 'border-box',
              }}
            >
              {CERTAINTY_LEVELS.map((certainty) => (
                <option key={certainty} value={certainty}>{t(`certainty.${certainty}`)}</option>
              ))}
            </select>
          </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 18px', borderTop: '1px solid var(--ink-150)', background: 'var(--bg-panel)', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid var(--ink-200)',
                borderRadius: 4,
                padding: '8px 16px',
                cursor: 'pointer',
                color: 'var(--ink-700)',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {t('sidebar.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                background: 'var(--ink-900)',
                color: 'var(--bg-panel)',
                border: 'none',
                borderRadius: 4,
                padding: '8px 16px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: 12,
                fontWeight: 500,
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? t('relationship.adding') : t('relationship.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
