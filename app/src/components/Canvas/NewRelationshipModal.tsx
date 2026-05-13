import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Relationship } from '@/types';
import { createRelationship } from '@/db/relationships';
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
    onCreated(rel);
    onClose();
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 20,
          maxWidth: 340,
          width: '100%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: 'var(--fg-primary)' }}>
          New Relationship
        </h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--fg-muted)', marginBottom: 4 }}>
              Type
            </label>
            <select
              {...register('type')}
              style={{
                width: '100%',
                padding: '6px 10px',
                border: '1px solid var(--border)',
                borderRadius: 4,
                background: 'var(--bg-canvas)',
                color: 'var(--fg-primary)',
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
            <label style={{ display: 'block', fontSize: 12, color: 'var(--fg-muted)', marginBottom: 4 }}>
              Label (optional)
            </label>
            <input
              {...register('label')}
              placeholder="e.g. Alibi, Employer…"
              style={{
                width: '100%',
                padding: '6px 10px',
                border: '1px solid var(--border)',
                borderRadius: 4,
                background: 'var(--bg-canvas)',
                color: 'var(--fg-primary)',
                fontSize: 13,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--fg-muted)', marginBottom: 4 }}>
              Chapter Revealed
            </label>
            <input
              {...register('chapterRevealed', { valueAsNumber: true })}
              type="number"
              min={1}
              style={{
                width: '100%',
                padding: '6px 10px',
                border: '1px solid var(--border)',
                borderRadius: 4,
                background: 'var(--bg-canvas)',
                color: 'var(--fg-primary)',
                fontSize: 13,
                boxSizing: 'border-box',
              }}
            />
            {errors.chapterRevealed && (
              <span style={{ fontSize: 11, color: 'var(--edge-disproven, #e05)' }}>{errors.chapterRevealed.message}</span>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--fg-muted)', marginBottom: 4 }}>
              Certainty
            </label>
            <select
              {...register('certainty')}
              style={{
                width: '100%',
                padding: '6px 10px',
                border: '1px solid var(--border)',
                borderRadius: 4,
                background: 'var(--bg-canvas)',
                color: 'var(--fg-primary)',
                fontSize: 13,
                boxSizing: 'border-box',
              }}
            >
              <option value="suspected">Suspected</option>
              <option value="confirmed">Confirmed</option>
              <option value="disproven">Disproven</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 4,
                padding: '8px 16px',
                cursor: 'pointer',
                color: 'var(--fg-primary)',
                fontSize: 13,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                padding: '8px 16px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: 13,
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? 'Adding…' : 'Add Relationship'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
