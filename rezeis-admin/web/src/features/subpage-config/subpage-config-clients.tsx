import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

import type { SubpageConfig } from './subpage-config-api';

type LT = Record<string, string>;
interface ButtonV {
  type: string;
  link: string;
  svgIconKey: string;
  text: LT;
}
interface BlockV {
  svgIconKey: string;
  svgIconColor: string;
  title: LT;
  description: LT;
  buttons: ButtonV[];
}
interface AppV {
  name: string;
  svgIconKey?: string;
  featured: boolean;
  blocks: BlockV[];
}
interface PlatformV {
  displayName: LT;
  svgIconKey: string;
  apps: AppV[];
}

const PLATFORM_KEYS = [
  'ios',
  'android',
  'windows',
  'macos',
  'linux',
  'androidTV',
  'appleTV',
] as const;
const COLORS = [
  'blue',
  'cyan',
  'teal',
  'green',
  'violet',
  'grape',
  'indigo',
  'orange',
  'yellow',
  'red',
  'pink',
  'gray',
  'dark',
] as const;
const BUTTON_TYPES = ['external', 'subscriptionLink', 'copyButton'] as const;

interface Props {
  config: SubpageConfig;
  onChange: (next: SubpageConfig) => void;
}

export function SubpageConfigClients({ config, onChange }: Props) {
  const { t } = useTranslation();

  const platforms = (config.platforms ?? {}) as Record<string, PlatformV>;
  const platformKeys = Object.keys(platforms);
  const svgKeys = Object.keys((config.svgLibrary ?? {}) as Record<string, string>);
  const locales = (config.locales ?? ['en', 'ru']) as string[];

  const blankLT = (): LT => Object.fromEntries(locales.map((l) => [l, '']));

  function edit(mutator: (draft: Record<string, PlatformV>) => void): void {
    const next = structuredClone(config);
    const draftPlatforms = (next.platforms ?? {}) as Record<string, PlatformV>;
    mutator(draftPlatforms);
    next.platforms = draftPlatforms;
    onChange(next);
  }

  const newButton = (): ButtonV => ({
    type: 'external',
    link: '',
    svgIconKey: svgKeys[0] ?? '',
    text: blankLT(),
  });
  const newBlock = (): BlockV => ({
    svgIconKey: svgKeys[0] ?? '',
    svgIconColor: 'blue',
    title: blankLT(),
    description: blankLT(),
    buttons: [],
  });
  const newApp = (): AppV => ({
    name: t('subpageConfigPage.clients.newApp'),
    featured: false,
    blocks: [],
  });

  const availableToAdd = PLATFORM_KEYS.filter((k) => !platformKeys.includes(k));

  function renderLocalized(label: string, value: LT, onSet: (v: LT) => void, multiline = false) {
    return (
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {locales.map((loc) => (
          <div key={loc} className="flex items-start gap-2">
            <span className="mt-2 w-8 shrink-0 text-xs uppercase text-muted-foreground">{loc}</span>
            {multiline ? (
              <Textarea
                value={value?.[loc] ?? ''}
                onChange={(e) => onSet({ ...value, [loc]: e.target.value })}
                className="min-h-[60px]"
              />
            ) : (
              <Input
                value={value?.[loc] ?? ''}
                onChange={(e) => onSet({ ...value, [loc]: e.target.value })}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  function iconSelect(value: string, onSet: (v: string) => void) {
    return (
      <Select value={value} onValueChange={onSet}>
        <SelectTrigger>
          <SelectValue placeholder={t('subpageConfigPage.clients.icon')} />
        </SelectTrigger>
        <SelectContent>
          {svgKeys.map((k) => (
            <SelectItem key={k} value={k}>
              {k}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (platformKeys.length === 0 && availableToAdd.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('subpageConfigPage.clients.empty')}</p>;
  }

  return (
    <div className="space-y-4">
      {availableToAdd.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {t('subpageConfigPage.clients.addPlatform')}:
          </span>
          {availableToAdd.map((k) => (
            <Button
              key={k}
              size="sm"
              variant="outline"
              onClick={() =>
                edit((d) => {
                  d[k] = {
                    displayName: { ...blankLT(), en: k },
                    svgIconKey: svgKeys[0] ?? '',
                    apps: [],
                  };
                })
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {k}
            </Button>
          ))}
        </div>
      )}

      {platformKeys.length > 0 && (
        <Tabs defaultValue={platformKeys[0]}>
          <TabsList className="flex-wrap">
            {platformKeys.map((pk) => (
              <TabsTrigger key={pk} value={pk}>
                {pk}
              </TabsTrigger>
            ))}
          </TabsList>

          {platformKeys.map((pk) => {
            const platform = platforms[pk];
            return (
              <TabsContent key={pk} value={pk} className="space-y-4 pt-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="w-64 max-w-full">
                    <Label className="text-xs text-muted-foreground">
                      {t('subpageConfigPage.clients.platformIcon')}
                    </Label>
                    {iconSelect(platform.svgIconKey, (v) =>
                      edit((d) => {
                        d[pk].svgIconKey = v;
                      }),
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() =>
                      edit((d) => {
                        delete d[pk];
                      })
                    }
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    {t('subpageConfigPage.clients.removePlatform')}
                  </Button>
                </div>

                {(platform.apps ?? []).map((app, ai) => (
                  <Card key={ai}>
                    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
                      <div className="flex flex-1 items-center gap-3">
                        <Input
                          value={app.name}
                          className="max-w-xs"
                          onChange={(e) =>
                            edit((d) => {
                              d[pk].apps[ai].name = e.target.value;
                            })
                          }
                        />
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={app.featured}
                            aria-label={t('subpageConfigPage.clients.featured')}
                            onCheckedChange={(v) =>
                              edit((d) => {
                                d[pk].apps[ai].featured = v;
                              })
                            }
                          />
                          <span className="text-xs text-muted-foreground">
                            {t('subpageConfigPage.clients.featured')}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() =>
                          edit((d) => {
                            d[pk].apps.splice(ai, 1);
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {(app.blocks ?? []).map((block, bi) => (
                        <div key={bi} className="space-y-3 rounded-lg border p-3">
                          <div className="flex flex-wrap items-end gap-3">
                            <div className="w-40">
                              <Label className="text-xs text-muted-foreground">
                                {t('subpageConfigPage.clients.icon')}
                              </Label>
                              {iconSelect(block.svgIconKey, (v) =>
                                edit((d) => {
                                  d[pk].apps[ai].blocks[bi].svgIconKey = v;
                                }),
                              )}
                            </div>
                            <div className="w-40">
                              <Label className="text-xs text-muted-foreground">
                                {t('subpageConfigPage.clients.color')}
                              </Label>
                              <Select
                                value={block.svgIconColor}
                                onValueChange={(v) =>
                                  edit((d) => {
                                    d[pk].apps[ai].blocks[bi].svgIconColor = v;
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {COLORS.map((c) => (
                                    <SelectItem key={c} value={c}>
                                      {c}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="ml-auto text-destructive"
                              onClick={() =>
                                edit((d) => {
                                  d[pk].apps[ai].blocks.splice(bi, 1);
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          {renderLocalized(
                            t('subpageConfigPage.clients.blockTitle'),
                            block.title,
                            (v) =>
                              edit((d) => {
                                d[pk].apps[ai].blocks[bi].title = v;
                              }),
                          )}
                          {renderLocalized(
                            t('subpageConfigPage.clients.blockDescription'),
                            block.description,
                            (v) =>
                              edit((d) => {
                                d[pk].apps[ai].blocks[bi].description = v;
                              }),
                            true,
                          )}

                          <div className="space-y-3">
                            {(block.buttons ?? []).map((btn, ci) => (
                              <div
                                key={ci}
                                className="space-y-2 rounded-md border border-dashed p-2"
                              >
                                <div className="flex flex-wrap items-end gap-2">
                                  <div className="w-40">
                                    <Label className="text-xs text-muted-foreground">
                                      {t('subpageConfigPage.clients.buttonType')}
                                    </Label>
                                    <Select
                                      value={btn.type}
                                      onValueChange={(v) =>
                                        edit((d) => {
                                          d[pk].apps[ai].blocks[bi].buttons[ci].type = v;
                                        })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {BUTTON_TYPES.map((bt) => (
                                          <SelectItem key={bt} value={bt}>
                                            {t(`subpageConfigPage.clients.types.${bt}`)}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="w-36">
                                    <Label className="text-xs text-muted-foreground">
                                      {t('subpageConfigPage.clients.icon')}
                                    </Label>
                                    {iconSelect(btn.svgIconKey, (v) =>
                                      edit((d) => {
                                        d[pk].apps[ai].blocks[bi].buttons[ci].svgIconKey = v;
                                      }),
                                    )}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="ml-auto text-destructive"
                                    onClick={() =>
                                      edit((d) => {
                                        d[pk].apps[ai].blocks[bi].buttons.splice(ci, 1);
                                      })
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">
                                    {t('subpageConfigPage.clients.buttonLink')}
                                  </Label>
                                  <Input
                                    value={btn.link}
                                    placeholder="happ://add/{{SUBSCRIPTION_LINK}}"
                                    onChange={(e) =>
                                      edit((d) => {
                                        d[pk].apps[ai].blocks[bi].buttons[ci].link = e.target.value;
                                      })
                                    }
                                  />
                                </div>
                                {renderLocalized(
                                  t('subpageConfigPage.clients.buttonText'),
                                  btn.text,
                                  (v) =>
                                    edit((d) => {
                                      d[pk].apps[ai].blocks[bi].buttons[ci].text = v;
                                    }),
                                )}
                              </div>
                            ))}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                edit((d) => {
                                  d[pk].apps[ai].blocks[bi].buttons.push(newButton());
                                })
                              }
                            >
                              <Plus className="mr-1 h-3.5 w-3.5" />
                              {t('subpageConfigPage.clients.addButton')}
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          edit((d) => {
                            d[pk].apps[ai].blocks.push(newBlock());
                          })
                        }
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        {t('subpageConfigPage.clients.addBlock')}
                      </Button>
                    </CardContent>
                  </Card>
                ))}

                <Button
                  variant="outline"
                  onClick={() =>
                    edit((d) => {
                      d[pk].apps.push(newApp());
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('subpageConfigPage.clients.addApp')}
                </Button>
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
