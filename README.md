# n8n Hetzner Docker Installer

Dieses Repository ermöglicht es, auf einem Hetzner-Server per Docker:

- eine Web-GUI zur Konfiguration (Domain, Let's-Encrypt-E-Mail, Passwörter) zu starten
- automatisch eine `.env` für n8n + Caddy zu erzeugen
- n8n anschließend mit HTTPS zu starten

## Voraussetzungen

- Hetzner-Server (z. B. Ubuntu)
- Domain, die auf die Server-IP zeigt (A-Record)
- Docker + Docker Compose Plugin installiert

Beispiel (Ubuntu):

```bash
apt update
apt install -y ca-certificates curl gnupg

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

## Nutzung

### 1. Repository klonen

```bash
git clone https://github.com/DEIN-USER/n8n-hetzner-installer.git
cd n8n-hetzner-installer
```

### 2. Config-GUI starten

```bash
docker compose -f docker-compose.setup.yml up -d
```

Die GUI ist dann erreichbar unter:

- `http://SERVER_IP:8080`

### 3. In der GUI konfigurieren

- Domain eintragen (z. B. `n8n.DEINEDOMAIN.de`)
- Let's-Encrypt-E-Mail eintragen
- Admin-Nutzername
- Passwort per Button generieren (16 zufällige Zeichen)
- Auf **"Speichern & Installationsbefehl anzeigen"** klicken

Dadurch wird im Projektordner eine `.env` erzeugt.

### 4. n8n + HTTPS starten

In der GUI wird dir ein Befehl angezeigt, typischerweise:

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

Führe diesen im Projektordner aus.

Danach ist n8n erreichbar unter:

- `https://DEINE-DOMAIN`

Login (Basic Auth):

- Benutzer: wie in der GUI angegeben
- Passwort: wie in der GUI angezeigt

## Dateien

- `docker-compose.setup.yml` – startet nur die Config-GUI
- `docker-compose.prod.yml` – startet n8n + Caddy (HTTPS)
- `Caddyfile` – Reverse-Proxy & Let's Encrypt
- `.env.example` – Beispiel-Env
- `config-ui/` – Source der Konfigurations-GUI
