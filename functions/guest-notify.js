// Notifiche immediate all'ospite via Gmail — a differenza delle email del
// ciclo di vita (affittacamere/scripts/guest-lifecycle-emails.js, eseguite
// dal cron GitHub Actions orario), queste partono ISTANTANEAMENTE dal
// trigger Firestore onBookingStatusChange (vedi index.js) appena una
// prenotazione diventa 'confermato' o 'annullato' — l'ospite non deve
// aspettare fino a un'ora. Il cron orario resta comunque attivo come rete
// di sicurezza (stesso flag confirmationEmailSent, nessun doppio invio):
// se per qualunque motivo l'invio immediato fallisse, il giro successivo
// del cron lo recupera.
//
// Duplica alcuni helper già presenti in affittacamere/scripts/_lib.js: le
// Cloud Functions sono un pacchetto Node separato dagli script GitHub
// Actions, non c'è un modo semplice di condividere codice tra i due senza
// un monorepo (stesso ragionamento già seguito per calendar-ics.js).
'use strict';
const fs = require('fs');
const path = require('path');
const Mustache = require('mustache');
const nodemailer = require('nodemailer');

// I template vivono anche dentro functions/ (copia di affittacamere/email-templates/):
// il pacchetto delle Cloud Functions carica SOLO il contenuto di functions/,
// un percorso "../affittacamere/..." punterebbe a una cartella che nell'ambiente
// di runtime non esiste (causa dell'errore ENOENT visto in produzione).
const TEMPLATES_DIR = path.join(__dirname, 'email-templates');

function stripDocComment(html) {
  return html.replace(/^\s*<!--[\s\S]*?-->\s*/, '');
}
function renderTemplate(fileName, vars) {
  const raw = fs.readFileSync(path.join(TEMPLATES_DIR, fileName), 'utf8');
  return Mustache.render(stripDocComment(raw), vars);
}

// Motore di rendering condiviso del corpo email (blocchi essenziali +
// liberi, editor drag-and-drop in dashboard → Email ospiti →
// Impaginazione) — STESSO file (byte-identico) usato dalla dashboard per
// l'anteprima live, vedi affittacamere/js/email-block-renderer.js.
const EmailBlocks = require('./email-block-renderer.js');

// Testo delle email interamente editabile da dashboard (Impostazioni →
// Email ospiti, tourism_settings/site.emailTexts) — stesso meccanismo di
// affittacamere/scripts/_lib.js, duplicato qui per lo stesso motivo già
// documentato in cima al file (pacchetto Node separato). Un campo override
// vuoto/assente = usa il default da email-texts-defaults.json.
const EMAIL_TEXT_DEFAULTS = JSON.parse(fs.readFileSync(path.join(TEMPLATES_DIR, 'email-texts-defaults.json'), 'utf8'));
function pickText(overrides, section, key, isEn) {
  const lang = isEn ? 'en' : 'it';
  const o = overrides && overrides[section] && overrides[section][key];
  const override = o && o[lang] && String(o[lang]).trim();
  const def = EMAIL_TEXT_DEFAULTS[section] && EMAIL_TEXT_DEFAULTS[section][key];
  return override || (def && def[lang]) || '';
}
function emailTextVars(overrides, section, fields, isEn, vars) {
  const out = {};
  fields.forEach((f) => { out[section + '_' + f] = Mustache.render(pickText(overrides, section, f, isEn), vars); });
  return out;
}
const T1_FIELDS = ['eyebrow', 'h1', 'introSingular', 'introGroup', 'calendarLabel', 'legalTitle', 'legalBody', 'ctaSingular', 'ctaGroupIntro', 'ctaGroupSuffix', 'assistLead', 'spamNote'];
const T1_TABLE_FIELDS = ['checkIn', 'checkOut', 'nights', 'guests', 'touristTax'];
const T7_FIELDS = ['eyebrow', 'h1', 'bodySingular', 'bodyGroup', 'refundTitle', 'refundBody', 'assistLead', 'closing'];

