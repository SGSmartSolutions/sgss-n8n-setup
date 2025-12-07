#!/usr/bin/env bash
# Basic firewall setup for n8n Hetzner Docker Installer
# - Installs UFW if needed
# - Allows SSH, HTTP, HTTPS
# - Enables UFW

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Dieses Script muss als root / mit sudo ausgeführt werden."
  echo "Beispiel: sudo bash scripts/setup-firewall.sh"
  exit 1
fi

echo "==> UFW installieren (falls noch nicht vorhanden)..."
if ! command -v ufw >/dev/null 2>&1; then
  apt update
  DEBIAN_FRONTEND=noninteractive apt install -y ufw
fi

echo "==> Standard-Regeln setzen..."
# Eingehend standardmäßig verbieten, ausgehend erlauben
ufw default deny incoming
ufw default allow outgoing

echo "==> SSH (OpenSSH) erlauben..."
ufw allow OpenSSH

echo "==> HTTP (Port 80) erlauben..."
ufw allow 80/tcp

echo "==> HTTPS (Port 443) erlauben..."
ufw allow 443/tcp

echo "==> Firewall aktivieren..."
ufw --force enable

echo "==> Aktueller Status:"
ufw status verbose

echo "==> Fertig. SSH, HTTP und HTTPS sind nun erlaubt."
