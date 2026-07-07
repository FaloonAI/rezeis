import { LANDING_SCHEMA_VERSION, type LandingConfigPayload } from './landing-config.schema';

/**
 * Bundled default landing template — a coherent VPN marketing page, shipped
 * `enabled: false` so it has zero effect until an operator turns it on and
 * publishes. Order follows the researched VPN-landing convention:
 * hero → trustLogos → featuresGrid → howItWorks → pricing(catalog) → faq →
 * ctaBanner → footer. Every visible string is provided in ru AND en so the
 * template passes publish-strict out of the box.
 */
export const DEFAULT_LANDING_CONFIG: LandingConfigPayload = {
  schemaVersion: LANDING_SCHEMA_VERSION,
  enabled: false,
  theme: { inherit: true },
  locales: ['ru', 'en'],
  defaultLocale: 'ru',
  meta: {
    title: { ru: 'Быстрый и приватный VPN', en: 'Fast, private VPN' },
    description: {
      ru: 'Защитите своё соединение и получите доступ к свободному интернету.',
      en: 'Secure your connection and reach the open internet.',
    },
  },
  sections: [
    {
      id: 'hero',
      type: 'hero',
      visible: true,
      data: {
        eyebrow: { ru: 'Приватность по умолчанию', en: 'Privacy by default' },
        heading: {
          ru: 'Интернет без границ и слежки',
          en: 'The internet without borders or tracking',
        },
        subheading: {
          ru: 'Высокая скорость, современные протоколы и простое подключение на всех устройствах.',
          en: 'High speed, modern protocols and easy setup on every device.',
        },
        primaryCta: {
          label: { ru: 'Начать', en: 'Get started' },
          action: 'register',
        },
        secondaryCta: {
          label: { ru: 'Войти', en: 'Sign in' },
          action: 'login',
        },
        align: 'center',
      },
    },
    {
      id: 'trust',
      type: 'trustLogos',
      visible: true,
      data: {
        heading: { ru: 'Нам доверяют', en: 'Trusted by' },
        logos: [],
      },
    },
    {
      id: 'features',
      type: 'featuresGrid',
      visible: true,
      data: {
        heading: { ru: 'Почему мы', en: 'Why us' },
        columns: 3,
        items: [
          {
            icon: 'zap',
            title: { ru: 'Высокая скорость', en: 'High speed' },
            body: {
              ru: 'Оптимизированные серверы для стриминга и загрузок.',
              en: 'Optimized servers for streaming and downloads.',
            },
          },
          {
            icon: 'shield',
            title: { ru: 'Надёжная защита', en: 'Strong protection' },
            body: {
              ru: 'Современное шифрование трафика.',
              en: 'Modern traffic encryption.',
            },
          },
          {
            icon: 'smartphone',
            title: { ru: 'Все платформы', en: 'Every platform' },
            body: {
              ru: 'iOS, Android, Windows, macOS и роутеры.',
              en: 'iOS, Android, Windows, macOS and routers.',
            },
          },
        ],
      },
    },
    {
      id: 'how',
      type: 'howItWorks',
      visible: true,
      data: {
        heading: { ru: 'Как это работает', en: 'How it works' },
        steps: [
          {
            title: { ru: 'Создайте аккаунт', en: 'Create an account' },
            body: { ru: 'Регистрация занимает минуту.', en: 'Sign up in a minute.' },
          },
          {
            title: { ru: 'Выберите тариф', en: 'Choose a plan' },
            body: { ru: 'Гибкие планы под ваши задачи.', en: 'Flexible plans for your needs.' },
          },
          {
            title: { ru: 'Подключитесь', en: 'Connect' },
            body: { ru: 'Установите приложение и включите VPN.', en: 'Install the app and turn on the VPN.' },
          },
        ],
      },
    },
    {
      id: 'pricing',
      type: 'pricing',
      visible: true,
      data: {
        source: 'catalog',
        billingToggle: true,
        heading: { ru: 'Тарифы', en: 'Pricing' },
      },
    },
    {
      id: 'faq',
      type: 'faq',
      visible: true,
      data: {
        heading: { ru: 'Частые вопросы', en: 'FAQ' },
        items: [
          {
            question: { ru: 'Ведёте ли вы логи?', en: 'Do you keep logs?' },
            answer: {
              ru: 'Мы минимизируем сбор данных, необходимых для работы сервиса.',
              en: 'We minimize the data required to operate the service.',
            },
          },
          {
            question: { ru: 'Сколько устройств можно подключить?', en: 'How many devices can I connect?' },
            answer: {
              ru: 'Зависит от выбранного тарифа.',
              en: 'It depends on your chosen plan.',
            },
          },
        ],
      },
    },
    {
      id: 'cta',
      type: 'ctaBanner',
      visible: true,
      data: {
        heading: { ru: 'Готовы начать?', en: 'Ready to start?' },
        body: {
          ru: 'Подключитесь за пару минут.',
          en: 'Get connected in a couple of minutes.',
        },
        cta: { label: { ru: 'Создать аккаунт', en: 'Create account' }, action: 'register' },
        style: 'gradient',
      },
    },
    {
      id: 'footer',
      type: 'footer',
      visible: true,
      data: {
        columns: [
          {
            title: { ru: 'Сервис', en: 'Service' },
            links: [{ label: { ru: 'Вход', en: 'Sign in' }, href: '/sign-in' }],
          },
        ],
        legal: { ru: '© Все права защищены.', en: '© All rights reserved.' },
      },
    },
  ],
};
