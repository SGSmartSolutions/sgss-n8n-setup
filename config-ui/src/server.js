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

app.post('/configure', (req, res) => {
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
  ].join('\\n') + '\\n';

  try {
    fs.writeFileSync(envPath, envContent, { encoding: 'utf8' });

    const installCommand = 'docker compose -f docker-compose.prod.yml --env-file .env up -d';

    res.send(`
      <html>
        <head>
          <meta charset="utf-8" />
          <title>n8n Konfiguration gespeichert</title>
          <style>
            body { font-family: sans-serif; max-width: 600px; margin: 30px auto; }
            code { background: #f4f4f4; padding: 4px 6px; border-radius: 4px; display: block; }
            pre { background: #f4f4f4; padding: 10px; border-radius: 4px; }
            .box { border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
            .pw-box { margin-top: 10px; padding: 10px; background: #fef3c7; border-radius: 6px; }
          </style>
        </head>
        <body>
          <h1>Konfiguration gespeichert ✅</h1>
          <div class="box">
            <p>Die <code>.env</code>-Datei wurde im Projektordner erstellt.</p>
            <div class="pw-box">
              <strong>Merke dir deine Zugangsdaten:</strong>
              <ul>
                <li>Domain: <code>${domain}</code></li>
                <li>Admin-User: <code>${basic_auth_user}</code></li>
                <li>Admin-Passwort: <code>${basic_auth_password}</code></li>
                <li>n8n Encryption Key: <code>${n8n_encryption_key}</code></li>
              </ul>
            </div>

            <h2>n8n & HTTPS starten</h2>
            <p>Führe jetzt auf deinem Server im Projektordner folgenden Befehl aus:</p>
            <pre><code>${installCommand}</code></pre>

            <p>Danach ist n8n erreichbar unter:</p>
            <p><a href="https://${domain}" target="_blank">https://${domain}</a></p>

            <p><a href="/">Zurück zum Formular</a></p>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send('Fehler beim Schreiben der .env-Datei: ' + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Config UI listening on port ${PORT}`);
});
