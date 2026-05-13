import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Relationship } from '@/types';
import { createRelationship, deleteRelationship, restoreRelationship } from '@/db/relationships';
import { useGraphStore } from '@/stores/graphStore';

const RELATIONSHIP_TYPES = ['family', 'professional', 'romantic', 'hostile', 'suspicion', 'other'] as const;
const CERTAINTY_LEVELS = ['confirmed', 'suspected', 'disproven'] as const;

const schema = z.object({
  type: z.enum(RELATIONSHIP_TYPES),
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
  const addRelationship = useGraphStore((s) => s.addRelationship);
  const removeRelationship = useGraphStore((s) => s.removeRelationship);
  const pushUndo = useGraphStore((s) => s.pushUndo);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'other',
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

  async function onSubmit(values: FormValues) {
    const rel = await createRelationship({
      bookId,
      sourceId,
      targetId,
      type: values.type,
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

  return (
    <div
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
          maxWidth: 430,
          width: '100%',
          boxShadow: 'var(--shadow-modal)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid var(--ink-150)' }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, color: 'var(--ink-900)' }}>
            Add relationship
          </h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ padding: '16px 18px 4px' }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'var(--ink-500)', marginBottom: 6 }}>
              Type
            </label>
            <select
              {...register('type')}
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
              <option value="family">Family</option>
              <option value="professional">Professional</option>
              <option value="romantic">Romantic</option>
              <option value="hostile">Hostile</option>
              <option value="suspicion">Suspicion</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'var(--ink-500)', marginBottom: 6 }}>
              Label (optional)
            </label>
            <input
              {...register('label')}
              placeholder="e.g. Alibi, Employer…"
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
              Chapter Revealed
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
              Certainty
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
              <option value="suspected">Suspected</option>
              <option value="confirmed">Confirmed</option>
              <option value="disproven">Disproven</option>
            </select>
          </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 18px', borderTop: '1px solid var(--ink-150)', background: 'var(--bg-panel)' }}>
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
              Cancel
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
              {isSubmitting ? 'Adding…' : 'Create relationship'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
