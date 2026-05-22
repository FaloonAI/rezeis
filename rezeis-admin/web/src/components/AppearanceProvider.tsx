import { useEffect, type ReactNode } from 'react';
import { useAppearanceStore } from '@/lib/theme/appearance-store';

/**
 * Applies appearance preferences (density, font size, animations, visual
 * effects) to the document root as data attributes. CSS in `index.css`
 * reacts to these attributes via attribute selectors, no JS-side
 * recomputation needed.
 */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const density = useAppearanceStore((s) => s.density);
  const fontSize = useAppearanceStore((s) => s.fontSize);
  const animationsEnabled = useAppearanceStore((s) => s.animationsEnabled);
  const visualEffects = useAppearanceStore((s) => s.visualEffects);
  const glassBlur = useAppearanceStore((s) => s.glassBlur);
  const blurIntensity = useAppearanceStore((s) => s.blurIntensity);
  const glassOpacity = useAppearanceStore((s) => s.glassOpacity);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.density = density;
    root.dataset.fontSize = fontSize;
    root.dataset.animations = animationsEnabled ? 'on' : 'off';
    root.dataset.effects = visualEffects ? 'on' : 'off';
    root.dataset.glassBlur = glassBlur ? 'on' : 'off';
    root.style.setProperty('--glass-blur', `${blurIntensity}px`);
    root.style.setProperty('--glass-opacity', `${glassOpacity}%`);
  }, [density, fontSize, animationsEnabled, visualEffects, glassBlur, blurIntensity, glassOpacity]);

  return <>{children}</>;
}