function formatDateHuman(iso, isEn) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d.getTime())) return iso;
  const locale = isEn ? 'en-GB' : 'it-IT';
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
function joinRoomNames(bookings, isEn, siteName) {
  const names = bookings.map((b) => b.roomLabel || siteName);
  if (names.length <= 1) return names[0] || '';
  const last = names[names.length - 1];
  const head = names.slice(0, -1).join(', ');
  return head + (isEn ? ' and ' : ' e ') + last;
}

function siteOrigin() { return process.env.SITE_ORIGIN || 'https://lacasaceleste.it/affittacamere/'; }
function assistLink() { return siteOrigin() + '?assist=1'; }
function docsLinkFor(bookingId, token) { return siteOrigin() + 'ospiti.html?booking=' + bookingId + '&token=' + token; }

function romeOffsetMinutes(dateISO) {
  const ref = new Date(dateISO + 'T12:00:00Z');
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Rome', hour: '2-digit', hour12: false, timeZoneName: 'shortOffset' });
  const part = fmt.formatToParts(ref).find((p) => p.type === 'timeZoneName');
  const m = part && /GMT([+-]\d+)/.exec(part.value);
  return m ? Number(m[1]) * 60 : 60;
}
function romeWallTimeToUtcIso(dateISO, hhmm) {
  const offsetMin = romeOffsetMinutes(dateISO);
  const parts = String(hhmm || '00:00').split(':');
  const d = new Date(dateISO + 'T00:00:00Z');
  d.setUTCHours(Number(parts[0]) || 0, Number(parts[1]) || 0, 0, 0);
  d.setUTCMinutes(d.getUTCMinutes() - offsetMin);
  return d.toISOString();
}
function toGCalUtc(iso) { return iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z'); }
function googleCalendarLink(b, settings, isEn) {
  const checkInTime = settings.checkInTime || '15:00';
  const checkOutTime = settings.checkOutTime || '10:00';
  const startUtc = toGCalUtc(romeWallTimeToUtcIso(b.checkIn, checkInTime));
  const endUtc = toGCalUtc(romeWallTimeToUtcIso(b.checkOut, checkOutTime));
  const siteName = settings.siteName || 'La struttura';
  const text = siteName + ' — ' + (b.roomLabel || (isEn ? 'stay' : 'soggiorno'));
  const details = isEn
    ? ('Check-in: ' + checkInTime + '. Check-out: ' + checkOutTime + '.')
    : ('Check-in: ore ' + checkInTime + '. Check-out: ore ' + checkOutTime + '.');
  const location = settings.address || '';
  return 'https://www.google.com/calendar/render?action=TEMPLATE'
    + '&text=' + encodeURIComponent(text)
    + '&dates=' + startUtc + '/' + endUtc
    + '&details=' + encodeURIComponent(details)
    + '&location=' + encodeURIComponent(location);
}
function functionsBase() { return process.env.FUNCTIONS_BASE_URL || 'https://europe-west1-casa-celeste.cloudfunctions.net'; }
function icsLink(bookingId, token, labelOverride) {
  let url = functionsBase() + '/bookingCalendarIcs?booking=' + bookingId + '&token=' + token;
  if (labelOverride) url += '&label=' + encodeURIComponent(labelOverride);
  return url;
}

const SUBJECTS = {
  confirmation: { it: '✅ Prenotazione confermata — {{roomLabel}}, {{siteName}}', en: '✅ Booking confirmed — {{roomLabel}}, {{siteName}}' },
  cancellation: { it: 'Prenotazione annullata — {{siteName}}', en: 'Booking cancelled — {{siteName}}' }
};
function subjectFor(key, isEn, b, siteName) {
  const s = SUBJECTS[key][isEn ? 'en' : 'it'];
  return s.replace('{{roomLabel}}', b.roomLabel || siteName).replace('{{siteName}}', siteName);
}

// ---- Gmail (Nodemailer) ----
// Cache tenuta anche a chiave (utente+password), non solo a "esiste già":
// da quando le credenziali possono arrivare da Firestore (Impostazioni →
// Integrazioni, vedi integration-settings.js) invece che solo da un secret
// CLI fisso, un'istanza Cloud Function calda potrebbe vedere credenziali
// diverse tra un invito e l'altro — senza la chiave continuerebbe a usare il
// transporter (e quindi le credenziali) della primissima chiamata.
let mailTransport = null;
let mailTransportKey = null;
function getMailTransport(gmailUser, gmailAppPassword) {
  if (!gmailUser || !gmailAppPassword) return null;
  const key = gmailUser + '|' + gmailAppPassword;
  if (mailTransport && mailTransportKey === key) return mailTransport;
  mailTransport = nodemailer.createTransport({ service: 'gmail', auth: { user: gmailUser, pass: gmailAppPassword } });
  mailTransportKey = key;
  return mailTransport;
}
// `fromNameOverride` = settings.emailSenderName (Impostazioni → Aspetto &
// personalizzazione → Email): nome mittente visto dall'ospite nella sua
// casella, indipendente dal siteName mostrato NEL corpo dell'email — utile
// per chi vuole firmarsi diversamente (es. "Prenotazioni Casa Celeste")
// senza cambiare il nome struttura ovunque altrove.
async function sendMail(gmailUser, gmailAppPassword, to, subject, html, siteName, fromNameOverride) {
  const transport = getMailTransport(gmailUser, gmailAppPassword);
  if (!transport) return { sent: false, reason: 'not_configured' };
  await transport.sendMail({ from: (fromNameOverride || siteName || 'La struttura') + ' <' + gmailUser + '>', to: to, subject: subject, html: html });
  return { sent: true };
}

async function telegramAlert(telegramBotToken, settings, text) {
  if (!telegramBotToken) return;
  const recipients = (settings.bookingCommandAuthorized || []).filter((r) => r.enabled && r.chatId);
  await Promise.all(recipients.map((r) => fetch('https://api.telegram.org/bot' + telegramBotToken + '/sendMessage', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: r.chatId, text: text })
  }).catch(() => {})));
}

