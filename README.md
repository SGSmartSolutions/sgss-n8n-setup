# sgss-n8n-setup – n8n Hetzner Docker Installer

> ⚠️ **Hinweis / Disclaimer**
>
> Dieses Setup-Skript wurde mehrfach getestet und funktioniert in typischen Umgebungen (z. B. frisches Ubuntu auf einem Hetzner-Server mit Docker).
> Trotzdem erfolgt die Nutzung **auf eigene Gefahr**:
> - Es werden Änderungen am Server (Docker, Firewall, Reverse-Proxy) vorgenommen.
> - Du bist selbst dafür verantwortlich, Backups zu erstellen und die Konfiguration an deine Umgebung anzupassen.
>
> Der Autor übernimmt keine Haftung für Datenverluste, Ausfälle oder Schäden, die durch die Nutzung dieses Repositories entstehen.

Dieses Repository richtet auf einem Hetzner-Server per Docker ein produktives n8n mit HTTPS ein.

Es enthält:

- eine Web-GUI zur Konfiguration (Domain, Let's-Encrypt-E-Mail, Passwörter)
- automatische Erstellung einer `.env` für n8n + Caddy
- einen Reverse-Proxy (Caddy) mit automatischen TLS-Zertifikaten
- ein Script zur Grund-Firewall-Konfiguration (`scripts/setup-firewall.sh`)

---

## Voraussetzungen

- Hetzner-Server (z. B. Ubuntu 22.04, frisch installiert)
- Domain, die per DNS auf die Server-IP zeigt (A-Record, siehe unten)
- Lokaler Rechner (Mac / Linux / Windows mit SSH-Client)
- Grundkenntnisse im Umgang mit SSH und Terminal

**Wichtiger Grundsatz:**  
- Basis-Setup (System-Updates + Docker-Installation + User-Anlage) erfolgt **als `root`**.  
- Alle weiteren Schritte (Repo klonen, n8n installieren, GUI nutzen) erfolgen mit einem **normalen User mit `sudo`- und `docker`-Rechten** (z. B. `admin`).

---

## 0. SSH-Key auf deinem lokalen Rechner erstellen

Auf deinem lokalen Rechner (Mac / Linux):

```bash
ssh-keygen -t ed25519 -C "deine-mail@example.com"
```

- Fragen einfach mit Enter bestätigen, falls du keinen speziellen Pfad willst  
- Standardpfad:  
  - privater Key: `~/.ssh/id_ed25519`  
  - öffentlicher Key: `~/.ssh/id_ed25519.pub`

Public Key anzeigen:

```bash
cat ~/.ssh/id_ed25519.pub
```

Diesen **öffentlichen** Schlüssel brauchst du gleich, um ihn auf dem Server zu hinterlegen.

---

## 1. Server-Grundsetup als root

### 1.1 Als root einloggen

Initial (oder über Hetzner-Konsole):

```bash
ssh root@SERVER_IP
```

`SERVER_IP` = öffentliche IP deines Hetzner-Servers.

### 1.2 System aktualisieren

```bash
apt update
apt upgrade -y
```

### 1.3 Docker & Docker Compose Plugin installieren (als root)

```bash
apt install -y ca-certificates curl gnupg git ufw

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg   | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"   > /etc/apt/sources.list.d/docker.list

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

---

## 2. Neuen User anlegen und Rechte vergeben (als root)

In den folgenden Beispielen heißt der User `admin`. Du kannst auch einen anderen Namen wählen.

### 2.1 User anlegen

```bash
adduser admin
```

Passwort vergeben und die Fragen beantworten (oder mit Enter überspringen).

### 2.2 User zu `sudo`-Gruppe hinzufügen

```bash
usermod -aG sudo admin
```

### 2.3 User zu `docker`-Gruppe hinzufügen

```bash
usermod -aG docker admin
```

Dadurch kann der User später Docker-Befehle ohne `sudo` ausführen.

### 2.4 SSH-Key für den neuen User hinterlegen

**Variante A – du hast bereits einen SSH-Key lokal (empfohlen):**

1. Als root auf dem Server:

   ```bash
   su - admin
   mkdir -p ~/.ssh
   chmod 700 ~/.ssh
   nano ~/.ssh/authorized_keys
   ```

2. In `authorized_keys` den **öffentlichen Key** von deinem lokalen Rechner einfügen  
   (Inhalt von `~/.ssh/id_ed25519.pub`), speichern:

   - `Strg + O`, Enter  
   - `Strg + X`

3. Rechte setzen:

   ```bash
   chmod 600 ~/.ssh/authorized_keys
   ```

**Variante B – vorhandene Keys von root übernehmen**  
(wenn du dich bereits mit Key bei `root` einloggst):

```bash
mkdir -p /home/admin/.ssh
cp /root/.ssh/authorized_keys /home/admin/.ssh/
chown -R admin:admin /home/admin/.ssh
chmod 700 /home/admin/.ssh
chmod 600 /home/admin/.ssh/authorized_keys
```

---

## 3. Mit dem neuen User einloggen (ab jetzt kein root mehr)

Auf deinem lokalen Rechner:

```bash
ssh admin@SERVER_IP
```

Ab jetzt werden **alle weiteren Schritte** mit diesem User ausgeführt (nicht mehr als root).

---

## 4. DNS-Eintrag (Domain → Server-IP)

In deiner späteren `.env` wird z. B. stehen:

```env
DOMAIN=n8n.example.com
```

Dann musst du bei deinem Domain-Provider in der DNS-Verwaltung folgendes setzen:

- **Typ:** A  
- **Name / Host:**  
  - z. B. `n8n` (wenn deine Hauptdomain `example.com` ist → ergibt `n8n.example.com`),  
  - oder direkt `n8n.example.com` als FQDN – je nach Provider
- **Wert / Ziel:** öffentliche IP deines Hetzner-Servers, z. B. `203.0.113.10` (Beispiel-IP)
- **TTL:** Standardwert ist ok (z. B. 300–3600 Sekunden)

Prüfen, ob der Eintrag aktiv ist (lokal):

```bash
ping n8n.example.com
```

Wichtig: Die IP im Ping sollte die Hetzner-IP deines Servers sein.

---

## 5. Repository klonen (mit dem neuen User)

Auf dem Server (als `admin` o. Ä.):

```bash
cd ~
git clone https://github.com/SGSmartSolutions/sgss-n8n-setup.git
cd sgss-n8n-setup
```

> `YOUR-GITHUB-USER` durch deinen GitHub-Nutzernamen ersetzen.

---

## 6. Firewall setzen (empfohlen, mit sudo)

Damit dein Server geschützt ist und n8n + Caddy erreichbar sind, sollte mindestens freigegeben sein:

- `22/tcp` – SSH  
- `80/tcp` – HTTP (für Let's Encrypt / Caddy)  
- `443/tcp` – HTTPS (für n8n hinter Caddy)

Dieses Repo bringt dafür ein Script mit:

```bash
cd ~/sgss-n8n-setup
sudo bash scripts/setup-firewall.sh
```

Das Script:

- installiert `ufw` (falls nötig)
- setzt Standardregeln (eingehend deny, ausgehend allow)
- erlaubt `OpenSSH`, `80/tcp`, `443/tcp`
- aktiviert `ufw`

> Hinweis: Firewall-Regeln können nicht automatisch nur durch Klonen des Repos gesetzt werden – das Script muss bewusst einmal ausgeführt werden.

---

## 7. Config-GUI sicher starten (nur lokal auf dem Server erreichbar)

In `docker-compose.setup.yml` ist das Port-Mapping so gesetzt, dass die GUI nur auf `localhost` des Servers lauscht:

```yaml
ports:
  - "127.0.0.1:3000:3000"
```

Dadurch ist die GUI **nicht direkt aus dem Internet erreichbar**.

Auf dem Server (als `admin`):

```bash
cd ~/sgss-n8n-setup
docker compose -f docker-compose.setup.yml up -d
```

---

## 8. SSH-Tunnel vom lokalen Rechner zur Config-GUI

Auf deinem **lokalen Rechner**:

```bash
ssh -L 8080:127.0.0.1:3000 admin@SERVER_IP
```

- `admin` = dein Server-User  
- `SERVER_IP` = IP oder Hostname deines Servers

Solange diese SSH-Session offen ist, erreichst du die GUI unter:

- `http://localhost:8080`

Der gesamte Traffic zur GUI läuft verschlüsselt über SSH.

---

## 9. In der GUI konfigurieren

Im Browser auf deinem lokalen Rechner:

- `http://localhost:8080`

In der Web-GUI:

- Domain eintragen (z. B. `n8n.example.com`)
- Let's-Encrypt-E-Mail eintragen (z. B. `you@example.com`)
- Admin-Nutzername für Basic Auth
- Passwort per Button generieren (z. B. 16 zufällige Zeichen)
- Encryption Key generieren (mind. 32 Zeichen)
- Auf **„Speichern & Installationsbefehl anzeigen“** klicken

Dadurch wird im Projektordner auf dem Server eine `.env` erzeugt, z. B.:

```env
DOMAIN=n8n.example.com
LETSENCRYPT_EMAIL=you@example.com
BASIC_AUTH_USER=admin
BASIC_AUTH_PASSWORD=DEIN_SICHERES_PASSWORT
N8N_ENCRYPTION_KEY=DEIN_LANGER_ENCRYPTION_KEY
```

---

## 10. n8n + HTTPS starten

Zurück auf dem Server (als `admin`, im Projektordner):

```bash
cd ~/sgss-n8n-setup
docker compose -f docker-compose.prod.yml up -d
```

Docker Compose lädt automatisch die `.env` aus dem Projektordner und setzt:

- `DOMAIN`
- `LETSENCRYPT_EMAIL`
- `BASIC_AUTH_USER`
- `BASIC_AUTH_PASSWORD`
- `N8N_ENCRYPTION_KEY`

n8n ist danach erreichbar unter:

- `https://DEINE-DOMAIN` (z. B. `https://n8n.example.com`)

Login (Basic Auth):

- Benutzer: wie in der GUI angegeben (`BASIC_AUTH_USER`)
- Passwort: wie in der GUI angezeigt (`BASIC_AUTH_PASSWORD`)

Danach folgt das n8n-eigene Setup (Owner-User erstellen).

---

## 11. Config-GUI wieder stoppen (empfohlen)

Wenn du die GUI не mehr brauchst, kannst du sie stoppen:

```bash
cd ~/sgss-n8n-setup
docker compose -f docker-compose.setup.yml down
```

Dein produktives Setup (`docker-compose.prod.yml`) bleibt davon unberührt.

---

## Struktur des Repos

- `config-ui/`  
  Node/Express-App für die Konfigurations-GUI, erzeugt die `.env`.

- `scripts/setup-firewall.sh`  
  Optionales Script zur automatischen Einrichtung grundlegender Firewall-Regeln (UFW).

- `docker-compose.setup.yml`  
  Startet nur die Config-GUI (Port `127.0.0.1:3000`, Zugriff per SSH-Tunnel).

- `docker-compose.prod.yml`  
  Startet n8n + Caddy (HTTPS, automatisches TLS via Let's Encrypt).

- `Caddyfile`  
  Caddy-Konfiguration (Reverse Proxy auf n8n, Domain und E-Mail aus `.env`).

- `.env.example`  
  Beispiel-Env – wird nicht verwendet, die echte `.env` kommt aus der GUI.

- `.env`  
  Wird von der Config-GUI erzeugt. Nicht committen (steht in `.gitignore`).

- `.gitignore`  
  Ignoriert u. a. `node_modules/` und `.env`.
