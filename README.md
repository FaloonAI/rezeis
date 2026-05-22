<p align="center">
  <img src="docs/logo.svg" width="80" alt="Rezeis Logo" />
</p>

<h1 align="center">Rezeis Admin Panel</h1>

<p align="center">
  <strong>Полнофункциональная админ-панель для управления VPN-сервисом на базе Remnawave</strong>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/version-0.2.0-blue" alt="Version" /></a>
  <a href="#"><img src="https://img.shields.io/badge/license-MIT-green" alt="License" /></a>
  <a href="#"><img src="https://img.shields.io/badge/NestJS-11-red" alt="NestJS" /></a>
  <a href="#"><img src="https://img.shields.io/badge/React-19-61dafb" alt="React" /></a>
  <a href="#"><img src="https://img.shields.io/badge/TypeScript-5.9-3178c6" alt="TypeScript" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Prisma-7-2d3748" alt="Prisma" /></a>
  <a href="#"><img src="https://img.shields.io/badge/PostgreSQL-17-336791" alt="PostgreSQL" /></a>
</p>

---

## 🎯 О проекте

Rezeis — это продвинутая админ-панель для управления VPN-инфраструктурой, построенной на [Remnawave Panel](https://github.com/remnawave/panel). Предоставляет единый интерфейс для управления пользователями, подписками, платежами, нодами и мониторинга всей системы.

**Ключевые отличия:**
- 🏗 Монорепо: бэкенд + фронтенд + воркер в одном проекте
- 🔗 Глубокая интеграция с Remnawave через `@remnawave/backend-contract` SDK
- 📊 Real-time мониторинг VPS, процесса и VPN-инфраструктуры
- 🛡 Встроенная Anti-Abuse система с 8 детекторами
- 💰 Мультивалютные платежи (7 шлюзов)
- 🤖 Telegram-бот интеграция (Reiwa)

---

## ✨ Возможности

### 📊 Dashboard
- KPI-карточки с trend-индикаторами и анимацией
- График онлайн-пользователей за 24ч (real-time)
- Donut chart распределения подписок
- Мониторинг VPS: CPU, RAM, Disk, Load Average, Network
- Мониторинг процесса: RSS, Heap, Event Loop Lag
- Activity Feed — лента событий от Remnawave
- Quick Actions — навигация в 1 клик

### 👥 Пользователи
- Полный CRUD с поиском и фильтрацией
- Детальная карточка пользователя (подписки, платежи, устройства)
- Массовые операции (блокировка, удаление, экспорт)
- HWID устройства — просмотр и управление
- Cmd+K глобальный поиск по всем сущностям

### 💳 Подписки и платежи
- Управление тарифными планами (traffic/devices/both/unlimited)
- 7 платёжных шлюзов: YooKassa, Telegram Stars, Platega, Heleket, Cryptomus, Mulenpay, Antilopay
- Мультивалютность: USD, RUB, USDT, XTR, TON, BTC, ETH
- Промокоды с 6 типами наград
- Реферальная система + партнёрская программа

### 🛰 Remnawave интеграция
- Управление нодами (enable/disable/restart/reset traffic)
- Управление хостами и конфиг-профилями
- Squads (internal/external)
- Гео-распределение пользователей по странам
- Метрики: онлайн тренды, bandwidth, system stats
- Webhook-приёмник с HMAC-SHA256 валидацией
- Автоматическая синхронизация профилей через BullMQ

### 🛡 Anti-Abuse
- 8 детекторов: failed payments, referral velocity, promo abuse, rapid churn, HWID anomalies, node traffic, geo concentration, offline nodes
- Автоматические действия по severity (notify / block / freeze)
- Persistent fraud signals с lifecycle (OPEN → ACKNOWLEDGED → RESOLVED)
- Cron-цикл каждые 5 минут

### 📢 Рассылки (Broadcast)
- Создание рассылок по аудиториям (ALL, ACTIVE, EXPIRED, TRIAL)
- Очередь отправки через BullMQ
- Статистика доставки

### 🔐 Безопасность
- JWT авторизация с token versioning
- 2FA (TOTP) с recovery codes
- RBAC — гранулярные роли и права
- IP Allowlist / Blocklist
- Login Guard (brute-force protection)
- Audit Log — полная история действий

### ⚙️ Дополнительно
- Bot Flow Editor — визуальный конструктор Telegram-бота
- FAQ Manager с медиа-файлами
- Backup/Restore базы данных
- Config Portability (экспорт/импорт настроек)
- Система уведомлений (Telegram + email)
- WebSocket real-time обновления
- Swagger API документация

---

## 🏗 Архитектура

```
rezeis/
├── rezeis-admin/           # Основной проект
│   ├── src/                # NestJS backend (API + Worker)
│   │   ├── common/        # Shared: config, prisma, guards, filters, cache
│   │   └── modules/       # Feature modules (40+)
│   │       ├── auth/              # JWT + 2FA + Login Guard
│   │       ├── dashboard/         # KPI summary + System Health
│   │       ├── remnawave/         # Panel integration + Metrics + Webhooks
│   │       ├── anti-fraud/        # 8 detectors + signal lifecycle
│   │       ├── payments/          # 7 gateways + webhook processing
│   │       ├── subscriptions/     # Lifecycle + auto-renew
│   │       ├── profile-sync/      # BullMQ → Remnawave provisioning
│   │       ├── broadcast/         # Mass messaging
│   │       ├── bot-flow/          # Visual bot editor
│   │       ├── rbac/              # Roles & permissions
│   │       └── ...                # 30+ more modules
│   ├── prisma/             # Schema + migrations (PostgreSQL)
│   ├── web/                # React SPA
│   │   └── src/
│   │       ├── features/   # Page-per-folder (lazy-loaded)
│   │       ├── components/ # Shared UI (shadcn/ui)
│   │       ├── i18n/       # ru.ts + en.ts
│   │       └── lib/        # API client, utils, stores
│   └── docker-compose.yml  # Production stack
├── reiwa/                  # Telegram bot (separate service)
├── docs/                   # Documentation & assets
└── e2e/                    # End-to-end tests
```

---

## 🛠 Технологический стек

### Backend
| Технология | Версия | Назначение |
|-----------|--------|-----------|
| NestJS | 11 | Application framework |
| Prisma | 7 | ORM + migrations |
| PostgreSQL | 17 | Primary database |
| Valkey (Redis) | 8 | Cache + BullMQ broker |
| BullMQ | 5 | Job queues (profile sync, broadcast) |
| Passport + JWT | — | Authentication |
| Swagger | 11 | API documentation |
| Socket.IO | 4 | Real-time WebSocket |
| Helmet | 8 | Security headers |
| `@remnawave/backend-contract` | 2.7.3 | Typed Remnawave SDK |

### Frontend
| Технология | Версия | Назначение |
|-----------|--------|-----------|
| React | 19 | UI framework |
| TypeScript | 5.9 | Type safety |
| Vite | 8 | Build tool |
| TanStack Query | 5 | Server state management |
| Zustand | 5 | Client state |
| shadcn/ui (Radix) | — | Component library |
| Tailwind CSS | 4 | Styling |
| Recharts | 3 | Charts & graphs |
| react-i18next | — | Internationalization (ru/en) |
| react-hook-form + Zod | — | Forms & validation |
| Motion (Framer) | — | Animations |
| @xyflow/react | 12 | Bot Flow Editor |

### Infrastructure
| Технология | Назначение |
|-----------|-----------|
| Docker + Compose | Containerization |
| Traefik / Caddy | Reverse proxy |
| GitHub Actions | CI/CD |
| GHCR | Container registry |

---

## 🚀 Быстрый старт

### Требования
- Node.js 22+
- PostgreSQL 17
- Redis / Valkey 8
- Docker (для production)

### Локальная разработка

```bash
# Клонировать
git clone https://github.com/dizzzable/rezeis.git
cd rezeis/rezeis-admin

# Backend
npm install
cp .env.example .env          # заполнить переменные
npx prisma generate
npx prisma migrate deploy
npm run start:dev

# Frontend (в отдельном терминале)
cd web
npm install
npm run dev
```

### Docker (Production)

```bash
cd rezeis/rezeis-admin
docker compose up -d
```

Панель будет доступна на порту 8000. Фронтенд раздаётся через `ServeStaticModule` из того же контейнера.

---

## 📋 Переменные окружения

| Переменная | Обязательная | Описание |
|-----------|:---:|-----------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis/Valkey URL |
| `JWT_SECRET` | ✅ | Secret для JWT токенов |
| `REZEIS_CRYPT_KEY` | ✅ | AES-256 ключ для шифрования TOTP |
| `REMNAWAVE_HOST` | — | Хост панели Remnawave |
| `REMNAWAVE_PORT` | — | Порт панели Remnawave |
| `REMNAWAVE_TOKEN` | — | API токен Remnawave |
| `REMNAWAVE_WEBHOOK_SECRET` | — | HMAC ключ для webhook |

Полный список — в `.env.example`.

---

## 🔌 API

Swagger UI доступен по адресу `/api/docs` после запуска.

Основные группы эндпоинтов:
- `/api/admin/auth/*` — авторизация
- `/api/admin/dashboard/*` — дашборд и мониторинг
- `/api/admin/remnawave/*` — Remnawave proxy
- `/api/admin/users/*` — пользователи
- `/api/admin/subscriptions/*` — подписки
- `/api/admin/payments/*` — платежи
- `/api/admin/fraud/*` — anti-fraud signals
- `/api/webhook/remnawave` — webhook receiver

---

## 🧪 Quality Gates

```bash
# Backend
npx tsc --noEmit -p tsconfig.json    # TypeScript
npx eslint . --quiet                  # ESLint (0 warnings policy)
npm test                              # Unit tests

# Frontend
cd web
npm run build                         # tsc + vite build
npx eslint . --quiet                  # ESLint (0 warnings policy)
npx vitest run                        # Tests
```

---

## 🐳 Docker Build

Единый Dockerfile собирает:
- `dist/main.js` — API сервер
- `dist/worker.js` — Background worker (BullMQ processors, cron jobs)
- `web/dist/` — SPA (раздаётся через ServeStatic)

Роль процесса определяется через `RUID_PROCESS_ROLE`:
- `all` (default) — API + Worker в одном процессе
- `api` — только HTTP, без cron
- `worker` — только фоновые задачи

---

## 🌍 Интернационализация

Полная поддержка русского и английского языков. Все тексты проходят через `react-i18next` с ключами в `web/src/i18n/ru.ts` и `en.ts`.

---

## 📄 Лицензия

[MIT License](LICENSE) — свободное использование, модификация и распространение.

---

## 🤝 Contributing

1. Fork репозитория
2. Создайте ветку: `git checkout -b feature/your-feature`
3. Commit: `feat(scope): description`
4. Push и откройте Pull Request

Commit convention: `<type>(<scope>): <description>`
Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`, `ci`

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/dizzzable">dizzzable</a>
</p>
