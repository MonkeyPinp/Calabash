import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Character } from '@/types';
import { createCharacter } from '@/db/characters';
import { useGraphStore } from '@/stores/graphStore';

const CHARACTER_ROLES = ['detective', 'suspect', 'victim', 'witness', 'bystander', 'other'] as const;

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.enum(CHARACTER_ROLES),
  chapterIntroduced: z.number().min(1),
});

type FormValues = z.infer<typeof schema>;

export interface NewCharacterModalProps {
  position: { x: number; y: number };
  bookId: string;
  currentChapter: number;
  onClose: () => void;
  onCreated: (char: Character) => void;
}

export default function NewCharacterModal({
  position,
  bookId,
  currentChapter,
  onClose,
  onCreated,
}: NewCharacterModalProps) {
  const addCharacter = useGraphStore((s) => s.addCharacter);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      role: 'other',
      chapterIntroduced: currentChapter,
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
    const char = await createCharacter({
      bookId,
      name: values.name,
      role: values.role,
      chapterIntroduced: values.chapterIntroduced,
      position,
    });
    addCharacter(char);
    onCreated(char);
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
          New Character
        </h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--fg-muted)', marginBottom: 4 }}>
              Name *
            </label>
            <input
              {...register('name')}
              placeholder="Character name"
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
            {errors.name && (
              <span style={{ fontSize: 11, color: 'var(--edge-disproven, #e05)' }}>{errors.name.message}</span>
            )}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--fg-muted)', marginBottom: 4 }}>
              Role
            </label>
            <select
              {...register('role')}
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
              <option value="detective">Detective</option>
              <option value="suspect">Suspect</option>
              <option value="victim">Victim</option>
              <option value="witness">Witness</option>
              <option value="bystander">Bystander</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--fg-muted)', marginBottom: 4 }}>
              Chapter Introduced
            </label>
            <input
              {...register('chapterIntroduced', { valueAsNumber: true })}
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
            {errors.chapterIntroduced && (
              <span style={{ fontSize: 11, color: 'var(--edge-disproven, #e05)' }}>{errors.chapterIntroduced.message}</span>
            )}
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
              {isSubmitting ? 'Adding…' : 'Add Character'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
