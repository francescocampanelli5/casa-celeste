// Helper condivisi dagli script di automazione Affittacamere (GitHub Actions).
// Non gira nel browser: usa Firebase Admin SDK (bypassa le security rules,
// autenticato con il service account) — stesso pattern di
// studentato/scripts/send-reminders.js.
'use strict';

var admin = require('firebase-admin');

function initAdmin() {
  if (admin.apps.length) return admin;
  var serviceAccount = JSON.parse((process.env.FIREBASE_SERVICE_ACCOUNT || '{}').trim());
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return admin;
}

// Ora locale Europe/Rome calcolata dal sistema (a prova di cambio ora
// legale/solare, vedi nota "Robustezza" del piano — non fissare l'orario
// nel cron YAML, calcolarlo qui): restituisce { hour, dateISO }.
function romeNow() {
  var fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false
  });
  var parts = {};
  fmt.formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
  return { hour: Number(parts.hour), dateISO: parts.year + '-' + parts.month + '-' + parts.day };
}
// Converte un orario "muro" Europe/Rome (es. 14:00 del 2026-08-01) nell'
// istante UTC corrispondente — serve per programmare la videochiamata "1h
// prima del check-in" con l'ora giusta indipendentemente da ora
// solare/legale (offset calcolato dal mezzogiorno UTC dello stesso giorno,
// sempre lontano dagli orari di cambio ora che avvengono di notte).
function romeOffsetMinutes(dateISO) {
  var ref = new Date(dateISO + 'T12:00:00Z');
  var fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Rome', hour: '2-digit', hour12: false, timeZoneName: 'shortOffset' });
  var part = fmt.formatToParts(ref).find(function (p) { return p.type === 'timeZoneName'; });
  var m = part && /GMT([+-]\d+)/.exec(part.value);
  return m ? Number(m[1]) * 60 : 60;
}
function romeWallTimeToUtcIso(dateISO, hhmm) {
  var offsetMin = romeOffsetMinutes(dateISO);
  var parts = String(hhmm || '00:00').split(':');
  var d = new Date(dateISO + 'T00:00:00Z');
  d.setUTCHours(Number(parts[0]) || 0, Number(parts[1]) || 0, 0, 0);
  d.setUTCMinutes(d.getUTCMinutes() - offsetMin);
  return d.toISOString();
}
function addDaysIso(iso, days) {
  var d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// "Stanza Blu, Stanza Gialla e Stanza Verde" / "... and ..." — usato dalle
// email di prenotazioni di gruppo (più stanze insieme, stesso groupId) per
// elencare tutte le stanze in una frase, condiviso da guest-lifecycle-emails.js
// e guest-docs-reminder.js.
function joinRoomNames(bookings, isEn) {
  var names = bookings.map(function (b) { return b.roomLabel || 'Casa Celeste'; });
  if (names.length <= 1) return names[0] || '';
  var last = names[names.length - 1];
  var head = names.slice(0, -1).join(', ');
  return head + (isEn ? ' and ' : ' e ') + last;
}

// Tutte le prenotazioni che condividono lo stesso groupId (vedi
// createGroupBookingCore in functions/booking-logic.js).
function fetchGroupSiblings(db, groupId) {
  return db.collection('tourism_bookings').where('groupId', '==', groupId).get().then(function (snap) { return snap.docs; });
}

// Data ISO (2026-07-15) -> testo leggibile in lettere ("15 luglio 2026" /
// "15 July 2026"), mai numeri con / o - separatori: evita l'ambiguità
// USA MM/DD vs europeo DD/MM per l'ospite e, di riflesso, il fatto che un
// editor di test (es. EmailJS "Test It") interpreti erroneamente una data
// numerica come un'espressione aritmetica.
function formatDateHuman(iso, isEn) {
  if (!iso) return '';
  var d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d.getTime())) return iso;
  var locale = isEn ? 'en-GB' : 'it-IT';
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

// I campi link liberi in dashboard (portone lato strada, recensione) non
// obbligano l'host a scrivere "https://" — senza normalizzazione un valore
// tipo "www.google.com/maps/..." finirebbe come link RELATIVO nell'email
// (es. lacasaceleste.it/affittacamere/www.google.com/maps/...), un bottone
// rotto invece che aprire la pagina esterna.
function normalizeExternalUrl(url) {
  var u = String(url || '').trim();
  if (!u) return '';
  if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
  return 'https://' + u;
}

