import { describe, expect, it } from 'vitest';
import { messages } from '@/i18n';

describe('i18n messages', () => {
  it('keeps every locale aligned with the English key set', () => {
    const englishKeys = Object.keys(messages.en).sort();

    for (const [language, languageMessages] of Object.entries(messages)) {
      expect(Object.keys(languageMessages).sort(), language).toEqual(englishKeys);
    }
  });
});
