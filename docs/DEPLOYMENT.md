# MonadBeat Deployment Guide

This guide provides step-by-step instructions for deploying MonadBeat to production.

---

## Table of Contents

- [Overview](#overview)
- [Method 1: Docker Compose (Recommended)](#method-1-docker-compose-recommended)
  - [Prerequisites](#prerequisites)
  - [Quick Start](#quick-start)
  - [Environment Configuration](#environment-configuration)
  - [Custom Domain & HTTPS Setup](#custom-domain--https-setup)
  - [Database Operations & Seeding](#database-operations--seeding)
  - [Updating & Maintenance](#updating--maintenance)
- [Method 2: Standalone Artifacts Deployment (Bare Metal / VPS)](#method-2-standalone-artifacts-deployment-bare-metal--vps)
  - [Obtaining Artifacts](#obtaining-artifacts)
  - [System Requirements](#system-requirements)
  - [Backend Deployment](#backend-deployment)
  - [Frontend Deployment](#frontend-deployment)
  - [Web Server & Reverse Proxy Configuration](#web-server--reverse-proxy-configuration)
- [Security & Resource Hardening](#security--resource-hardening)
- [Troubleshooting](#troubleshooting)

---

## Overview

MonadBeat consists of three primary components:

1. **Frontend**: A high-performance SolidJS single-page application (SPA).
2. **Backend**: A FastAPI API server calling a sandboxed GHC compiler process to typecheck solutions.
3. **Database**: PostgreSQL storing problems, users, submissions, and leaderboards.

---

## Method 1: Docker Compose (Recommended)

Docker Compose is the recommended path for production deployments. It packages all runtime requirements—including GHC, Python 3.12, PostgreSQL, and Caddy—into isolated containers.

### Prerequisites

- A Linux server (Ubuntu 22.04/24.04, Debian 12, or similar).
- Docker Engine (v24.0+) & Docker Compose (v2.20+).

```sh
# Verify Docker installation
docker --version
docker compose version
```

### Quick Start

1. **Clone the repository**:

   ```sh
   git clone https://github.com/biyuehu/monadbeat.git /opt/monadbeat
   cd /opt/monadbeat
   ```

2. **Configure environment variables**:
   Create a `.env` file based on `.env.example`:

   ```sh
   cp .env.example .env
   ```

   Generate a strong secret key (at least 32 characters) for `JWT_SECRET`:

   ```sh
   openssl rand -hex 32
   ```

   Edit `.env` and fill in `JWT_SECRET`, database passwords, and your public domain.

3. **Start the stack**:

   ```sh
   docker compose up -d --build
   ```

4. **Seed initial problem data**:

   ```sh
   docker compose exec backend uv run python -m scripts.seed
   ```

5. **Verify deployment**:

   ```sh
   docker compose ps
   docker compose logs -f
   ```

### Environment Configuration

Key configuration parameters in `.env`:

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | Public HTTP port exposed by Caddy | `80` (or `443` for HTTPS) |
| `POSTGRES_USER` | PostgreSQL superuser name | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL superuser password | `generate-a-strong-password` |
| `POSTGRES_DB` | PostgreSQL database name | `monadbeat` |
| `JWT_SECRET` | Secret key for JWT session tokens | *(required, min 32 chars)* |
| `SITE_URL` | Public backend URL for OAuth callback | `https://monadbeat.example.com` |
| `FRONTEND_URL` | Allowed CORS origins / post-login redirect | `https://monadbeat.example.com` |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID | *(optional)* |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app secret | *(optional)* |

### Custom Domain & HTTPS Setup

MonadBeat uses [Caddy](https://caddyserver.com/) as its gateway, which provides **automatic, zero-config TLS (HTTPS)** via Let's Encrypt / ZeroSSL.

To configure your custom domain:

1. Edit [`Caddyfile`](../Caddyfile):

   ```caddy
   monadbeat.example.com {
       encode zstd gzip

       # Static frontend SPA
       root * /srv/dist

       # Reverse proxy API endpoints to backend
       @api path /problems* /submissions* /auth* /leaderboard* /me* /users* /admin* /docs* /openapi.json*
       reverse_proxy @api backend:8000

       # Client-side SPA routing fallback
       try_files {path} /index.html
       file_server
   }
   ```

2. Update ports in [`compose.yaml`](../compose.yaml) to expose both HTTP (80) and HTTPS (443):

   ```yaml
   web:
     ports:
       - "80:80"
       - "443:443"
   ```

3. Restart Caddy:

   ```sh
   docker compose restart web
   ```

### Database Operations & Seeding

- **Run database migrations/init**: Tables are created automatically when the backend boots.
- **Seed problems**:

  ```sh
  docker compose exec backend uv run python -m scripts.seed
  ```

- **Backup database**:

  ```sh
  docker compose exec db pg_dump -U postgres monadbeat > backup_$(date +%Y%m%d).sql
  ```

- **Restore database**:

  ```sh
  docker compose exec -T db psql -U postgres monadbeat < backup.sql
  ```

### Updating & Maintenance

To update to the latest version:

```sh
git pull origin main
docker compose build
docker compose up -d
```

---

## Method 2: Standalone Artifacts Deployment (Bare Metal / VPS)

If you prefer deploying directly onto a host system or want to decouple frontend static hosting (e.g. Cloudflare Pages / Vercel / Nginx) from the backend judge server, follow this standalone method.

### Obtaining Artifacts

#### Option A: Download Pre-built Artifacts from GitHub Actions

Every commit and release in the repository triggers the CI pipeline, which produces two build artifacts under the Actions run summary:

- **`backend-dist`**: Contains Python wheel `monadbeat-0.1.0-py3-none-any.whl` and source archive.
- **`frontend-dist`**: Contains the compiled static HTML, CSS, and JS SPA assets.

#### Option B: Build Locally

- **Backend package**:

  ```sh
  uv build --out-dir dist-backend
  ```

- **Frontend bundle**:

  ```sh
  bun run build
  # output located in dist/
  ```

---

### System Requirements

On your target Linux server (Debian 12 / Ubuntu 22.04+ recommended):

- **Python**: `>= 3.11` (or Python 3.12)
- **GHC**: `>= 9.4` (GHC 9.6 recommended)
- **PostgreSQL**: `>= 14`
- **Reverse Proxy**: Nginx or Caddy

Install system dependencies:

```sh
sudo apt update
sudo apt install -y python3 python3-pip python3-venv ghc libgmp-dev postgresql postgresql-contrib curl
```

Verify GHC installation:

```sh
ghc --version
# Should output: The Glorious Glasgow Haskell Compilation System, version 9.4.x / 9.6.x
```

---

### Backend Deployment

1. **Create system user**:

   ```sh
   sudo useradd -m -s /bin/bash monadbeat
   sudo -u monadbeat mkdir -p /home/monadbeat/app
   cd /home/monadbeat/app
   ```

2. **Set up Python Virtual Environment**:

   ```sh
   sudo -u monadbeat python3 -m venv /home/monadbeat/app/.venv
   sudo -u monadbeat /home/monadbeat/app/.venv/bin/pip install --upgrade pip
   ```

3. **Install Backend Package**:
   Copy the `.whl` from `backend-dist` to `/home/monadbeat/app/` and install:

   ```sh
   sudo -u monadbeat /home/monadbeat/app/.venv/bin/pip install monadbeat-*.whl uvicorn[standard] psycopg[binary]
   ```

4. **Configure PostgreSQL**:

   ```sh
   sudo -u postgres psql -c "CREATE USER monadbeat WITH PASSWORD 'YOUR_STRONG_PASSWORD';"
   sudo -u postgres psql -c "CREATE DATABASE monadbeat OWNER monadbeat;"
   ```

5. **Create Environment File (`/home/monadbeat/app/.env`)**:

   ```env
   DATABASE_URL=postgresql+psycopg://monadbeat:YOUR_STRONG_PASSWORD@localhost:5432/monadbeat
   JWT_SECRET=YOUR_MIN_32_CHAR_RANDOM_SECRET_KEY
   SITE_URL=https://monadbeat.example.com
   FRONTEND_URL=https://monadbeat.example.com
   GHC_BINARY=ghc
   GHC_TIMEOUT_SEC=10
   GHC_MEMORY_MB=512
   MAX_CONCURRENT_GHC=4
   ```

   Set strict permissions:

   ```sh
   sudo chmod 600 /home/monadbeat/app/.env
   sudo chown monadbeat:monadbeat /home/monadbeat/app/.env
   ```

6. **Create Systemd Service (`/etc/systemd/system/monadbeat.service`)**:

   ```ini
   [Unit]
   Description=MonadBeat Backend API & Judge
   After=network.target postgresql.service

   [Service]
   Type=simple
   User=monadbeat
   Group=monadbeat
   WorkingDirectory=/home/monadbeat/app
   EnvironmentFile=/home/monadbeat/app/.env
   ExecStart=/home/monadbeat/app/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
   Restart=always
   RestartSec=5
   LimitNOFILE=65535

   [Install]
   WantedBy=multi-user.target
   ```

7. **Enable and start backend**:

   ```sh
   sudo systemctl daemon-reload
   sudo systemctl enable monadbeat
   sudo systemctl start monadbeat
   sudo systemctl status monadbeat
   ```

---

### Frontend Deployment

Extract `frontend-dist` into `/var/www/monadbeat`:

```sh
sudo mkdir -p /var/www/monadbeat
sudo tar -xzf frontend-dist.tar.gz -C /var/www/monadbeat/
# Or copy unzipped dist content directly so /var/www/monadbeat/dist contains index.html
```

---

### Web Server & Reverse Proxy Configuration

You can use either **Nginx** or **Caddy** to serve the static frontend and forward API requests to the backend.

#### Option 1: Nginx Configuration (`/etc/nginx/sites-available/monadbeat`)

```nginx
server {
    listen 80;
    server_name monadbeat.example.com;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Frontend Static Files
    root /var/www/monadbeat/dist;
    index index.html;

    # API endpoints routed to FastAPI backend
    location ~ ^/(problems|submissions|auth|leaderboard|me|users|admin|docs|openapi\.json) {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA routing fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable site and obtain SSL with certbot:

```sh
sudo ln -s /etc/nginx/sites-available/monadbeat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d monadbeat.example.com
```

#### Option 2: Caddy Configuration (`/etc/caddy/Caddyfile`)

```caddy
monadbeat.example.com {
    root * /var/www/monadbeat/dist
    encode zstd gzip

    @api path /problems* /submissions* /auth* /leaderboard* /me* /users* /admin* /docs* /openapi.json*
    reverse_proxy @api 127.0.0.1:8000

    try_files {path} /index.html
    file_server
}
```

Reload Caddy:

```sh
sudo systemctl reload caddy
```

---

## Security & Resource Hardening

1. **GHC Sandbox Security**:
   - The backend executes `ghc` with `-fno-code -c` inside a temporary directory (`tempfile.TemporaryDirectory`).
   - GHC memory is capped by `+RTS -M512m -RTS`.
   - GHC execution time is bounded by `settings.ghc_timeout_sec` (10 seconds).
   - Concurrency is throttled by a thread semaphore (`max_concurrent_ghc=4`).
   - Run the service under an unprivileged user (`monadbeat`), never as `root`.

2. **Database Hardening**:
   - Do not expose PostgreSQL port `5432` to the public internet. Bind exclusively to `127.0.0.1` or the internal Docker network.

3. **Rate Limiting**:
   - Built-in rate limiting (`slowapi`) enforces request limits on submission endpoints (default `10/minute`). Adjust `SUBMIT_RATE_LIMIT` in `.env` if necessary.

---

## Troubleshooting

### GHC Compile Timeout or High Load

- **Symptom**: Submissions return `Type checking timeout (>10s)` or `Server is currently experiencing high load`.
- **Resolution**: Verify host CPU availability. In high-traffic deployments, increase `MAX_CONCURRENT_GHC` or allocate additional CPU cores to the container/VPS.

### Cross-Origin Request Blocked (CORS)

- **Symptom**: Browser console logs CORS error when calling `/problems` or `/auth/github`.
- **Resolution**: Ensure `FRONTEND_URL` in `.env` matches your exact browser URL (including protocol and port). When using reverse proxies (Caddy/Nginx) under the same origin, API requests are routed internally and bypass CORS entirely.

### Database Connection Refused

- **Symptom**: Backend logs `psycopg.OperationalError: connection failed`.
- **Resolution**: Verify that the database container is healthy (`docker compose ps`) or that local PostgreSQL is running (`sudo systemctl status postgresql`). Check credentials in `DATABASE_URL`.
