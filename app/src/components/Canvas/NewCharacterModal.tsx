import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Character } from '@/types';
import { createCharacter, deleteCharacter, restoreCharacter } from '@/db/characters';
import { useGraphStore } from '@/stores/graphStore';
import { useT } from '@/i18n';
import { CHARACTER_ROLE_PRESETS, formatCharacterRole, normalizeCharacterRole } from '@/lib/roles';
import PresetTextInput from '@/components/Form/PresetTextInput';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.string().max(80).optional(),
  profession: z.string().optional(),
  chapterIntroduced: z.number().min(1),
});

type FormValues = z.infer<typeof schema>;

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 9px',
  border: '1px solid var(--ink-200)',
  borderRadius: 4,
  background: 'var(--bg-canvas)',
  color: 'var(--ink-900)',
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
  const t = useT();
  const addCharacter = useGraphStore((s) => s.addCharacter);
  const removeCharacter = useGraphStore((s) => s.removeCharacter);
  const pushUndo = useGraphStore((s) => s.pushUndo);
  const nameRef = useRef<HTMLInputElement | null>(null);

  const { control, register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', role: '', profession: '', chapterIntroduced: currentChapter },
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
      role: normalizeCharacterRole(values.role),
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
  const roleOptions = CHARACTER_ROLE_PRESETS.map((role) => ({
    value: role,
    label: formatCharacterRole(role, t),
  }));

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'color-mix(in srgb, var(--ink-900) 34%, transparent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
        padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--ink-200)',
          borderRadius: 8, maxWidth: 460, width: '100%',
          boxShadow: 'var(--shadow-modal)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid var(--ink-150)' }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, color: 'var(--ink-900)' }}>
            {t('character.add')}
          </h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ padding: '16px 18px 4px' }}>
          {/* Name */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'var(--ink-500)', marginBottom: 6 }}>{t('character.name')} *</label>
            <input
              {...nameRest}
              ref={(el) => { rhfRef(el); nameRef.current = el; }}
              placeholder={t('character.namePlaceholder')}
              style={inputStyle}
            />
            {errors.name && <span style={{ fontSize: 11, color: 'var(--accent)' }}>{errors.name.message}</span>}
          </div>

          {/* Role + Profession side-by-side */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'var(--ink-500)', marginBottom: 6 }}>{t('character.role')}</label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <PresetTextInput
                    ref={field.ref}
                    name={field.name}
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                    options={roleOptions}
                    placeholder={t('common.optional')}
                    style={inputStyle}
                  />
                )}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'var(--ink-500)', marginBottom: 6 }}>{t('character.occupation')}</label>
              <input
                {...register('profession')}
                placeholder={t('character.occupationPlaceholder')}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Chapter introduced */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'var(--ink-500)', marginBottom: 6 }}>{t('character.chapterIntroduced')}</label>
            <input
              {...register('chapterIntroduced', { valueAsNumber: true })}
              type="number" min={1}
              style={{ ...inputStyle, width: 90 }}
            />
          </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 18px', borderTop: '1px solid var(--ink-150)', background: 'var(--bg-panel)' }}>
            <button type="button" onClick={onClose} style={{
              background: 'transparent', border: '1px solid var(--ink-200)',
              borderRadius: 4, padding: '8px 16px', cursor: 'pointer',
              color: 'var(--ink-700)', fontSize: 12, fontWeight: 500,
            }}>{t('sidebar.cancel')}</button>
            <button type="submit" disabled={isSubmitting} style={{
              background: 'var(--ink-900)', color: 'var(--bg-panel)', border: 'none',
              borderRadius: 4, padding: '8px 16px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: 12, fontWeight: 500, opacity: isSubmitting ? 0.7 : 1,
            }}>
              {isSubmitting ? t('character.adding') : t('character.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
