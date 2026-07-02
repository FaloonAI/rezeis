/**
 * Panel Settings Hub — unified settings page (Remnawave-style).
 *
 * Top-level tabs:
 *   1. API Tokens   — create/manage tokens for external services (reiwa, etc.)
 *   2. Appearance   — theme, colors, radius, layout, presets, effects
 *   3. Security     — sub-tabs: TOTP 2FA · Notifications (push) · Auth Providers
 *   4. Backups      — DB backup management
 *   5. Branding     — sub-tabs (Customization): Brand · Icons
 *   6. Config       — config import/export portability
 *
 * Replaces the separate /appearance, /settings/api-tokens, /security/2fa,
 * and /backup routes. Accessible via sidebar:
 *   Конфигурация → Настройки панели
 */

import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Archive, Bell, FileCog, Image, Key, Paintbrush, Palette, Settings, Shield } from 'lucide-react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { FadeIn } from '@/lib/motion'
import { withFeatureBundle } from '@/i18n/i18n'
import { PermissionGate } from '@/features/rbac'

const ApiTokensTab = lazy(
  withFeatureBundle('platformSettings', () =>
    import('@/features/settings/api-tokens-page').then((m) => ({
      default: m.ApiTokensPage,
    })),
  ),
)
const AppearanceTab = lazy(
  withFeatureBundle('appearance', () => import('@/features/appearance/appearance-page')),
)
const SecurityTab = lazy(
  withFeatureBundle('twoFactor', () => import('@/features/two-factor/two-factor-page')),
)
const AuthProvidersTab = lazy(() => import('./auth-providers-tab'))
const BrandingTab = lazy(() => import('./panel-branding-tab'))
const IconsTab = lazy(() => import('./panel-icons-tab'))
const BackupTab = lazy(() => import('@/features/backup/backup-page'))
const ConfigPortabilityTab = lazy(() => import('@/features/config-portability/config-portability-page'))
const NotificationsTab = lazy(() => import('./panel-notifications-tab'))

function TabFallback() {
  return (
    <div className="space-y-4 pt-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export default function PanelSettingsHub() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Settings className="h-6 w-6" />
            {t('panelSettings.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('panelSettings.subtitle')}
          </p>
        </div>
      </FadeIn>

      <Tabs defaultValue="appearance" className="space-y-4">
        <TabsList className="flex-wrap">
          <PermissionGate resource="api_tokens" action="view" hideWhileLoading>
            <TabsTrigger value="api-tokens" className="gap-1.5">
              <Key className="h-3.5 w-3.5" />
              {t('panelSettings.tabs.apiTokens')}
            </TabsTrigger>
          </PermissionGate>
          <TabsTrigger value="appearance" className="gap-1.5">
            <Palette className="h-3.5 w-3.5" />
            {t('panelSettings.tabs.appearance')}
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            {t('panelSettings.tabs.security')}
          </TabsTrigger>
          <PermissionGate resource="backups" action="view" hideWhileLoading>
            <TabsTrigger value="backups" className="gap-1.5">
              <Archive className="h-3.5 w-3.5" />
              {t('panelSettings.tabs.backups')}
            </TabsTrigger>
          </PermissionGate>
          <TabsTrigger value="branding" className="gap-1.5">
            <Paintbrush className="h-3.5 w-3.5" />
            {t('panelSettings.tabs.branding')}
          </TabsTrigger>
          <PermissionGate resource="config_portability" action="view" hideWhileLoading>
            <TabsTrigger value="config" className="gap-1.5">
              <FileCog className="h-3.5 w-3.5" />
              {t('panelSettings.tabs.config')}
            </TabsTrigger>
          </PermissionGate>
        </TabsList>

        <PermissionGate resource="api_tokens" action="view" hideWhileLoading>
          <TabsContent value="api-tokens">
            <Suspense fallback={<TabFallback />}>
              <ApiTokensTab />
            </Suspense>
          </TabsContent>
        </PermissionGate>

        <TabsContent value="appearance">
          <Suspense fallback={<TabFallback />}>
            <AppearanceTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="security">
          <Tabs defaultValue="twofa" className="space-y-4">
            <TabsList className="flex-wrap">
              <TabsTrigger value="twofa" className="gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                {t('panelSettings.security.twofa')}
              </TabsTrigger>
              <TabsTrigger value="sec-notifications" className="gap-1.5">
                <Bell className="h-3.5 w-3.5" />
                {t('panelSettings.security.notifications')}
              </TabsTrigger>
              <PermissionGate resource="auth_providers" action="view" hideWhileLoading>
                <TabsTrigger value="sec-auth" className="gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  {t('panelSettings.security.auth')}
                </TabsTrigger>
              </PermissionGate>
            </TabsList>
            <TabsContent value="twofa">
              <Suspense fallback={<TabFallback />}>
                <SecurityTab />
              </Suspense>
            </TabsContent>
            <TabsContent value="sec-notifications">
              <Suspense fallback={<TabFallback />}>
                <NotificationsTab />
              </Suspense>
            </TabsContent>
            <PermissionGate resource="auth_providers" action="view" hideWhileLoading>
              <TabsContent value="sec-auth">
                <Suspense fallback={<TabFallback />}>
                  <AuthProvidersTab embedded />
                </Suspense>
              </TabsContent>
            </PermissionGate>
          </Tabs>
        </TabsContent>

        <PermissionGate resource="backups" action="view" hideWhileLoading>
          <TabsContent value="backups">
            <Suspense fallback={<TabFallback />}>
              <BackupTab />
            </Suspense>
          </TabsContent>
        </PermissionGate>

        <TabsContent value="branding">
          <Tabs defaultValue="brand" className="space-y-4">
            <TabsList className="flex-wrap">
              <TabsTrigger value="brand" className="gap-1.5">
                <Paintbrush className="h-3.5 w-3.5" />
                {t('panelSettings.customization.brand')}
              </TabsTrigger>
              <TabsTrigger value="cust-icons" className="gap-1.5">
                <Image className="h-3.5 w-3.5" />
                {t('panelSettings.customization.icons')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="brand">
              <Suspense fallback={<TabFallback />}>
                <BrandingTab />
              </Suspense>
            </TabsContent>
            <TabsContent value="cust-icons">
              <Suspense fallback={<TabFallback />}>
                <IconsTab />
              </Suspense>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <PermissionGate resource="config_portability" action="view" hideWhileLoading>
          <TabsContent value="config">
            <Suspense fallback={<TabFallback />}>
              <ConfigPortabilityTab embedded />
            </Suspense>
          </TabsContent>
        </PermissionGate>
      </Tabs>
    </div>
  )
}
