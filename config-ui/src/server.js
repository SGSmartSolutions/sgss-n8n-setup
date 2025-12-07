const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Projektpfad, in den die .env geschrieben wird
const PROJECT_PATH = process.env.PROJECT_PATH || '/project';

app.use(bodyParser.urlencoded({ extended: true }));

// Statisches HTML ausliefern
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/generate-env', (req, res) => {
  const {
    domain,
    letsencrypt_email,
    basic_auth_user,
    basic_auth_password,
    n8n_encryption_key
  } = req.body;

  if (!domain || !letsencrypt_email || !basic_auth_user || !basic_auth_password || !n8n_encryption_key) {
    return res.status(400).send('Bitte fülle alle Felder aus.');
  }

  const envPath = path.join(PROJECT_PATH, '.env');

  const envContent = [
    `DOMAIN=${domain}`,
    `LETSENCRYPT_EMAIL=${letsencrypt_email}`,
    `BASIC_AUTH_USER=${basic_auth_user}`,
    `BASIC_AUTH_PASSWORD=${basic_auth_password}`,
    `N8N_ENCRYPTION_KEY=${n8n_encryption_key}`
  ].join('\\n') + '\n';

  try {
    fs.writeFileSync(envPath, envContent, { encoding: 'utf8' });

    const installCommand = 'docker compose -f docker-compose.prod.yml --env-file .env up -d';

    res.send(`<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <title>n8n Setup – Konfiguration gespeichert</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root {
      --bg: #05080b;
      --bg-elevated: #0c1117;
      --bg-elevated-soft: #111827;
      --accent: #00e08a;
      --accent-strong: #00b46c;
      --accent-soft: rgba(0, 224, 138, 0.12);
      --border-subtle: #1f2933;
      --text: #f9fafb;
      --muted: #9ca3af;
      --danger: #ff4b6a;
      --shadow-soft: 0 24px 60px rgba(0, 0, 0, 0.65);
    }

    * { box-sizing: border-box; }

    html, body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Inter", sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at top left, #004225 0, #05080b 45%, #05080b 100%);
      min-height: 100%;
    }

    body {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .page {
      min-height: 100vh;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
    }

    .card {
      width: 100%;
      max-width: 880px;
      background: linear-gradient(135deg, rgba(12, 17, 23, 0.98), rgba(7, 11, 16, 0.98));
      border-radius: 24px;
      padding: 26px 22px;
      box-shadow: var(--shadow-soft);
      border: 1px solid rgba(255, 255, 255, 0.04);
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
      gap: 22px;
    }

    @media (max-width: 840px) {
      .page {
        padding: 24px 12px;
      }
      .card {
        grid-template-columns: minmax(0, 1fr);
        padding: 22px 18px;
      }
    }

    .eyebrow {
      font-size: 12px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 6px;
    }

    h1 {
      margin: 0 0 10px 0;
      font-size: 24px;
      line-height: 1.15;
    }

    .sub {
      font-size: 14px;
      color: var(--muted);
      margin: 0 0 16px 0;
    }

    .success-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 4px 11px;
      border-radius: 999px;
      background: rgba(0, 224, 138, 0.12);
      border: 1px solid rgba(0, 224, 138, 0.4);
      font-size: 11px;
      color: var(--accent);
      margin-bottom: 14px;
    }

    .success-dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--accent);
      box-shadow: 0 0 14px rgba(0, 224, 138, 0.7);
    }

    .box {
      background: rgba(15, 23, 42, 0.92);
      border-radius: 16px;
      padding: 14px 14px 16px;
      border: 1px solid rgba(148, 163, 184, 0.35);
      margin-bottom: 12px;
    }

    .box-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 8px;
    }

    .box-title {
      font-size: 13px;
      font-weight: 500;
    }

    .box-sub {
      font-size: 11px;
      color: var(--muted);
    }

    pre {
      margin: 0;
      padding: 10px 11px;
      background: radial-gradient(circle at top left, rgba(0, 224, 138, 0.1), #020617 70%);
      border-radius: 10px;
      font-size: 12px;
      overflow-x: auto;
      border: 1px solid rgba(15, 118, 110, 0.6);
    }

    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }

    .btn {
      border-radius: 999px;
      border: 1px solid transparent;
      font-size: 12px;
      padding: 7px 12px;
      background: rgba(15, 23, 42, 0.95);
      color: var(--muted);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.14s ease;
      white-space: nowrap;
    }

    .btn:hover {
      border-color: rgba(148, 163, 184, 0.7);
      color: var(--text);
      background: #020617;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--accent), var(--accent-strong));
      color: #020617;
      font-weight: 500;
      padding-inline: 16px;
      box-shadow: 0 14px 30px rgba(0, 224, 138, 0.45);
    }

    .meta-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 8px;
      font-size: 12px;
    }

    .meta-label {
      color: var(--muted);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .meta-value {
      word-break: break-all;
    }

    .warning {
      margin-top: 10px;
      padding: 9px 11px;
      border-radius: 12px;
      border: 1px dashed rgba(248, 113, 113, 0.7);
      background: rgba(24, 24, 27, 0.9);
      font-size: 11px;
      color: var(--danger);
    }

    .footer {
      margin-top: 12px;
      font-size: 11px;
      color: var(--muted);
    }

    .footer span {
      color: var(--accent);
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="card">
      <section>
        <div class="success-pill">
          <div class="success-dot"></div>
          <div>Konfiguration gespeichert</div>
        </div>
        <div class="eyebrow">SG SmartSolutions · n8n Installer</div>
        <h1>Deine n8n-Umgebung ist bereit für die Installation.</h1>
        <p class="sub">
          Die <code>.env</code>-Datei wurde im Projektordner erzeugt.
          Führe jetzt den unten stehenden Docker-Compose-Befehl auf deinem
          Server aus, um n8n mit Caddy und HTTPS zu starten.
        </p>

        <div class="box">
          <div class="box-header">
            <div>
              <div class="box-title">Installationsbefehl</div>
              <div class="box-sub">Im Projektordner <code>sgss-n8n-setup</code> ausführen.</div>
            </div>
            <button class="btn btn-primary" onclick="copyCommand()">
              <span>📋</span> Kopieren
            </button>
          </div>
          <pre id="install-command"><code>docker compose -f docker-compose.prod.yml up -d</code></pre>
        </div>

        <div class="warning">
          Bitte führe den Befehl nur auf dem vorgesehenen Server aus
          und speichere das Admin-Passwort sowie den Encryption-Key sicher
          (z.&nbsp;B. in einem Passwort-Manager).
        </div>

        <div class="footer">
          Hinweis: Diese Seite kann nach der Ausführung des Befehls geschlossen werden.
          Die Setup-GUI kannst du anschließend wieder <span>herunterfahren</span>
          (<code>docker compose -f docker-compose.setup.yml down</code>).
        </div>
      </section>

      <section>
        <div class="box">
          <div class="box-header">
            <div>
              <div class="box-title">Zusammenfassung deiner Einstellungen</div>
              <div class="box-sub">Diese Werte wurden in der <code>.env</code> gespeichert.</div>
            </div>
          </div>
          <ul class="meta-list">
            <li>
              <div class="meta-label">Domain</div>
              <div class="meta-value">${domain}</div>
            </li>
            <li>
              <div class="meta-label">Let's-Encrypt-E-Mail</div>
              <div class="meta-value">${letsencrypt_email}</div>
            </li>
            <li>
              <div class="meta-label">Basic-Auth Benutzer</div>
              <div class="meta-value">${basic_auth_user}</div>
            </li>
            <li>
              <div class="meta-label">Basic-Auth Passwort</div>
              <div class="meta-value">${basic_auth_password}</div>
            </li>
            <li>
              <div class="meta-label">n8n Encryption Key</div>
              <div class="meta-value">${n8n_encryption_key}</div>
            </li>
          </ul>
        </div>
      </section>
    </div>
  </div>

  <script>
    function copyCommand() {
      const el = document.getElementById("install-command");
      if (!el) return;
      const text = el.innerText.trim();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          () => alert("Befehl in die Zwischenablage kopiert."),
          () => fallbackCopy(text)
        );
      } else {
        fallbackCopy(text);
      }
    }

    function fallbackCopy(text) {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        alert("Befehl in die Zwischenablage kopiert.");
      } catch (e) {
        alert("Kopieren nicht möglich. Bitte den Befehl manuell markieren und kopieren.");
      }
    }
  </script>
</body>
</html>`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Fehler beim Schreiben der .env-Datei: ' + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Config UI listening on port ${PORT}`);
});
