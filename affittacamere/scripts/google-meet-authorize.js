// Autorizzazione UNA TANTUM per generare link Google Meet automatici — vai
// eseguito UNA VOLTA SOLA dal tuo computer (non da GitHub Actions), con il
// browser a disposizione per fare login con lo stesso account Google/Gmail
// già usato per Casa Celeste (lacasacelestemonopoli@gmail.com).
//
// Prerequisiti (una tantum, gratuiti, vedi GUIDA-PUBBLICAZIONE.md Parte 8.6):
// 1. Crea un progetto su https://console.cloud.google.com (o riusa uno
//    esistente), abilita la "Google Calendar API".
// 2. Schermata di consenso OAuth → tipo "Esterno" → modalità "Testing" →
//    aggiungi la tua email come "utente di test" (evita la revisione Google,
//    sufficiente per un uso personale).
// 3. Crea credenziali → ID client OAuth → tipo applicazione "Desktop app" →
//    copia Client ID e Client Secret.
//
// Uso:
//   cd affittacamere/scripts
//   npm install
//   GOOGLE_CALENDAR_CLIENT_ID=... GOOGLE_CALENDAR_CLIENT_SECRET=... node google-meet-authorize.js
// Segui il link stampato, fai login, incolla qui il codice che Google ti dà:
// lo script stampa un REFRESH TOKEN da salvare come secret GitHub
// (GOOGLE_CALENDAR_REFRESH_TOKEN) insieme a CLIENT_ID e CLIENT_SECRET.
// Va fatto una volta sola: il refresh token non scade (finché non lo revochi).
'use strict';
var readline = require('readline');
var { google } = require('googleapis');

var CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID;
var CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
var REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'; // flusso "copia e incolla" per Desktop app

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.log('Servono GOOGLE_CALENDAR_CLIENT_ID e GOOGLE_CALENDAR_CLIENT_SECRET (vedi i commenti in cima al file).');
  process.exit(1);
}

var oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
var authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/calendar.events']
});

console.log('\n1) Apri questo link nel browser e fai login con lacasacelestemonopoli@gmail.com:\n');
console.log(authUrl);
console.log('\n2) Dopo aver approvato, Google ti mostra un codice: incollalo qui sotto.\n');

var rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Codice: ', function (code) {
  rl.close();
  oAuth2Client.getToken(code.trim(), function (err, tokens) {
    if (err) { console.error('Errore nello scambio del codice:', err.message); process.exit(1); }
    console.log('\nFatto! Salva questi 3 valori come secrets GitHub (Settings → Secrets and variables → Actions):\n');
    console.log('GOOGLE_CALENDAR_CLIENT_ID=' + CLIENT_ID);
    console.log('GOOGLE_CALENDAR_CLIENT_SECRET=' + CLIENT_SECRET);
    console.log('GOOGLE_CALENDAR_REFRESH_TOKEN=' + tokens.refresh_token);
    console.log('\nDa questo momento gli script generano da soli un link Google Meet per ogni prenotazione, senza altre azioni tue.');
  });
});
