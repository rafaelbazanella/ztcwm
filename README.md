# ztcwm — ZeroTier Controller Web Manager

[![Buy Me a Beer](https://img.shields.io/badge/🍺-Buy%20Me%20a%20Beer-yellow)](#-buy-me-a-beer)

A secure, role-based web admin interface for self-hosted ZeroTier network controllers, where the ZeroTier auth token never leaves the server.

## 🍺 Buy Me a Beer

If this project saves you time, helps your team, or just makes your life easier, consider supporting it.

Your support helps keep the project maintained, secure, and evolving.

- **Crypto (recommended)**  
  - BTC (BSC): `0xbc05bcc33d4f4503575a5e43891b9f5c8da862ff`
  - USDT (SOL): `HQDUo4nBt2UpAUWuVsPCbD51bsov2yqT9pPR1hWLqSmU`

- **PayPal**  
  `Soon`

- **Pix (Brazil)**  
  `rafaelbazanella@gmail.com`

---

No pressure — even a ⭐ on the repo already helps a lot.

## What This Is

A web application for managing a self-hosted ZeroTier network controller. The frontend is a Lit-based single-page application; the backend is a Fastify + SQLite service that handles authentication, role-based access control, and proxies every ZeroTier API call so the auth token stays server-side. Designed for small operations teams running their own controller — typically 1–20 admins/operators on a single VM.

This is an admin tool, not a multi-tenant SaaS: one controller, one operations team, one VM. The codebase is small enough (~31,000 lines of TypeScript across ~104 files) for one engineer to hold in their head, and intentionally kept that way — minimal dependencies, no framework migrations, no service mesh.

## Core Value

A secure, role-based admin interface where the ZeroTier auth token never leaves the server. The browser never sees the token; the backend holds it AES-256-GCM-encrypted in SQLite, decrypts on demand, and proxies the controller API on every request.

Three principles drive the design:

- **Token confinement** — the controller's authority lives on the server. Nothing the browser can read or be tricked into exfiltrating ever holds the ZeroTier auth token.
- **Single security boundary** — every privileged action goes through one Fastify backend running as a non-root system user. The backend owns auth, sessions, CSRF, RBAC, rate limiting, and the ZeroTier proxy. There is no second path.
- **Smallest viable surface** — local accounts only (no OAuth/SSO), nginx + systemd (no Docker, no service mesh), plain Markdown docs (no static-site framework). Less code, less rope.

## Architecture

Operators use a Lit single-page application served from a Fastify backend. Every request from the SPA hits Fastify first — it owns the session cookie, enforces role-based access (Admin / Operator / Viewer), and proxies whitelisted ZeroTier endpoints to the controller running on `127.0.0.1:9993`. SQLite (in WAL mode) persists users, sessions, and the AES-256-GCM-encrypted ZeroTier auth token. There is no direct browser-to-controller path: even in development, Fastify is the gateway.

In production, nginx terminates TLS and reverse-proxies to Fastify on `127.0.0.1:3000`. In development, Vite serves the frontend on `:3001` and Fastify proxies non-`/api/*` requests to it via `@fastify/http-proxy` — same gateway shape, so the production path is exercised continuously.

```
┌──────────────────────────────────────────────────────────┐
│  Operator's Browser                                      │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Lit SPA (zt-app)                                  │  │
│  │   pages → services → HttpClient                    │  │
│  └─────────────────────────┬──────────────────────────┘  │
│                            │ fetch('/api/...')           │
└────────────────────────────┼─────────────────────────────┘
                             │ HTTPS (TLS 1.3)
                             ▼
                  ┌──────────────────────┐
                  │  nginx (:443)        │  TLS termination
                  │  Let's Encrypt cert  │  + X-Forwarded-*
                  └──────────┬───────────┘
                             │ proxy_pass http://127.0.0.1:3000
                             ▼
        ┌────────────────────────────────────────────┐
        │  Fastify backend (:3000, ztcwm user)       │
        │  ┌──────────────────┐  ┌────────────────┐  │
        │  │ session + CSRF   │  │ RBAC guard     │  │
        │  └────────┬─────────┘  └────────┬───────┘  │
        │           │                     │          │
        │  /api/auth, /api/users,   /api/zt/* proxy  │
        │  /api/setup                     │          │
        │           │                     │          │
        │           ▼                     ▼          │
        │  ┌─────────────────┐   ┌────────────────┐  │
        │  │ better-sqlite3  │   │ AES-GCM crypt  │  │
        │  │ ztcwm.db (WAL)  │   │ (SESSION_SECRET│  │
        │  │ users / sessions│   │ → sha256 → key)│  │
        │  │ zt_config       │   └────────┬───────┘  │
        │  └─────────────────┘            │          │
        └─────────────────────────────────┼──────────┘
                                          │ X-ZT1-Auth + JSON
                                          ▼
                              ┌──────────────────────┐
                              │ ZeroTier One         │
                              │ 127.0.0.1:9993 only  │
                              │ /controller/*, /peer │
                              └──────────────────────┘
```

### Request Lifecycle

A typical authenticated request — for example, "list networks on the controller" — traverses the stack like this:

1. The operator clicks a button in the SPA. A Lit page calls a service, which calls `HttpClient.get('/api/zt/controller/network')`.
2. The browser sends the request to nginx (`:443`). nginx terminates TLS, sets `X-Forwarded-Proto`, `X-Forwarded-For`, `X-Real-IP`, and proxies to Fastify on `127.0.0.1:3000`.
3. Fastify's hook chain runs in order: cookie parse → rate limit (per-route on `/api/auth/*`) → session resolve → CSRF token check → first-run gate → auth gate → RBAC gate.
4. If the request survives the chain, the proxy route fetches the AES-256-GCM-encrypted token row from `zt_config`, decrypts it with `sha256(SESSION_SECRET)`, and forwards the request to `127.0.0.1:9993` with the `X-ZT1-Auth` header.
5. The JSON response is returned to the SPA. The token never leaves the backend.

For deeper architecture detail (per-layer responsibilities, full hook order, migration system), see [docs/architecture.md](docs/architecture.md).

## Features

- **Dashboard** — Network, member, and peer stats at a glance
- **Network management** — Create, configure, and delete ZeroTier networks
- **Member management** — Authorize/deauthorize members, edit assigned IPs inline, search/filter, IPv4-preferred Physical Address column
- **User management** — Admin CRUD for local accounts; three-role RBAC (Admin / Operator / Viewer); username rename with case-insensitive uniqueness
- **Session-based auth** — bcrypt(12) password hashing, HttpOnly + SameSite=strict cookies, CSRF protection, rate limiting on `/api/auth/*`
- **Setup wizard** — first-run flow to create the initial admin and configure the ZeroTier auth token (AES-256-GCM-encrypted, server-side); auto-disables once an admin exists
- **API explorer** — interactive ZeroTier API debugging panel (Admin-only; routes through the same backend proxy)
- **Event log** — in-memory activity log with filter
- **Light + dark themes** — WCAG 2.1 AA contrast on every text/background pair, runtime toggle, persisted per-operator

## Prerequisites

- **Node.js** 20.x LTS — local dev and production both target v20
- **npm** 10+
- **ZeroTier One** 1.14 or later, installed and running locally (port 9993, localhost-only)
- **RAM** ~1 GB free (Fastify + SQLite + Node runtime is small; ZeroTier One is the larger consumer)
- **Disk** ~500 MB free (`node_modules` ~250 MB, build output ~5 MB, SQLite DB grows with users/sessions)
- **Browser** any modern desktop browser (Chrome, Firefox, Edge, Safari) — admin tool is desktop-first
- **OS** Linux, macOS, or Windows for local dev; Ubuntu 24.04 LTS or Amazon Linux 2023 for production deploy

The ZeroTier auth token (read with `sudo cat /var/lib/zerotier-one/authtoken.secret` on Linux) is configured through the setup wizard on first run — there is no manual config-file step.

## Quick Start

If you already have Node.js 20+ and ZeroTier One running:

```bash
git clone <repo-url> && cd ztcwm/src
npm install && cp .env.example .env
npm run dev
```

Then open `http://localhost:3001` and follow the setup wizard at `/setup`.

For a step-by-step path with no assumptions, see Local Installation below.

## Local Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd ztcwm/src

# 2. Install dependencies
npm install

# 3. Copy the environment template
cp .env.example .env
# (in dev, SESSION_SECRET can be any non-empty string)

# 4. Start dev servers (backend on :3000, frontend on :3001)
npm run dev
```

Open `http://localhost:3001` in your browser. On the first visit you will be redirected to `/setup`, where you create the initial admin account and paste your ZeroTier auth token (read it with `sudo cat /var/lib/zerotier-one/authtoken.secret` on Linux). The wizard validates the token by calling the controller before saving it AES-256-GCM-encrypted.

After bootstrap, log in at `/login` with the admin credentials you just created.

### Environment Variables

`src/.env.example` is the canonical reference for every environment variable the backend reads. The seven supported variables are:

| Variable         | Required?           | Default                                  | Notes                                                                  |
| ---------------- | ------------------- | ---------------------------------------- | ---------------------------------------------------------------------- |
| `PORT`           | no                  | `3000`                                   | Fastify listening port                                                 |
| `NODE_ENV`       | no                  | dev (treated as dev unless `production`) | Affects logging level and dev-proxy vs. static-serve mode              |
| `SESSION_SECRET` | yes (in production) | `ztcwm-dev-secret-change-in-production`  | Single secret; sha256-derived AES-GCM key encrypts the stored ZT token |
| `COOKIE_SECURE`  | yes (in production) | `false`                                  | Sets `Secure` flag on session cookie — required behind HTTPS           |
| `ZTCWM_DB_PATH`  | no                  | `<cwd>/data/ztcwm.db`                    | SQLite DB path                                                         |
| `ZTCWM_ZT_URL`   | no                  | n/a                                      | Optional — bypasses the setup wizard's ZT step                         |
| `ZTCWM_ZT_TOKEN` | no                  | n/a                                      | Optional — pre-seed token for Docker-style automated deploys           |

In development, `SESSION_SECRET` may be any non-empty string. In production, generate it with `openssl rand -hex 32` and store it in a mode-`0600` file owned by the service user — see the deployment guide below.

### Project Commands

| Command              | Description                                                      |
| -------------------- | ---------------------------------------------------------------- |
| `npm run dev`        | Start backend + frontend dev servers (Fastify :3000, Vite :3001) |
| `npm run dev:server` | Start backend dev server only                                    |
| `npm run dev:client` | Start frontend dev server only                                   |
| `npm run build`      | Type-check + Vite build + compile backend (`server/dist/`)       |
| `npm start`          | Run the compiled production server (`NODE_ENV=production`)       |
| `npm run preview`    | Preview the built frontend                                       |
| `npm run lint`       | Run ESLint over the workspace                                    |
| `npm run format`     | Run Prettier over `**/*.{ts,html,css,json}`                      |
| `npm test`           | Run the full Vitest suite once                                   |
| `npm run test:watch` | Run Vitest in watch mode                                         |

Every command above maps to a script in `src/package.json`. Inventing an additional `npm run …` flag at the command line will not work — there are no hidden scripts.

### First-Run Bootstrap

The first time anyone visits the running app, the backend's first-run gate redirects to `/setup`. The setup wizard does three things:

1. Creates the initial Admin account (username, password ≥ 12 chars, bcrypt(12) hash).
2. Validates the ZeroTier controller URL and auth token by calling the controller live.
3. Stores the controller URL plus the token (AES-256-GCM-encrypted with `sha256(SESSION_SECRET)`) in the `zt_config` row.

Once any Admin exists, `/setup` is closed off; routing falls back to `/login`.

### Project Layout

A high-level map of `src/` (full per-file detail lives in [docs/development.md](docs/development.md)):

```
src/
├── package.json          # Scripts, deps, single-workspace
├── vite.config.ts        # Vite dev/build config
├── tsconfig.json         # Frontend tsconfig
├── index.html            # Frontend entry HTML
├── main.ts               # Bootstrap (registers <zt-app>)
├── app.ts                # Root app shell
├── api/                  # HttpClient (cookie-aware fetch wrapper)
├── components/           # Reusable Lit components (data-table, modal, …)
├── pages/                # Route-targeted pages (login, setup, dashboard, …)
├── services/             # Domain services (network, member, user, …)
├── styles/               # theme.ts (CSS custom properties), shared.ts
├── types/                # TypeScript interfaces (zerotier.ts, etc.)
├── utils/                # Helpers (concurrency, formatters, …)
├── tests/                # Vitest suites (frontend + backend; co-located *.test.ts also exist)
└── server/               # Fastify backend
    ├── index.ts          # Entry: hooks, plugin registration, listen()
    ├── tsconfig.json     # Backend tsconfig (CommonJS-target compile)
    ├── auth/             # session-store, password, rbac, username
    ├── db/               # better-sqlite3 client, migrator, zt-config (AES-GCM)
    ├── migrations/       # Numbered SQL migrations applied on startup
    └── routes/           # api, auth, setup, users, zt-proxy
```

The frontend and backend share one `package.json` and one `node_modules`; `npm run build` produces both `dist/` (frontend assets) and `server/dist/` (compiled backend) so a single `node server/dist/index.js` serves the SPA and the API together.

## Running Tests

```bash
cd src
npm test
```

The full suite runs in roughly 20 seconds and currently covers 628 tests across 32 files (Vitest + happy-dom + @open-wc/testing). For watch-mode iteration:

```bash
npm run test:watch
```

To run a single test file:

```bash
npx vitest run path/to/file.test.ts
```

To filter by test name:

```bash
npx vitest run -t "test name substring"
```

The suite is self-contained: tests use happy-dom for the DOM, an in-memory SQLite database for backend tests, and never touch the ZeroTier controller or the network. They are safe to run on a build machine that has no ZeroTier service installed.

For the per-suite breakdown (frontend unit tests, Lit component tests, backend route tests) and how to add new tests, see [docs/development.md](docs/development.md#testing).

## Deploying to AWS EC2

This section produces a hardened production deploy of ztcwm on AWS EC2 — TLS-terminated nginx in front of a non-root systemd-supervised Fastify backend, SQLite hot-backed-up daily, ZeroTier One running on the same host. Tested against Ubuntu 24.04 LTS and Amazon Linux 2023.

Every command in this section is paste-ready: substitute the angle-bracketed placeholders (`<your-domain>`, `<admin-email>`, etc.) from the pre-flight checklist below, then paste each fenced block as-is. Steps that differ between the two operating systems are split into `#### Ubuntu 24.04` and `#### Amazon Linux 2023` sub-blocks; identical steps appear once.

### 10.1 Pre-flight Checklist

Collect every value before pasting any commands:

- `<your-domain>` — the FQDN you will point at the EC2 instance (e.g. `ztcwm.example.com`)
- `<admin-email>` — the email Let's Encrypt sends expiry warnings to
- `<aws-region>` — the AWS region for the EC2 instance (e.g. `us-east-1`)
- `<ec2-public-ip>` — the EC2 instance's public IP (or elastic IP)
- `<your-cidr>` — your administrator IP range (used for the SSH SG rule; do NOT use `0.0.0.0/0`)

Then, before running the certbot step (10.8): point a DNS A record for `<your-domain>` at `<ec2-public-ip>` and wait for propagation (`dig <your-domain> +short` returns the IP). Without this, Let's Encrypt's HTTP-01 challenge will fail.

### 10.2 Provision the EC2 Instance and Security Group

Pick an OS:

- **Ubuntu 24.04 LTS (Noble)** — most common, larger ecosystem
- **Amazon Linux 2023** — AWS-native, smaller surface, no EPEL needed

Recommended size: `t3.small` (2 vCPU, 2 GB RAM) — comfortable for ZeroTier One + Fastify + nginx. `t3.micro` works for low traffic but leaves no headroom.

Create a security group with these inbound rules:

| Port | Protocol | Source        | Purpose                                                                       |
| ---- | -------- | ------------- | ----------------------------------------------------------------------------- |
| 22   | TCP      | `<your-cidr>` | SSH — restrict to your administrator IP. Do NOT use `0.0.0.0/0`.              |
| 80   | TCP      | `0.0.0.0/0`   | ACME HTTP-01 challenge for Let's Encrypt; nginx redirects all traffic to 443. |
| 443  | TCP      | `0.0.0.0/0`   | The ztcwm web UI (TLS-terminated by nginx).                                   |
| 9993 | UDP      | `0.0.0.0/0`   | ZeroTier peer traffic (UDP, public; required for ZT to reach peers).          |

UDP 9993 is ZeroTier peer traffic and must be open to the public internet for ZT to reach peers. The ZeroTier One **management API** on TCP 9993 is a different surface and must NEVER appear in the security group — the Fastify backend talks to it over `127.0.0.1:9993` only; exposing it externally would leak the controller's auth surface.

### 10.3 SSH In and Create the ztcwm Service User

```bash
ssh -i <your-key.pem> ec2-user@<ec2-public-ip>   # AL2023 default user
# or: ssh -i <your-key.pem> ubuntu@<ec2-public-ip>  # Ubuntu default user

sudo useradd --system --no-create-home --shell /usr/sbin/nologin ztcwm
sudo install -d -o ztcwm -g ztcwm -m 0750 /var/lib/ztcwm /var/backups/ztcwm
sudo install -d -o root  -g root  -m 0755 /opt/ztcwm
sudo install -d -o root  -g root  -m 0755 /etc/ztcwm
```

`install -d` (not `mkdir -p`) sets owner+mode atomically — required because `ReadWritePaths=/var/lib/ztcwm` in the systemd unit grants the unit write access only if POSIX permissions also allow it (Pitfall 10).

### 10.4 Install Node.js 20

#### Ubuntu 24.04

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # → v20.x.x
```

#### Amazon Linux 2023

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
node --version  # → v20.x.x
```

> If `dnf install nodejs` fails with `GPG check FAILED` on AL2023, run `sudo rpm --import https://rpm.nodesource.com/gpgkey/nodesource-repo.gpg.key` and retry. (See NodeSource issue #1747.)

### 10.5 Install nginx, sqlite3, certbot, and ZeroTier One

#### Ubuntu 24.04

```bash
sudo apt-get update
sudo apt-get install -y nginx sqlite3 certbot python3-certbot-nginx
```

#### Amazon Linux 2023

```bash
sudo dnf install -y nginx sqlite certbot python3-certbot-nginx
```

> Do NOT install certbot via snap. The distribution package ships a `certbot.timer` systemd unit for auto-renewal. If you previously installed via snap, run `sudo snap remove certbot` first.

ZeroTier One — single block, both OSs (the official installer detects the distro):

```bash
curl -s https://install.zerotier.com | sudo bash
sudo systemctl enable --now zerotier-one
sudo zerotier-cli info  # → 200 info <node-id> ...
```

You will need the auth token in step 10.10 — copy it now:

```bash
sudo cat /var/lib/zerotier-one/authtoken.secret
```

### 10.6 Clone, Build, and Lay Out Runtime Directories

```bash
sudo git clone <repo-url> /opt/ztcwm
cd /opt/ztcwm/src
sudo npm ci
sudo npm run build
sudo chown -R ztcwm:ztcwm /opt/ztcwm
```

`/opt/ztcwm` ends up owned by `ztcwm:ztcwm` so the runtime can read its own code; `/var/lib/ztcwm` (the SQLite DB home) was pre-created with the correct ownership in step 10.3.

### 10.7 Configure /etc/ztcwm/ztcwm.env (single secret)

Generate the SESSION_SECRET first — this single value signs sessions AND derives (via `sha256()`) the AES-256-GCM key that encrypts the stored ZeroTier auth token in the `zt_config` table:

```bash
openssl rand -hex 32
```

Copy the output, then write the env file with locked-down permissions in the same paste block (`tee` creates files mode 0644 by default — Pitfall 9):

```bash
sudo tee /etc/ztcwm/ztcwm.env > /dev/null <<'EOF'
NODE_ENV=production
PORT=3000
SESSION_SECRET=<paste output of openssl rand -hex 32>
COOKIE_SECURE=true
ZTCWM_DB_PATH=/var/lib/ztcwm/ztcwm.db
EOF

sudo chmod 0600 /etc/ztcwm/ztcwm.env
sudo chown ztcwm:ztcwm /etc/ztcwm/ztcwm.env
```

> **One secret, not two.** The codebase derives the AES-256-GCM key from `SESSION_SECRET` via `sha256()` (see `src/server/db/zt-config.ts`). Do NOT generate a separate AES key. If you ever rotate `SESSION_SECRET`, the previously-encrypted ZT token in `zt_config` becomes unrecoverable; you'll need to re-run `/setup` with the new secret.

### 10.8 Install the systemd Service Unit

Write `/etc/systemd/system/ztcwm.service` (identical body on both OSs):

```bash
sudo tee /etc/systemd/system/ztcwm.service > /dev/null <<'EOF'
[Unit]
Description=ZeroTier Controller Web Manager
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ztcwm
Group=ztcwm
WorkingDirectory=/opt/ztcwm/src
EnvironmentFile=/etc/ztcwm/ztcwm.env
ExecStart=/usr/bin/node /opt/ztcwm/src/server/dist/index.js
Restart=on-failure
RestartSec=5

# --- Hardening (Node-compatible set; NO MemoryDenyWriteExecute) ---
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
PrivateDevices=yes
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectKernelLogs=yes
ProtectControlGroups=yes
ProtectClock=yes
ProtectHostname=yes
RestrictNamespaces=yes
RestrictRealtime=yes
RestrictSUIDSGID=yes
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
LockPersonality=yes
SystemCallArchitectures=native
ReadWritePaths=/var/lib/ztcwm
# Intentionally NOT set:
#   MemoryDenyWriteExecute  → breaks V8 JIT (Node SIGSEGVs)
CapabilityBoundingSet=
AmbientCapabilities=

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now ztcwm
sudo systemctl status ztcwm
```

> The `MemoryDenyWriteExecute` directive is intentionally omitted (the unit body contains no such line, and adding it with a `yes` value would crash Node) — it is incompatible with Node's V8 JIT, which writes executable pages at runtime. The broader `Protect*` and `Restrict*` family above provides equivalent kernel-surface coverage without breaking the runtime. See nodejs/node#62515.

Verify the hardening profile:

```bash
sudo systemd-analyze security ztcwm
```

Expected exposure score: ≤ 2.0 ("OK" / "low exposure").

### 10.9 Configure nginx as the TLS-Terminating Reverse Proxy

The server-block content is **identical** on both OSs; only the file location differs.

#### Ubuntu 24.04

```bash
sudo tee /etc/nginx/sites-available/ztcwm.conf > /dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name <your-domain>;

    # Allow ACME HTTP-01 challenge during issuance/renewal,
    # redirect everything else to HTTPS.
    location /.well-known/acme-challenge/ {
        root /var/lib/letsencrypt;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name <your-domain>;

    # Cert paths populated by certbot --nginx
    ssl_certificate     /etc/letsencrypt/live/<your-domain>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<your-domain>/privkey.pem;

    # Modern TLS profile (Mozilla intermediate-equivalent)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    # Auth + setup wizard POST bodies are tiny; cap generously
    client_max_body_size 1m;

    # gzip on text mime types only
    gzip on;
    gzip_types text/plain text/css application/javascript application/json;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/ztcwm.conf /etc/nginx/sites-enabled/ztcwm.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

#### Amazon Linux 2023

```bash
sudo tee /etc/nginx/conf.d/ztcwm.conf > /dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name <your-domain>;

    location /.well-known/acme-challenge/ {
        root /var/lib/letsencrypt;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name <your-domain>;

    ssl_certificate     /etc/letsencrypt/live/<your-domain>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<your-domain>/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    client_max_body_size 1m;
    gzip on;
    gzip_types text/plain text/css application/javascript application/json;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }
}
EOF

sudo systemctl enable --now nginx
sudo nginx -t && sudo systemctl reload nginx
```

### 10.10 Issue the TLS Certificate via Let's Encrypt

DNS for `<your-domain>` must already resolve to `<ec2-public-ip>` and TCP 80 must be open. Then:

```bash
sudo certbot --nginx -d <your-domain> --non-interactive \
    --agree-tos --email <admin-email> --redirect
```

Verify auto-renewal is wired up (the distro certbot package ships the timer):

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

### 10.11 Install the SQLite Backup Timer

Two-unit pair: a `oneshot` service that calls SQLite's online backup API + a daily timer that fires it. Plain `cp` on a WAL-mode SQLite DB is unsafe under concurrent writes — `.backup` is the supported path.

```bash
sudo tee /etc/systemd/system/ztcwm-backup.service > /dev/null <<'EOF'
[Unit]
Description=Hot backup of ZTCWM SQLite database
After=ztcwm.service

[Service]
Type=oneshot
User=ztcwm
Group=ztcwm
ExecStart=/bin/sh -c 'sqlite3 /var/lib/ztcwm/ztcwm.db ".backup ''/var/backups/ztcwm/ztcwm-$(date +%%F).db''"'
ExecStartPost=/usr/bin/find /var/backups/ztcwm -name "ztcwm-*.db" -mtime +7 -delete
EOF

sudo tee /etc/systemd/system/ztcwm-backup.timer > /dev/null <<'EOF'
[Unit]
Description=Daily ZTCWM SQLite backup

[Timer]
OnCalendar=daily
RandomizedDelaySec=1h
Persistent=true

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now ztcwm-backup.timer
sudo systemctl list-timers ztcwm-backup.timer
```

The backup contains the `zt_config` table whole — the AES-256-GCM-encrypted ZeroTier token is included automatically. **The encryption key (`SESSION_SECRET` from `/etc/ztcwm/ztcwm.env`) is NOT in the database.** Back up `/etc/ztcwm/ztcwm.env` alongside the SQLite backups, or memorialize the secret separately — without it, the encrypted token in any backup is unrecoverable.

### 10.12 Bootstrap the First Admin via the Setup Wizard

Open `https://<your-domain>/setup` in a browser. The wizard:

1. Asks for an admin username + password (server-side bcrypt(12) hashing)
2. Asks for the ZeroTier auth token (paste the value from step 10.5)
3. Validates the token against `127.0.0.1:9993` and stores it AES-256-GCM-encrypted

Once any admin exists, `/setup` auto-disables — the route returns 404 and the rest of the app is gated behind `/login`. There is no CLI seed script.

### 10.13 Verify Service Persistence Across Reboot

```bash
sudo reboot
# (wait for the host to come back; ssh in)
sudo systemctl status ztcwm
sudo systemctl status ztcwm-backup.timer
sudo systemctl status zerotier-one
```

All three units must show `active (running)` (or `active (waiting)` for the timer). If any failed, `sudo journalctl -u <unit> -b` shows the boot's logs.

### 10.14 Troubleshooting

- **Service starts then SIGSEGVs:** Check `sudo journalctl -u ztcwm -e` for `MemoryDenyWriteExecute` — it must NOT appear in the unit (incompatible with Node V8 JIT).
- **Service refuses to start:** `sudo journalctl -u ztcwm -e` shows `EnvironmentFile=...: Permission denied` → re-run `sudo chmod 0600 /etc/ztcwm/ztcwm.env && sudo chown ztcwm:ztcwm /etc/ztcwm/ztcwm.env`.
- **Service starts but cannot write to DB:** `EACCES: permission denied, open '/var/lib/ztcwm/ztcwm.db'` → `sudo chown -R ztcwm:ztcwm /var/lib/ztcwm`.
- **certbot HTTP-01 fails:** DNS not propagated (`dig <your-domain> +short`), or TCP 80 not open in the SG, or nginx not running.
- **Browser gets ERR_CONNECTION_REFUSED on /:443:** nginx not running (`sudo systemctl status nginx`) or the SG doesn't allow TCP 443.
- **Login works but cookie not set in production:** `COOKIE_SECURE=true` requires actual HTTPS — check that the request hit nginx:443, not nginx:80 directly.

## Documentation

- [Architecture](docs/architecture.md) — Deep technical reference: request lifecycle, layer responsibilities, security boundaries
- [Development Guide](docs/development.md) — Contributor workflow, project structure, testing strategy, backend patterns
- [API Reference](docs/api-reference.md) — Upstream ZeroTier One API endpoints (proxied by the backend; for backend maintainers)

## License

MIT
