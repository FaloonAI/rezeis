# Caddy combined — rezeis + reiwa на одном VPS

Один Caddy-контейнер обслуживает обе поверхности по общей docker-сети
`remnawave-network`:

| Домен | Куда проксируется | Что это |
|---|---|---|
| `PANEL_DOMAIN` (напр. `panel.example.com`) | `rezeis:8000` | админка |
| `APP_DOMAIN` (напр. `app.example.com`) | `reiwa:5000` | кабинет / Mini App / webApp бота |

TLS — автоматический Let's Encrypt (HTTP-01), поэтому открыты **80 и 443**.
Caddy сам выпускает и продлевает сертификаты — ничего на хосте генерировать
не нужно. Если нужен DNS-01/Cloudflare или собственный сертификат — берите
за основу соседние `../caddy/` (acme.sh DNS-01) или `../caddy-auto/`.

## Установка

```bash
# 0) общая сеть (если Remnawave не на этом VPS — создать один раз)
docker network create remnawave-network 2>/dev/null || true

# 1) поднять сами стеки (если ещё не подняты)
cd /opt/rezeis && docker compose up -d
cd /opt/reiwa  && docker compose up -d

# 2) reverse proxy
cd /opt/rezeis/deploy/proxies/caddy-combined
cp Caddyfile.example Caddyfile
# заменить PANEL_DOMAIN и APP_DOMAIN на свои домены
docker compose up -d
docker compose logs -f caddy   # дождаться выдачи сертификатов
```

Требования:
- A-записи `PANEL_DOMAIN` и `APP_DOMAIN` указывают на IP этого VPS.
- Порты `80` и `443` открыты на VPS (80 нужен для HTTP-01 валидации ACME).
- `REZEIS_DOMAIN`/`ADMIN_CORS_ORIGINS` в `.env` rezeis = `https://PANEL_DOMAIN`,
  `REIWA_DOMAIN` в `.env` reiwa = `APP_DOMAIN`.

## Почему один прокси, а не два

На одном VPS оба стека уже в сети `remnawave-network`, поэтому единый Caddy
видит и `rezeis:8000`, и `reiwa:5000` по именам сервисов. Это проще, чем
поднимать два прокси, и не конфликтует за порт 443.