function telegramSend(chatId, text) {
  var token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return Promise.resolve({ skipped: true });
  return fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text })
  }).then(function (res) {
    if (!res.ok) return res.text().then(function (t) { throw new Error('Telegram ' + res.status + ': ' + t); });
    return res.json();
  });
}
function telegramConfigured() {
  return !!process.env.TELEGRAM_BOT_TOKEN;
}
function telegramBroadcast(recipients, text) {
  var enabled = (recipients || []).filter(function (r) { return r.enabled && r.chatId; });
  return Promise.all(enabled.map(function (r) {
    return telegramSend(r.chatId, text).catch(function (err) {
      console.error('Errore invio Telegram a ' + r.label + ':', err.message);
    });
  }));
}

// ==========================================================================
// Guardia quota email — invio diretto via Gmail (vedi sendGuestEmail più
// sotto), non più tramite EmailJS: il limite reale di Gmail è alto (~500
// destinatari/giorno su un account personale, molto più del necessario per
// una struttura di poche stanze). Il budget qui è solo una rete di
// sicurezza contro un eventuale bug che manda email in loop, non un vincolo
// di piano gratuito da rispettare — regolabile in Impostazioni.
// Priorità di invio quando la quota si avvicina al limite (skippiamo prima
// le meno critiche): 1) promemoria documenti / istruzioni check-in
// (operativamente importanti) 2) conferma prenotazione 3) ringraziamento
// check-out (la più sacrificabile) 4) extra (consigli/recensione).
var DEFAULT_MONTHLY_BUDGET = 500;

function emailQuotaRef(db) { return db.collection('tourism_settings').doc('emailQuota'); }

async function checkEmailQuota(db, settings, priority) {
  var effectiveBudget = Number(settings.emailQuotaMonthlyBudget) || DEFAULT_MONTHLY_BUDGET;
  var month = romeNow().dateISO.slice(0, 7);
  var snap = await emailQuotaRef(db).get();
  var data = snap.exists ? snap.data() : {};
  var sent = data.month === month ? (data.sent || 0) : 0;
  // Margine crescente per le email meno prioritarie: la 4 (extra: consigli
  // a metà soggiorno, richiesta recensione) si ferma per prima, poi la 3
  // (ringraziamento), la 1 (operativa) usa il budget quasi per intero.
  var cutoff = priority === 4 ? effectiveBudget * 0.5 : (priority === 3 ? effectiveBudget * 0.7 : (priority === 2 ? effectiveBudget * 0.9 : effectiveBudget));
  return { allowed: sent < cutoff, sent: sent, effectiveBudget: effectiveBudget, month: month };
}
async function recordEmailSent(db, month) {
  await emailQuotaRef(db).set({
    month: month,
    sent: admin.firestore.FieldValue.increment(1)
  }, { merge: true });
}

// Rimuove il commento di documentazione <!-- ... --> in testa al file HTML
// (note per chi mantiene il template — Subject, variabili usate, ecc. — mai
// da mandare all'ospite).
function stripDocComment(html) {
  return html.replace(/^\s*<!--[\s\S]*?-->\s*/, '');
}
var TEMPLATES_DIR = require('path').join(__dirname, '..', 'email-templates');
function renderTemplate(fileName, vars) {
  var fs = require('fs');
  var Mustache = require('mustache');
  var raw = fs.readFileSync(require('path').join(TEMPLATES_DIR, fileName), 'utf8');
  return Mustache.render(stripDocComment(raw), vars);
}

