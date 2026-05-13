import { describe, it, expect } from 'vitest';
import { cycleCertainty } from '@/lib/certainty';

describe('cycleCertainty', () => {
  it('confirmed -> suspected', () => {
    expect(cycleCertainty('confirmed')).toBe('suspected');
  });
  it('suspected -> disproven', () => {
    expect(cycleCertainty('suspected')).toBe('disproven');
  });
  it('disproven -> confirmed', () => {
    expect(cycleCertainty('disproven')).toBe('confirmed');
  });
});
