export type SpoilerShieldToolbarAction =
  | 'none'
  | 'enable-shield'
  | 'disable-shield'
  | 'prompt-reveal'
  | 'cover-current-reveal';

export interface SpoilerShieldToolbarState {
  activeBookId: string | null;
  spoilerShield: boolean;
  spoilerShieldCoverActive: boolean;
  currentSpoilerKey: string | null;
  revealedSpoilerKey: string | null;
}

export function getSpoilerShieldToolbarAction({
  activeBookId,
  spoilerShield,
  spoilerShieldCoverActive,
  currentSpoilerKey,
  revealedSpoilerKey,
}: SpoilerShieldToolbarState): SpoilerShieldToolbarAction {
  if (!activeBookId) return 'none';
  if (spoilerShieldCoverActive) return 'prompt-reveal';
  if (spoilerShield && currentSpoilerKey !== null && revealedSpoilerKey === currentSpoilerKey) {
    return 'cover-current-reveal';
  }
  return spoilerShield ? 'disable-shield' : 'enable-shield';
}