// ==========================================================================
// Conferma prenotazione — immediata (priorità 2, come nel cron orario).
// Per un gruppo, aspetta che TUTTE le stanze siano confermate prima di
// mandare l'unica email (si autorisolve: se manca ancora una stanza, questo
// invio si ferma qui senza errori — quando l'ultima stanza viene confermata,
// il SUO trigger vede il gruppo completo e manda l'email).
// ==========================================================================
async function notifyBookingConfirmed(ctx, bookingId, booking) {
  const { db, gmailUser, gmailAppPassword, telegramBotToken } = ctx;

  let docsGroup = [{ id: bookingId, ref: db.collection('tourism_bookings').doc(bookingId), b: booking }];
  if (booking.groupId) {
    const groupSnap = await db.collection('tourism_bookings').where('groupId', '==', booking.groupId).get();
    const active = groupSnap.docs.filter((d) => d.data().status !== 'annullato').map((d) => ({ id: d.id, ref: d.ref, b: d.data() }));
    if (active.length > 1) {
      if (!active.every((item) => item.b.status === 'confermato')) return; // gruppo non ancora tutto confermato, aspetta
      docsGroup = active;
    }
  }

  // Claim atomico: per un gruppo, i trigger delle stanze committate insieme
  // arrivano quasi simultaneamente — solo UNA invocazione deve vincere e
  // mandare l'email, marcando confirmationEmailSent su tutte le stanze
  // dentro la stessa transazione.
  const claimed = await db.runTransaction(async (tx) => {
    const fresh = await Promise.all(docsGroup.map((item) => tx.get(item.ref)));
    if (fresh.some((s) => !s.exists || s.data().status !== 'confermato')) return false;
    if (fresh.every((s) => s.data().confirmationEmailSent)) return false;
    fresh.forEach((s) => tx.update(s.ref, { confirmationEmailSent: true }));
    return true;
  });
  if (!claimed) return;

  const settingsSnap = await db.collection('tourism_settings').doc('site').get();
  const settings = settingsSnap.exists ? settingsSnap.data() : {};

  const siteName = settings.siteName || 'La struttura';
  const city = settings.city || '';
  const address = settings.address || '';
  const isGroup = docsGroup.length > 1;
  const first = docsGroup[0];
  const rep = first.b;
  const isEn = rep.lang === 'en';
  let totalGuests = 0, totalDue = 0;
  const rooms = docsGroup.map((item) => {
    const due = (item.b.touristTax && item.b.touristTax.totalDue) || 0;
    totalGuests += item.b.guests || 0;
    totalDue += due;
    return { roomLabel: item.b.roomLabel || siteName, docsLink: docsLinkFor(item.id, item.b.guestFormToken), totalDue: due };
  });
  totalDue = Math.round(totalDue * 100) / 100;
  const groupRoomNames = joinRoomNames(docsGroup.map((item) => item.b), isEn, siteName);
  const repForCalendar = isGroup ? Object.assign({}, rep, { roomLabel: groupRoomNames }) : rep;
  const subjectRep = isGroup ? Object.assign({}, rep, { roomLabel: groupRoomNames }) : rep;
  const subjectLine = subjectFor('confirmation', isEn, subjectRep, siteName);

  let html;
  try {
    const confirmationVars = {
      siteName: siteName, city: city, address: address,
      email: rep.email || '', name: rep.name || '', roomLabel: isGroup ? groupRoomNames : (rep.roomLabel || siteName),
      checkIn: formatDateHuman(rep.checkIn, isEn), checkOut: formatDateHuman(rep.checkOut, isEn),
      nights: rep.nights || 0, guests: totalGuests, totalDue: totalDue,
      docsLink: rooms[0].docsLink,
      checkInTime: settings.checkInTime || '15:00', checkOutTime: settings.checkOutTime || '10:00',
      googleCalendarLink: googleCalendarLink(repForCalendar, settings, isEn),
      icsLink: icsLink(first.id, first.b.guestFormToken, isGroup ? groupRoomNames : ''),
      assistLink: assistLink(), isEn: isEn, subjectLine: subjectLine,
      isGroup: isGroup, rooms: isGroup ? rooms : [],
      footerSignature: settings.emailFooterSignature || '',
      logoUrl: settings.logoUrl || '',
      assistButtonLabel: pickText(settings.emailTexts, 'shared', 'assistButtonLabel', isEn)
    };
    Object.assign(confirmationVars, emailTextVars(settings.emailTexts, 't1', T1_FIELDS, isEn, confirmationVars));
    Object.assign(confirmationVars, emailTextVars(settings.emailTexts, 'tableLabels', T1_TABLE_FIELDS, isEn, confirmationVars));
    const t1Layout = (settings.emailLayouts && settings.emailLayouts.t1) || EmailBlocks.defaultLayout('t1');
    confirmationVars.blocksHtml = EmailBlocks.renderTemplateBody('t1', t1Layout, confirmationVars);
    html = renderTemplate('1-conferma-prenotazione.html', confirmationVars);
    const result = await sendMail(gmailUser, gmailAppPassword, rep.email, subjectLine, html, siteName, settings.emailSenderName);
    if (!result.sent) console.log('Conferma immediata non configurata (mancano i secrets Gmail): ' + bookingId);
  } catch (err) {
    console.error('Errore invio conferma immediata per ' + bookingId + ':', err.message);
    await telegramAlert(telegramBotToken, settings, '⚠️ Errore invio email di conferma per ' + bookingId + ': ' + err.message);
  }
}

