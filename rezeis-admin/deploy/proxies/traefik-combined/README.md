# Traefik combined — rezeis + reiwa на одном VPS (443-only, свой SAN-cert)

Один Traefik обслуживает оба домена по сети `remnawave-network`:
`PANEL_DOMAIN → rezeis:8000`, `APP_DOMAIN → reiwa:5000`. Сертификат свой
(file-provider, без ACME), порт 80 не используется — наружу только 443.

```bash
docker network create remnawave-network 2>/dev/null || true
mkdir -p /opt/rezeis/traefik/config && cd /opt/rezeis/traefik

base=https://raw.githubusercontent.com/dizzzable/rezeis/main/rezeis-admin/deploy/proxies/traefik-combined
curl -fsSL -o docker-compose.yml      "$base/docker-compose.yml"
curl -fsSL -o traefik.yml             "$base/traefik.yml.example"
curl -fsSL -o config/dynamic.yml      "$base/config/dynamic.yml.example"

# SAN-сертификат на оба домена (80 свободен на момент выпуска)
apt update && apt install -y socat
curl https://get.acme.sh | sh
~/.acme.sh/acme.sh --issue --standalone \
    -d PANEL_DOMAIN -d APP_DOMAIN \
    --key-file       /opt/rezeis/traefik/privkey.key \
    --fullchain-file /opt/rezeis/traefik/fullchain.pem

sed -i 's/PANEL_DOMAIN/panel.example.com/g; s/APP_DOMAIN/app.example.com/g' config/dynamic.yml
docker compose up -d
```

Сертификаты на хосте лежат рядом с `docker-compose.yml`, в контейнер
монтируются в `/certs` и подключаются в `config/dynamic.yml` (`tls.certificates`).
SSE/realtime работают: Traefik не буферизует ответы, `passHostHeader: true`.
