import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Character } from '@/types';
import { createCharacter, deleteCharacter, restoreCharacter } from '@/db/characters';
import { useGraphStore } from '@/stores/graphStore';

const CHARACTER_ROLES = ['detective', 'suspect', 'victim', 'witness', 'bystander', 'other'] as const;

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.enum(CHARACTER_ROLES),
  profession: z.string().optional(),
  chapterIntroduced: z.number().min(1),
});

type FormValues = z.infer<typeof schema>;

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  border: '1px solid var(--border)',
  borderRadius: 4,
  background: 'var(--bg-canvas)',
  color: 'var(--fg-primary)',
  fontSize: 13,
  boxSizing: 'border-box',
  outline: 'none',
};

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
  const removeCharacter = useGraphStore((s) => s.removeCharacter);
  const pushUndo = useGraphStore((s) => s.pushUndo);
  const nameRef = useRef<HTMLInputElement | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', role: 'other', profession: '', chapterIntroduced: currentChapter },
  });

  // Focus name input on open
  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  async function onSubmit(values: FormValues) {
    const char = await createCharacter({
      bookId,
      name: values.name,
      role: values.role,
      profession: values.profession || undefined,
      chapterIntroduced: values.chapterIntroduced,
      position,
    });
    addCharacter(char);
    pushUndo(
      async () => { await deleteCharacter(char.id); removeCharacter(char.id); },
      async () => { await restoreCharacter(char); addCharacter(char); },
    );
    onCreated(char);
    onClose();
  }

  const { ref: rhfRef, ...nameRest } = register('name');

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'var(--bg-panel)', border: '1px solid var(--border)',
          borderRadius: 8, padding: 20, maxWidth: 360, width: '100%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: 'var(--fg-primary)' }}>
          New Character
        </h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Name */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--fg-muted)', marginBottom: 4 }}>Name *</label>
            <input
              {...nameRest}
              ref={(el) => { rhfRef(el); nameRef.current = el; }}
              placeholder="e.g. Hercule Poirot"
              style={inputStyle}
            />
            {errors.name && <span style={{ fontSize: 11, color: '#e05' }}>{errors.name.message}</span>}
          </div>

          {/* Role + Profession side-by-side */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--fg-muted)', marginBottom: 4 }}>Role</label>
              <select {...register('role')} style={inputStyle}>
                <option value="detective">Detective</option>
                <option value="suspect">Suspect</option>
                <option value="victim">Victim</option>
                <option value="witness">Witness</option>
                <option value="bystander">Bystander</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--fg-muted)', marginBottom: 4 }}>Occupation</label>
              <input
                {...register('profession')}
                placeholder="e.g. Housemaid"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Chapter introduced */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--fg-muted)', marginBottom: 4 }}>Chapter Introduced</label>
            <input
              {...register('chapterIntroduced', { valueAsNumber: true })}
              type="number" min={1}
              style={{ ...inputStyle, width: 90 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: 4, padding: '8px 16px', cursor: 'pointer',
              color: 'var(--fg-primary)', fontSize: 13,
            }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{
              background: 'var(--accent)', color: 'white', border: 'none',
              borderRadius: 4, padding: '8px 16px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: 13, opacity: isSubmitting ? 0.7 : 1,
            }}>
              {isSubmitting ? 'Adding…' : 'Add Character'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
