import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OnboardingPanel from '@/components/Onboarding/OnboardingPanel';
import { useUiStore } from '@/stores/uiStore';

describe('OnboardingPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.setAttribute('lang', 'en');
    useUiStore.setState({
      theme: 'light',
      themePreference: 'light',
      language: 'system',
      resolvedLanguage: 'en',
      characterNodeViewMode: 'text',
    });
  });

  it('lets first-run readers switch the UI language before choosing a tutorial', async () => {
    const user = userEvent.setup();
    render(<OnboardingPanel onClose={vi.fn()} onCreateTutorial={vi.fn()} />);

    await user.selectOptions(screen.getByLabelText('Language'), 'zh-CN');

    expect(useUiStore.getState().language).toBe('zh-CN');
    expect(useUiStore.getState().resolvedLanguage).toBe('zh-CN');
    expect(localStorage.getItem('calabash-language')).toBe('zh-CN');
    expect(document.documentElement.getAttribute('lang')).toBe('zh-CN');
    expect(screen.getByLabelText('语言')).toHaveValue('zh-CN');
  });
});