// Invio diretto via Gmail (Nodemailer + Password per le app, gratuito entro
// i limiti di invio giornalieri di un account Gmail — ampiamente
// sufficienti per questo volume). templateFile è il nome del file in
// affittacamere/email-templates/, renderizzato qui con Mustache (stessa
// sintassi già usata nei file: {{var}}, {{#section}}, {{^section}},
// {{#loop}}) — nessun limite di numero di template come sui piani gratuiti
// di servizi terzi, l'HTML lo gestiamo interamente noi.
// `priority`: 1 = operativa (documenti/check-in), 2 = conferma,
// 3 = ringraziamento, 4 = extra (consigli a metà soggiorno, richiesta recensione).
var mailTransport = null;
function getMailTransport() {
  if (mailTransport) return mailTransport;
  var user = process.env.GMAIL_USER;
  var pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  var nodemailer = require('nodemailer');
  mailTransport = nodemailer.createTransport({ service: 'gmail', auth: { user: user, pass: pass } });
  return mailTransport;
}
async function sendGuestEmail(db, settings, templateFile, templateParams, priority, label) {
  var transport = getMailTransport();
  if (!transport) {
    console.log('Email "' + label + '" non configurata (mancano i secrets GMAIL_USER/GMAIL_APP_PASSWORD): salto.');
    return { sent: false, reason: 'not_configured' };
  }
  var quota = await checkEmailQuota(db, settings, priority);
  if (!quota.allowed) {
    console.log('Quota email vicina al limite (' + quota.sent + '/' + quota.effectiveBudget + '), salto invio "' + label + '".');
    var authorized = (settings.bookingCommandAuthorized || []);
    await telegramBroadcast(authorized, '⚠️ Quota email quasi esaurita (' + quota.sent + '/' + quota.effectiveBudget + ' questo mese): email "' + label + '" NON inviata. Valuta un contatto manuale.');
    return { sent: false, reason: 'quota_exceeded' };
  }
  var html = renderTemplate(templateFile, templateParams);
  await transport.sendMail({
    from: 'Casa Celeste <' + process.env.GMAIL_USER + '>',
    to: templateParams.email,
    subject: templateParams.subjectLine,
    html: html
  });
  await recordEmailSent(db, quota.month);
  return { sent: true };
}

// ==========================================================================
// Google Meet automatico via Google Calendar API — richiede una singola
// autorizzazione manuale (scripts/google-meet-authorize.js, eseguito una
// tantum dal proprio computer, vedi GUIDA-PUBBLICAZIONE.md Parte 8.6). Se i
// secrets non sono ancora configurati, torna null: il resto del sistema
// funziona comunque, semplicemente l'email di check-in non include il link
// e nota "ti contatteremo per organizzare la videochiamata".
function googleMeetConfigured() {
  return !!process.env.GOOGLE_CALENDAR_CLIENT_ID && !!process.env.GOOGLE_CALENDAR_CLIENT_SECRET && !!process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;
}
async function createGoogleMeetLink(summary, description, startISO) {
  if (!googleMeetConfigured()) return null;
  var { google } = require('googleapis');
  var oAuth2Client = new google.auth.OAuth2(process.env.GOOGLE_CALENDAR_CLIENT_ID, process.env.GOOGLE_CALENDAR_CLIENT_SECRET);
  oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN });
  var calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
  var start = new Date(startISO || Date.now());
  var end = new Date(start.getTime() + 20 * 60000); // slot indicativo di 20 minuti
  try {
    var res = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: {
        summary: summary,
        description: description,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        conferenceData: { createRequest: { requestId: 'ccm-' + Date.now() + '-' + Math.random().toString(36).slice(2) } }
      }
    });
    return (res.data.conferenceData && res.data.conferenceData.entryPoints || [])
      .map(function (e) { return e.uri; })
      .find(function (uri) { return uri && uri.indexOf('meet.google.com') !== -1; }) || null;
  } catch (err) {
    console.error('Errore creazione link Google Meet:', err.message);
    return null;
  }
}

module.exports = {
  initAdmin: initAdmin, romeNow: romeNow, addDaysIso: addDaysIso, romeWallTimeToUtcIso: romeWallTimeToUtcIso,
  formatDateHuman: formatDateHuman, joinRoomNames: joinRoomNames, fetchGroupSiblings: fetchGroupSiblings,
  telegramSend: telegramSend, telegramConfigured: telegramConfigured, telegramBroadcast: telegramBroadcast,
  checkEmailQuota: checkEmailQuota, recordEmailSent: recordEmailSent, sendGuestEmail: sendGuestEmail,
  googleMeetConfigured: googleMeetConfigured, createGoogleMeetLink: createGoogleMeetLink,
  normalizeExternalUrl: normalizeExternalUrl
};
