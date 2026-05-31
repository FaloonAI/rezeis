/**
 * Plan icon options for the admin plan form.
 * Kept in lockstep with the reiwa SPA's `plan-icons.tsx` registry so the key
 * an operator picks here renders the same glyph on the cabinet plan card.
 */

import {
  Zap,
  Shield,
  Infinity as InfinityIcon,
  Crown,
  Gem,
  Rocket,
  Star,
  Flame,
  Bolt,
  Globe,
  Wifi,
  Gauge,
  Sparkles,
  Award,
  type LucideIcon,
} from 'lucide-react'

export const PLAN_ICON_OPTIONS: ReadonlyArray<{ key: string; Icon: LucideIcon }> = [
  { key: 'zap', Icon: Zap },
  { key: 'shield', Icon: Shield },
  { key: 'infinity', Icon: InfinityIcon },
  { key: 'crown', Icon: Crown },
  { key: 'gem', Icon: Gem },
  { key: 'rocket', Icon: Rocket },
  { key: 'star', Icon: Star },
  { key: 'flame', Icon: Flame },
  { key: 'bolt', Icon: Bolt },
  { key: 'globe', Icon: Globe },
  { key: 'wifi', Icon: Wifi },
  { key: 'gauge', Icon: Gauge },
  { key: 'sparkles', Icon: Sparkles },
  { key: 'award', Icon: Award },
]
