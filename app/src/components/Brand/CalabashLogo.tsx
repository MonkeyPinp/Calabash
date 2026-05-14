import { useUiStore } from '@/stores/uiStore';
import { publicAsset } from '@/lib/publicAsset';

export interface CalabashLogoProps {
  size?: number;
  title?: string;
}

export default function CalabashLogo({ size = 28, title = 'Calabash' }: CalabashLogoProps) {
  const theme = useUiStore((state) => state.theme);
  const src = publicAsset(theme === 'dark' ? 'calabash-logo-dark.png' : 'calabash-logo-light.png');

  return (
    <img
      src={src}
      alt={title}
      width={size}
      height={size}
      draggable={false}
      style={{ display: 'block', width: size, height: size, objectFit: 'contain' }}
    />
  );
}
