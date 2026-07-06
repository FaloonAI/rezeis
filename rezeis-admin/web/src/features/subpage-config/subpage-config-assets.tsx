import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import type { SubpageConfig } from './subpage-config-api';

type LT = Record<string, string>;

interface Props {
  config: SubpageConfig;
  onChange: (next: SubpageConfig) => void;
}

// ── Theme editor (rezeisTheme extension) ─────────────────────────────────────
// Mantine color key → representative swatch hex (Mantine shade 6).
const MANTINE_COLORS: ReadonlyArray<readonly [string, string]> = [
  ['cyan', '#15aabf'],
  ['blue', '#228be6'],
  ['teal', '#12b886'],
  ['green', '#40c057'],
  ['violet', '#7048e8'],
  ['grape', '#be4bdb'],
  ['indigo', '#4263eb'],
  ['pink', '#e64980'],
  ['orange', '#fd7e14'],
  ['yellow', '#fab005'],
  ['red', '#fa5252'],
  ['gray', '#868e96'],
];

interface RezeisTheme {
  primaryColor?: string;
  backgroundColor?: string;
  accentColor?: string;
}

export function SubpageTheme({ config, onChange }: Props) {
  const { t } = useTranslation();
  const theme = ((config as { rezeisTheme?: RezeisTheme }).rezeisTheme ?? {}) as RezeisTheme;

  function set(patch: Partial<RezeisTheme>): void {
    const next = structuredClone(config) as SubpageConfig & { rezeisTheme?: RezeisTheme };
    next.rezeisTheme = { ...theme, ...patch };
    onChange(next);
  }

  const bg = theme.backgroundColor || '#0b0f17';
  const accent = theme.accentColor || '#22d3ee';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('subpageConfigPage.theme.title')}</CardTitle>
        <CardDescription>{t('subpageConfigPage.theme.description')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>{t('subpageConfigPage.theme.primaryColor')}</Label>
          <div className="flex flex-wrap gap-1.5">
            {MANTINE_COLORS.map(([c, hex]) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => set({ primaryColor: c })}
                data-active={theme.primaryColor === c}
                className="h-7 w-7 rounded-full border-2 border-transparent data-[active=true]:border-foreground"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
          <Input
            value={theme.primaryColor ?? ''}
            placeholder="cyan"
            onChange={(e) => set({ primaryColor: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('subpageConfigPage.theme.backgroundColor')}</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(bg) ? bg : '#0b0f17'}
              onChange={(e) => set({ backgroundColor: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded border bg-transparent"
              aria-label={t('subpageConfigPage.theme.backgroundColor')}
            />
            <Input value={bg} onChange={(e) => set({ backgroundColor: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>{t('subpageConfigPage.theme.accentColor')}</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(accent) ? accent : '#22d3ee'}
              onChange={(e) => set({ accentColor: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded border bg-transparent"
              aria-label={t('subpageConfigPage.theme.accentColor')}
            />
            <Input value={accent} onChange={(e) => set({ accentColor: e.target.value })} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Translations editor ──────────────────────────────────────────────────────
export function SubpageTranslations({ config, onChange }: Props) {
  const { t } = useTranslation();
  const locales = (config.locales ?? ['en', 'ru']) as string[];
  const bt = (config.baseTranslations ?? {}) as Record<string, LT>;
  const keys = Object.keys(bt);

  function setValue(key: string, loc: string, value: string): void {
    const next = structuredClone(config);
    const draft = (next.baseTranslations ?? {}) as Record<string, LT>;
    draft[key] = { ...(draft[key] ?? {}), [loc]: value };
    next.baseTranslations = draft;
    onChange(next);
  }

  if (keys.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t('subpageConfigPage.translations.empty')}</p>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('subpageConfigPage.translations.title')}</CardTitle>
        <CardDescription>{t('subpageConfigPage.translations.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {keys.map((key) => (
          <div
            key={key}
            className="grid gap-2 border-b pb-3 last:border-b-0 sm:grid-cols-[200px_1fr]"
          >
            <code className="pt-2 text-xs text-muted-foreground">{key}</code>
            <div className="space-y-2">
              {locales.map((loc) => (
                <div key={loc} className="flex items-center gap-2">
                  <span className="w-8 shrink-0 text-xs uppercase text-muted-foreground">
                    {loc}
                  </span>
                  <Input
                    value={bt[key]?.[loc] ?? ''}
                    onChange={(e) => setValue(key, loc, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── Icon library (svgLibrary) editor ─────────────────────────────────────────
const ICON_KEY_RE = /^[A-Za-z]+$/;

export function SubpageIcons({ config, onChange }: Props) {
  const { t } = useTranslation();
  const lib = (config.svgLibrary ?? {}) as Record<string, string>;
  const keys = Object.keys(lib);

  const [newKey, setNewKey] = useState('');
  const [newSvg, setNewSvg] = useState('');
  const [error, setError] = useState<string | null>(null);

  function setSvg(key: string, svg: string): void {
    const next = structuredClone(config);
    const draft = (next.svgLibrary ?? {}) as Record<string, string>;
    draft[key] = svg;
    next.svgLibrary = draft;
    onChange(next);
  }

  function remove(key: string): void {
    const next = structuredClone(config);
    const draft = (next.svgLibrary ?? {}) as Record<string, string>;
    delete draft[key];
    next.svgLibrary = draft;
    onChange(next);
  }

  function add(): void {
    const key = newKey.trim();
    if (!ICON_KEY_RE.test(key)) {
      setError(t('subpageConfigPage.icons.keyError'));
      return;
    }
    if (keys.includes(key)) {
      setError(t('subpageConfigPage.icons.keyExists'));
      return;
    }
    setSvg(key, newSvg || '<svg viewBox="0 0 24 24"></svg>');
    setNewKey('');
    setNewSvg('');
    setError(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('subpageConfigPage.icons.title')}</CardTitle>
        <CardDescription>{t('subpageConfigPage.icons.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {keys.map((key) => (
          <div key={key} className="flex items-start gap-3 border-b pb-3 last:border-b-0">
            <div
              className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-foreground [&_svg]:h-5 [&_svg]:w-5"
              // Operator-authored SVG (admin-only, trusted); rendered the same way the subpage does.
              dangerouslySetInnerHTML={{ __html: lib[key] ?? '' }}
            />
            <div className="flex-1 space-y-1">
              <code className="text-xs text-muted-foreground">{key}</code>
              <Textarea
                value={lib[key] ?? ''}
                spellCheck={false}
                onChange={(e) => setSvg(key, e.target.value)}
                className="min-h-[64px] font-mono text-xs"
                aria-label={`${t('subpageConfigPage.icons.svg')} ${key}`}
              />
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="mt-1 text-destructive"
              onClick={() => remove(key)}
              aria-label={t('subpageConfigPage.icons.remove')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <div className="space-y-2 rounded-lg border border-dashed p-3">
          <div className="grid gap-2 sm:grid-cols-[200px_1fr]">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                {t('subpageConfigPage.icons.key')}
              </Label>
              <Input
                value={newKey}
                placeholder="rocket"
                onChange={(e) => setNewKey(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                {t('subpageConfigPage.icons.svg')}
              </Label>
              <Textarea
                value={newSvg}
                spellCheck={false}
                placeholder='<svg viewBox="0 0 24 24">...</svg>'
                onChange={(e) => setNewSvg(e.target.value)}
                className="min-h-[64px] font-mono text-xs"
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button size="sm" variant="outline" onClick={add}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            {t('subpageConfigPage.icons.add')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
