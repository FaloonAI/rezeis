# Reverse-proxy stacks for rezeis-admin

Каждая подпапка — независимый Docker Compose-стек. Стек прокси поднимается
**первым**, панель — **вторым**. Они встречаются в общей внешней сети
`remnawave-network` и общаются по docker DNS (прокси ходит на `rezeis:8000`,
панель сама порты наружу не публикует).

```
Internet ──443──> reverse-proxy ──http://rezeis:8000──> rezeis (контейнер)
                  (свой compose)                        (rezeis-admin/docker-compose.yml)
```

## Один сервис (только панель) vs два сервиса (панель + reiwa) на одном VPS

- **Только панель** → стеки `caddy/`, `caddy-auto/`, `nginx/`, `traefik/`.
- **rezeis + reiwa на ОДНОМ VPS** (два домена, один прокси, один SAN-сертификат
  на оба домена) → стеки `*-combined/`. Это закрывает кейс «один reverse proxy
  на оба проекта»:

| Combined-стек        | TLS                         | Порты | Маршруты |
|----------------------|-----------------------------|-------|----------|
| `caddy-combined/`    | свой cert (напр. acme.sh)   | 443   | `PANEL_DOMAIN→rezeis:8000`, `APP_DOMAIN→reiwa:5000` |
| `nginx-combined/`    | свой cert (напр. acme.sh)   | 443   | то же |
| `angie-combined/`    | свой cert (напр. acme.sh)   | 443   | то же |
| `traefik-combined/`  | свой cert (file-provider)   | 443   | то же |

Все combined-варианты — **443-only** и используют **один заранее выпущенный
SAN-сертификат на оба домена**, лежащий прямо в каталоге прокси:

```bash
apt update && apt install -y socat
curl https://get.acme.sh | sh
~/.acme.sh/acme.sh --issue --standalone \
    -d PANEL_DOMAIN -d APP_DOMAIN \
    --key-file       /opt/rezeis/<proxy>/privkey.key \
    --fullchain-file /opt/rezeis/<proxy>/fullchain.pem
```

Порт 80 нужен только в момент выпуска (acme.sh `--standalone`), к самому прокси
он отношения не имеет. Пошаговые команды — в README каждого `*-combined/`.

## Какой стек выбрать (только панель)

| Стек          | TLS выпускает          | Порты наружу    | Когда выбирать                                                                  |
|---------------|------------------------|-----------------|---------------------------------------------------------------------------------|
| `caddy/`      | acme.sh DNS-01 (CF)    | **только 443**  | Идеально: только 443, работает за CF orange cloud, поддерживает wildcard.       |
| `caddy-auto/` | сам Caddy (HTTP-01)    | 80 + 443        | Самый простой старт без настройки DNS API. Нужен открытый 80.                  |
| `nginx/`      | acme.sh TLS-ALPN-01    | 443 + 8443      | Аналог гайда Remnawave Nginx. 80 не нужен, но 8443 должен быть открыт.         |
| `traefik/`    | сам Traefik (HTTP-01)  | 80 + 443        | Удобно, если уже знаешь Traefik. Конфиг через labels или dynamic-files.        |

> Все варианты равноправны — выбираешь под свой стек / DNS / правила фаервола.

## Порядок развёртывания (общий для всех)

### 0. Один раз: создаём общую сеть

```bash
docker network create remnawave-network 2>/dev/null || true
```

### 1. Поднимаем прокси

```bash
cd /opt/rezeis/proxies/<выбранный>      # caddy / caddy-auto / nginx / traefik
cp <файл-конфига>.example <файл-конфига>
$EDITOR <файл-конфига>                  # вписать домен
docker compose up -d
docker compose logs -f
```

### 2. Поднимаем саму панель

```bash
cd /opt/rezeis/rezeis-admin
cp .env.example .env
$EDITOR .env                            # REZEIS_DOMAIN, REZEIS_CRYPT_KEY, ...
docker compose up -d
```

Открываешь `https://<твой-домен>` — должна появиться форма входа в панель.

## Чувствительные файлы

В каждой папке прокси `.gitignore` запрещает коммитить итоговые конфиги
(`Caddyfile`, `nginx.conf`, `traefik.yml`, `rezeis.yml`) и содержимое
`/etc/acme`. В репозитории остаются только `.example` шаблоны.

## Firewall

Минимально достаточный набор открытых портов на VPS — в README соответствующего
стека прокси. SSH-порт (22 по умолчанию) считается открытым отдельно, в
гайдах не повторяется.
