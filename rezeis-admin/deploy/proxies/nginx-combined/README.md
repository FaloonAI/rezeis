# Nginx combined — rezeis + reiwa на одном VPS (443-only, свой SAN-cert)

Один Nginx обслуживает оба домена по сети `remnawave-network`:
`PANEL_DOMAIN → rezeis:8000`, `APP_DOMAIN → reiwa:5000`. Наружу — только 443,
сертификат один на оба домена (SAN), лежит рядом с `docker-compose.yml`.

```bash
docker network create remnawave-network 2>/dev/null || true
mkdir -p /opt/rezeis/nginx && cd /opt/rezeis/nginx

base=https://raw.githubusercontent.com/dizzzable/rezeis/main/rezeis-admin/deploy/proxies/nginx-combined
curl -fsSL -o docker-compose.yml "$base/docker-compose.yml"
curl -fsSL -o nginx.conf         "$base/nginx.conf.example"

# SAN-сертификат на оба домена (80 свободен на момент выпуска)
apt update && apt install -y socat
curl https://get.acme.sh | sh
~/.acme.sh/acme.sh --issue --standalone \
    -d PANEL_DOMAIN -d APP_DOMAIN \
    --key-file       /opt/rezeis/nginx/privkey.key \
    --fullchain-file /opt/rezeis/nginx/fullchain.pem

sed -i 's/PANEL_DOMAIN/panel.example.com/g; s/APP_DOMAIN/app.example.com/g' nginx.conf
docker compose up -d
```

Сертификаты монтируются в контейнер как `/etc/nginx/ssl/{fullchain.pem,privkey.key}`
(см. `ssl_certificate*` в `nginx.conf`). На хосте они лежат прямо в каталоге
прокси и подключаются относительными путями из `docker-compose.yml`.
