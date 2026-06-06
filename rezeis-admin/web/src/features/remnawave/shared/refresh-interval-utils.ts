export type RefreshInterval = 'off' | '5s' | '30s'

export const intervalToMs: Record<RefreshInterval, number | false> = {
  off: false,
  '5s': 5_000,
  '30s': 30_000,
}
