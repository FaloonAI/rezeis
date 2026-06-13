# Angie combined — rezeis + reiwa на одном VPS (443-only, свой SAN-cert)

Один Angie обслуживает оба домена по сети `remnawave-network`:
`PANEL_DOMAIN → rezeis:8000`, `APP_DOMAIN → reiwa:5000`. Наружу — только 443,
один SAN-сертификат на оба домена рядом с `docker-compose.yml`.

```bash
docker network create remnawave-network 2>/dev/null || true
mkdir -p /opt/rezeis/angie && cd /opt/rezeis/angie

base=https://raw.githubusercontent.com/dizzzable/rezeis/main/rezeis-admin/deploy/proxies/angie-combined
curl -fsSL -o docker-compose.yml "$base/docker-compose.yml"
curl -fsSL -o angie.conf         "$base/angie.conf.example"

apt update && apt install -y socat
curl https://get.acme.sh | sh
~/.acme.sh/acme.sh --issue --standalone \
    -d PANEL_DOMAIN -d APP_DOMAIN \
    --key-file       /opt/rezeis/angie/privkey.key \
    --fullchain-file /opt/rezeis/angie/fullchain.pem

sed -i 's/PANEL_DOMAIN/panel.example.com/g; s/APP_DOMAIN/app.example.com/g' angie.conf
docker compose up -d
```

Сертификаты на хосте лежат рядом с `docker-compose.yml`, в контейнер
монтируются как `/etc/angie/ssl/{fullchain.pem,privkey.key}`.