// ==========================================================================
// Annullamento prenotazione — immediato (priorità 2). Un annullamento di
// gruppo self-service (cancelBookingCore, tutte le stanze insieme in un
// solo batch atomico) genera un'unica email consolidata; un annullamento
// manuale di UNA stanza sola (dashboard, le altre stanze del gruppo restano
// attive) genera un'email solo per quella stanza.
// ==========================================================================
async function notifyBookingCancelled(ctx, bookingId, booking) {
  const { db, gmailUser, gmailAppPassword, telegramBotToken } = ctx;

  let docsGroup = [{ id: bookingId, ref: db.collection('tourism_bookings').doc(bookingId), b: booking }];
  if (booking.groupId) {
    const groupSnap = await db.collection('tourism_bookings').where('groupId', '==', booking.groupId).get();
    const allDocs = groupSnap.docs.map((d) => ({ id: d.id, ref: d.ref, b: d.data() }));
    const allCancelled = allDocs.length > 1 && allDocs.every((item) => item.b.status === 'annullato');
    if (allCancelled) docsGroup = allDocs;
  }

  const claimed = await db.runTransaction(async (tx) => {
    const fresh = await Promise.all(docsGroup.map((item) => tx.get(item.ref)));
    if (fresh.every((s) => s.data().cancellationEmailSent)) return false;
    fresh.forEach((s) => tx.update(s.ref, { cancellationEmailSent: true }));
    return true;
  });
  if (!claimed) return;

  const settingsSnap = await db.collection('tourism_settings').doc('site').get();
  const settings = settingsSnap.exists ? settingsSnap.data() : {};

  const siteName = settings.siteName || 'La struttura';
  const city = settings.city || '';
  const address = settings.address || '';
  const isGroup = docsGroup.length > 1;
  const first = docsGroup[0];
  const rep = first.b;
  const isEn = rep.lang === 'en';
  const groupRoomNames = joinRoomNames(docsGroup.map((item) => item.b), isEn, siteName);
  let totalRefund = 0, hasRefund = false;
  docsGroup.forEach((item) => {
    const c = item.b.cancellation;
    if (c && c.refunded) { hasRefund = true; totalRefund += Number(c.refundAmount) || 0; }
  });
  totalRefund = Math.round(totalRefund * 100) / 100;
  const subjectLine = subjectFor('cancellation', isEn, isGroup ? Object.assign({}, rep, { roomLabel: groupRoomNames }) : rep, siteName);

  try {
    const cancellationVars = {
      siteName: siteName, city: city, address: address,
      email: rep.email || '', name: rep.name || '', roomLabel: isGroup ? groupRoomNames : (rep.roomLabel || siteName),
      checkIn: formatDateHuman(rep.checkIn, isEn), checkOut: formatDateHuman(rep.checkOut, isEn),
      hasRefund: hasRefund, refundAmount: totalRefund,
      assistLink: assistLink(), isEn: isEn, subjectLine: subjectLine, isGroup: isGroup,
      footerSignature: settings.emailFooterSignature || '',
      logoUrl: settings.logoUrl || '',
      assistButtonLabel: pickText(settings.emailTexts, 'shared', 'assistButtonLabel', isEn)
    };
    Object.assign(cancellationVars, emailTextVars(settings.emailTexts, 't7', T7_FIELDS, isEn, cancellationVars));
    const t7Layout = (settings.emailLayouts && settings.emailLayouts.t7) || EmailBlocks.defaultLayout('t7');
    cancellationVars.blocksHtml = EmailBlocks.renderTemplateBody('t7', t7Layout, cancellationVars);
    const html = renderTemplate('7-annullamento-prenotazione.html', cancellationVars);
    const result = await sendMail(gmailUser, gmailAppPassword, rep.email, subjectLine, html, siteName, settings.emailSenderName);
    if (!result.sent) console.log('Annullamento immediato non configurato (mancano i secrets Gmail): ' + bookingId);
  } catch (err) {
    console.error('Errore invio email di annullamento per ' + bookingId + ':', err.message);
    await telegramAlert(telegramBotToken, settings, '⚠️ Errore invio email di annullamento per ' + bookingId + ': ' + err.message);
  }
}

// sendMail esportata anche per guest-signature.js (email OTP firma
// contratto): stesso transport Gmail cache-ato.
module.exports = { notifyBookingConfirmed, notifyBookingCancelled, renderTemplate, sendMail };
