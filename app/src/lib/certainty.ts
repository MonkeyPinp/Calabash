import type { CertaintyLevel } from '@/types';

const NEXT: Record<CertaintyLevel, CertaintyLevel> = {
  confirmed: 'suspected',
  suspected: 'disproven',
  disproven: 'confirmed',
};

export function cycleCertainty(level: CertaintyLevel): CertaintyLevel {
  return NEXT[level];
}
