# n8n Hetzner Docker Installer

Dieses Repository ermöglicht es, auf einem Hetzner-Server per Docker:

- eine Web-GUI zur Konfiguration (Domain, Let's-Encrypt-E-Mail, Passwörter) zu starten
- automatisch eine `.env` für n8n + Caddy zu erzeugen
- n8n anschließend mit HTTPS zu starten

---

## Voraussetzungen

- Hetzner-Server (z. B. Ubuntu)
- Domain, die per DNS auf die Server-IP zeigt (A-Record, siehe unten)
- SSH-Zugang zum Server (idealerweise per SSH-Key, kein Passwort-Login)
- Docker + Docker Compose Plugin installiert
- Eine grundlegende Firewall-Konfiguration (siehe unten, kann per Script automatisiert werden)

### 1. SSH-Key (lokaler Rechner)

Auf deinem lokalen Rechner (Mac / Linux):

```bash
ssh-keygen -t ed25519 -C "deine-mail@example.com"
```

- Fragen einfach mit Enter bestätigen, falls du keinen speziellen Pfad willst  
- Standard-Pfad: `~/.ssh/id_ed25519` (privater Key), `~/.ssh/id_ed25519.pub` (öffentlicher Key)

Public Key anzeigen:

```bash
cat ~/.ssh/id_ed25519.pub
```

Den kompletten Inhalt kopieren und:

- Entweder in der Hetzner Cloud beim Server unter „SSH Keys“ hinterlegen  
- Oder direkt in `/home/DEINUSER/.ssh/authorized_keys` auf dem Server eintragen

Login zum Server:

```bash
ssh admin@DEINE_SERVER_IP
```

---

### 2. DNS-Eintrag (Domain → Server-IP)

Angenommen, deine `.env` enthält z. B.:

```env
DOMAIN=MUSTERDOMAIN.de
```

Dann musst du bei deinem Domain-Provider in der DNS-Verwaltung folgendes setzen:

- **Typ:** A  
- **Name / Host:**  
  - je nach Provider entweder `MUSTERDOMAIN` (Subdomain-Feld)  
  - oder `MUSTERDOMAIN.de` als FQDN  
- **Wert / Ziel:** öffentliche IP deines Hetzner-Servers (z. B. `49.12.xx.yy`)  
- **TTL:** Standardwert ist ok (z. B. 300–3600 Sekunden)

Prüfen, ob der Eintrag aktiv ist (lokal):

```bash
ping MUSTERDOMAIN.de
```

Wichtig: Die IP im Ping sollte die Hetzner-IP deines Servers sein.

---

### 3. Docker & Docker Compose (Beispiel Ubuntu)

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo   "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu   $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Optional: Docker ohne `sudo` nutzen:

```bash
sudo usermod -aG docker admin
# danach neu einloggen:
# exit
# ssh admin@DEINE_SERVER_IP
```

---

### 4. Firewall-Konfiguration (empfohlen & automatisierbar)

Um deinen Server abzusichern, sollten mindestens folgende Ports offen sein:

- `22/tcp` – SSH
- `80/tcp` – HTTP (für Let's Encrypt / Caddy)
- `443/tcp` – HTTPS (für n8n hinter Caddy)

#### Variante A: Manuell mit UFW (Uncomplicated Firewall)

Auf dem Server:

```bash
sudo apt install -y ufw

sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

sudo ufw enable
sudo ufw status verbose
```

#### Variante B: Automatisch per Script aus diesem Repo

Lege in deinem Repo eine Datei `scripts/setup-firewall.sh` an (falls nicht vorhanden) mit z. B. folgendem Inhalt:

```bash
#!/usr/bin/env bash
set -e

if ! command -v ufw >/dev/null 2>&1; then
  apt update
  apt install -y ufw
fi

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp

ufw --force enable
ufw status verbose
```

Dann auf dem Server:

```bash
cd n8n-hetzner-installer
sudo bash scripts/setup-firewall.sh
```

So hast du beim Setup einen klaren, automatisierten Schritt für die Firewall.  
**Wichtig:** Firewall-Regeln können nicht „magisch“ beim Klonen des Repos aktiviert werden – sie müssen bewusst einmal ausgeführt werden (z. B. per Script wie oben).

---

## Nutzung

### 1. Repository klonen

Auf dem Server:

```bash
git clone https://github.com/DEIN-USER/n8n-hetzner-installer.git
cd n8n-hetzner-installer
```

*(Passe den Repo-Link an deinen GitHub-User an.)*

---

### 2. Config-GUI sicher starten (nur lokal auf dem Server)

In `docker-compose.setup.yml` ist das Port-Mapping so gesetzt, dass die GUI nur auf `localhost` des Servers lauscht:

```yaml
ports:
  - "127.0.0.1:3000:3000"
```

Damit ist die GUI **nicht direkt aus dem Internet erreichbar**.

Auf dem Server:

```bash
cd n8n-hetzner-installer
docker compose -f docker-compose.setup.yml up -d
```

---

### 3. SSH-Tunnel vom lokalen Rechner zur Config-GUI

Auf deinem **lokalen Rechner**:

```bash
ssh -L 8080:127.0.0.1:3000 admin@DEINE_SERVER_IP
```

- `admin` = dein Server-User  
- `DEINE_SERVER_IP` = IP oder Hostname deines Servers

Solange diese SSH-Session offen ist, erreichst du die GUI unter:

- `http://localhost:8080`

Der gesamte Traffic zur GUI läuft verschlüsselt über SSH.

---

### 4. In der GUI konfigurieren

Im Browser auf deinem lokalen Rechner:

- `http://localhost:8080`

In der Web-GUI:

- Domain eintragen (z. B. `n8n.DEINEDOMAIN.de` oder `n8n1-nuroy.de`)
- Let's-Encrypt-E-Mail eintragen
- Admin-Nutzername für Basic Auth
- Passwort per Button generieren (z. B. 16 zufällige Zeichen)
- Encryption Key generieren (mind. 32 Zeichen)
- Auf **"Speichern & Installationsbefehl anzeigen"** klicken

Dadurch wird im Projektordner auf dem Server eine `.env` erzeugt, z. B.:

```env
DOMAIN=n8n1-nuroy.de
LETSENCRYPT_EMAIL=kontakt@nuroy.de
BASIC_AUTH_USER=admin
BASIC_AUTH_PASSWORD=DEIN_SICHERES_PASSWORT
N8N_ENCRYPTION_KEY=DEIN_LANGER_ENCRYPTION_KEY
```

---

### 5. n8n + HTTPS starten

Zurück auf dem Server (im Projektordner):

```bash
cd n8n-hetzner-installer
docker compose -f docker-compose.prod.yml up -d
```

Docker Compose lädt automatisch die `.env` aus dem Projektordner und setzt:

- `DOMAIN`
- `LETSENCRYPT_EMAIL`
- `BASIC_AUTH_USER`
- `BASIC_AUTH_PASSWORD`
- `N8N_ENCRYPTION_KEY`

n8n ist danach erreichbar unter:

- `https://DEINE-DOMAIN` (z. B. `https://n8n1-nuroy.de`)

Login (Basic Auth):

- Benutzer: wie in der GUI angegeben (`BASIC_AUTH_USER`)
- Passwort: wie in der GUI angezeigt (`BASIC_AUTH_PASSWORD`)

---

### 6. Config-GUI wieder stoppen (empfohlen)

Wenn du die GUI nicht mehr brauchst, kannst du sie stoppen:

```bash
cd n8n-hetzner-installer
docker compose -f docker-compose.setup.yml down
```

Dein produktives Setup (`docker-compose.prod.yml`) bleibt davon unberührt.

---

## Dateien

- `docker-compose.setup.yml` – startet nur die Config-GUI (nur lokal erreichbar via SSH-Tunnel)
- `docker-compose.prod.yml` – startet n8n + Caddy (HTTPS)
- `Caddyfile` – Reverse-Proxy & Let's Encrypt
- `.env.example` – Beispiel-Env
- `.env` – wird von der Config-GUI erzeugt (nicht committen, steht in `.gitignore`)
- `config-ui/` – Source der Konfigurations-GUI
- `scripts/setup-firewall.sh` – optionales Script zur automatischen Einrichtung der grundlegenden Firewall-Regeln
