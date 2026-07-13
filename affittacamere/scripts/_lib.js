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
// Guardia quota EmailJS — il piano gratuito è 200 email/mese PER ACCOUNT,
// condiviso con lo studentato (che usa lo stesso account EmailJS). Non
// possiamo sapere in tempo reale quante ne ha già usate lo studentato, quindi
// l'owner riserva una stima in Impostazioni (emailQuotaReservedForStudentato,
// default 40) e noi restiamo sotto (emailQuotaMonthlyBudget, default 150) -
// margine di sicurezza voluto, non il limite reale di 200.
// Priorità di invio quando la quota si avvicina al limite (skippiamo prima
// le meno critiche): 1) promemoria documenti / istruzioni check-in
// (operativamente importanti) 2) conferma prenotazione 3) ringraziamento
// check-out (la più sacrificabile).
var DEFAULT_MONTHLY_BUDGET = 150;
var DEFAULT_RESERVED_FOR_STUDENTATO = 40;

function emailQuotaRef(db) { return db.collection('tourism_settings').doc('emailQuota'); }

async function checkEmailQuota(db, settings, priority) {
  var budget = Number(settings.emailQuotaMonthlyBudget) || DEFAULT_MONTHLY_BUDGET;
  var reserved = settings.emailQuotaReservedForStudentato != null ? Number(settings.emailQuotaReservedForStudentato) : DEFAULT_RESERVED_FOR_STUDENTATO;
  var effectiveBudget = Math.max(0, budget - reserved);
  var month = romeNow().dateISO.slice(0, 7);
  var snap = await emailQuotaRef(db).get();
  var data = snap.exists ? snap.data() : {};
  var sent = data.month === month ? (data.sent || 0) : 0;
  // Margine crescente per le email meno prioritarie: la 3 (ringraziamento)
  // si ferma prima, la 1 (operativa) usa il budget quasi per intero.
  var cutoff = priority === 3 ? effectiveBudget * 0.7 : (priority === 2 ? effectiveBudget * 0.9 : effectiveBudget);
  return { allowed: sent < cutoff, sent: sent, effectiveBudget: effectiveBudget, month: month };
}
async function recordEmailSent(db, month) {
  await emailQuotaRef(db).set({
    month: month,
    sent: admin.firestore.FieldValue.increment(1)
  }, { merge: true });
}

// Invio EmailJS via API REST (Private Key) — stesso meccanismo di
// studentato/scripts/send-reminders.js, con guardia quota incorporata.
// `priority`: 1 = operativa (documenti/check-in), 2 = conferma, 3 = ringraziamento.
async function sendGuestEmail(db, settings, templateId, templateParams, priority, label) {
  var emailjsPrivateKey = process.env.EMAILJS_PRIVATE_KEY;
  if (!emailjsPrivateKey || !templateId) {
    console.log('Email "' + label + '" non configurata (manca EMAILJS_PRIVATE_KEY o template id): salto.');
    return { sent: false, reason: 'not_configured' };
  }
  var quota = await checkEmailQuota(db, settings, priority);
  if (!quota.allowed) {
    console.log('Quota email vicina al limite (' + quota.sent + '/' + quota.effectiveBudget + '), salto invio "' + label + '".');
    var authorized = (settings.bookingCommandAuthorized || []);
    await telegramBroadcast(authorized, '⚠️ Quota EmailJS quasi esaurita (' + quota.sent + '/' + quota.effectiveBudget + ' questo mese): email "' + label + '" NON inviata. Valuta un contatto manuale.');
    return { sent: false, reason: 'quota_exceeded' };
  }
  var res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: 'service_pgej8ka', template_id: templateId,
      user_id: 'wuB-uArgD97brV8OX', accessToken: emailjsPrivateKey, template_params: templateParams
    })
  });
  if (!res.ok) throw new Error('EmailJS ' + res.status + ': ' + (await res.text()));
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
  telegramSend: telegramSend, telegramConfigured: telegramConfigured, telegramBroadcast: telegramBroadcast,
  checkEmailQuota: checkEmailQuota, recordEmailSent: recordEmailSent, sendGuestEmail: sendGuestEmail,
  googleMeetConfigured: googleMeetConfigured, createGoogleMeetLink: createGoogleMeetLink
};
