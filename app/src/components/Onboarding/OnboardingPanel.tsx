import { CheckCircle2, Languages, MousePointer2, Network, Shield, X } from 'lucide-react';
import { useT } from '@/i18n';
import CalabashLogo from '@/components/Brand/CalabashLogo';
import type { TutorialKind } from '@/lib/demoData';
import { useUiStore, type LanguagePreference } from '@/stores/uiStore';

export interface OnboardingPanelProps {
  onClose: () => void;
  onCreateTutorial: (kind: TutorialKind) => void;
}

export default function OnboardingPanel({ onClose, onCreateTutorial }: OnboardingPanelProps) {
  const t = useT();
  const language = useUiStore((s) => s.language);
  const setLanguage = useUiStore((s) => s.setLanguage);
  const languageOptions: Array<{ value: LanguagePreference; label: string }> = [
    { value: 'system', label: t('settings.langSystem') },
    { value: 'en', label: t('settings.langEn') },
    { value: 'zh-CN', label: t('settings.langZh') },
    { value: 'ja', label: t('settings.langJa') },
    { value: 'es', label: t('settings.langEs') },
    { value: 'pt-BR', label: t('settings.langPtBr') },
  ];
  const steps = [
    { icon: <CheckCircle2 size={15} />, text: t('onboarding.step1') },
    { icon: <MousePointer2 size={15} />, text: t('onboarding.step2') },
    { icon: <Network size={15} />, text: t('onboarding.step3') },
    { icon: <Shield size={15} />, text: t('onboarding.step4') },
    { icon: <CheckCircle2 size={15} />, text: t('onboarding.step5') },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('onboarding.title')}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'color-mix(in srgb, var(--ink-900) 34%, transparent)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 440,
          maxWidth: 'calc(100vw - 32px)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--ink-200)',
          borderRadius: 8,
          boxShadow: 'var(--shadow-modal)',
          overflow: 'hidden',
          color: 'var(--ink-900)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '20px 22px 12px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ color: 'var(--accent)', marginTop: 2 }}>
            <CalabashLogo size={30} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-case-title)', fontSize: 23, lineHeight: 1.15 }}>
              {t('onboarding.title')}
            </div>
            <p style={{ margin: '8px 0 0', color: 'var(--ink-600)', fontSize: 13, lineHeight: 1.6 }}>
              {t('onboarding.body')}
            </p>
          </div>
          <button type="button" onClick={onClose} title={t('onboarding.skip')} aria-label={t('onboarding.skip')} style={iconButtonStyle}>
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: '4px 22px 18px', display: 'grid', gap: 8 }}>
          {steps.map((step) => (
            <div key={step.text} style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--ink-700)', fontSize: 13, lineHeight: 1.4 }}>
              <span style={{ width: 24, height: 24, borderRadius: 999, display: 'grid', placeItems: 'center', background: 'var(--bg-canvas)', color: 'var(--accent)', border: '1px solid var(--ink-200)', flexShrink: 0 }}>
                {step.icon}
              </span>
              <span>{step.text}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: '0 22px 18px' }}>
          <label htmlFor="onboarding-language" style={languageLabelStyle}>
            <Languages size={14} />
            {t('settings.language')}
          </label>
          <select
            id="onboarding-language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as LanguagePreference)}
            style={languageSelectStyle}
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--ink-150)', background: 'var(--bg-panel)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={onClose} style={secondaryButtonStyle}>
            {t('onboarding.done')}
          </button>
          <button type="button" onClick={() => onCreateTutorial('hida')} style={secondaryButtonStyle}>
            {t('onboarding.createHidaTutorial')}
          </button>
          <button type="button" onClick={() => onCreateTutorial('ackroyd')} style={primaryButtonStyle}>
            {t('onboarding.createAckroydTutorial')}
          </button>
        </div>
      </div>
    </div>
  );
}

const iconButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 5,
  border: '1px solid transparent',
  background: 'transparent',
  color: 'var(--ink-600)',
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center',
  padding: 0,
};

const languageLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  color: 'var(--ink-600)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0,
  textTransform: 'uppercase',
  marginBottom: 7,
};

const languageSelectStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--ink-200)',
  borderRadius: 5,
  background: 'var(--bg-canvas)',
  color: 'var(--ink-900)',
  padding: '8px 10px',
  fontSize: 13,
  minHeight: 36,
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 5,
  border: '1px solid var(--ink-200)',
  background: 'transparent',
  color: 'var(--ink-700)',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 500,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 5,
  border: 'none',
  background: 'var(--accent)',
  color: 'var(--accent-ink)',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
};
