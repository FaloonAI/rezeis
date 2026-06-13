# Caddy combined — rezeis + reiwa на одном VPS (443-only, свой SAN-cert)

Один Caddy-контейнер обслуживает обе поверхности по сети `remnawave-network`:

| Домен | → | Что это |
|---|---|---|
| `PANEL_DOMAIN` | `rezeis:8000` | админка |
| `APP_DOMAIN` | `reiwa:5000` | кабинет / Mini App / webApp бота |

Наружу открыт **только 443**. Сертификат — заранее выпущенный, один на оба
домена (SAN), лежит рядом с `docker-compose.yml`.

## Установка

```bash
# 0) общая сеть (если Remnawave не на этом VPS)
docker network create remnawave-network 2>/dev/null || true

# 1) каталог прокси
mkdir -p /opt/rezeis/caddy && cd /opt/rezeis/caddy

# 2) файлы примера
base=https://raw.githubusercontent.com/dizzzable/rezeis/main/rezeis-admin/deploy/proxies/caddy-combined
curl -fsSL -o docker-compose.yml "$base/docker-compose.yml"
curl -fsSL -o Caddyfile          "$base/Caddyfile.example"

# 3) SAN-сертификат на ОБА домена (80 нужен только сейчас, прокси ещё не запущен)
apt update && apt install -y socat
curl https://get.acme.sh | sh
~/.acme.sh/acme.sh --issue --standalone \
    -d PANEL_DOMAIN -d APP_DOMAIN \
    --key-file       /opt/rezeis/caddy/privkey.key \
    --fullchain-file /opt/rezeis/caddy/fullchain.pem

# 4) подставить домены и поднять
sed -i 's/PANEL_DOMAIN/panel.example.com/; s/APP_DOMAIN/app.example.com/' Caddyfile
docker compose up -d
```

Требования: A-записи обоих доменов → IP этого VPS; на момент шага 3 порт 80
свободен; в дальнейшем наружу нужен только 443. `REZEIS_DOMAIN`/`ADMIN_CORS_ORIGINS`
в `.env` rezeis = `https://PANEL_DOMAIN`, `REIWA_DOMAIN` в reiwa = `APP_DOMAIN`.
