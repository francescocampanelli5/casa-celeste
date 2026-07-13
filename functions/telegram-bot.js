// Bot Telegram affittacamere — webhook in tempo reale (sostituisce il
// vecchio polling ogni 5 minuti). Due modi per registrare una prenotazione
// manuale (Airbnb/Booking/telefono):
//  1) `/nuova` senza argomenti → compilazione guidata passo-passo (stanza,
//     calendario, ospiti, opzioni, contatti), con cattura opzionale delle
//     foto documento e lettura automatica (OCR/MRZ) sempre da confermare a
//     mano prima di salvare — vedi mrz-parser.js.
//  2) `/nuova <riga unica>` → formato veloce preesistente, invariato.
//
// Stato della conversazione: un documento per chat in tourism_botSessions
// (mai letto/scritto dal client, solo da questa funzione con Admin SDK).
// Ogni bottone porta un `callback_data` corto (limite Telegram 64 byte) —
// lo stato vero si rilegge sempre dalla sessione, mai dal bottone stesso.
//
// Stesso principio di sicurezza del vecchio bot: solo i chat-id presenti e
// abilitati in tourism_settings.site.bookingCommandAuthorized possono usare
// /nuova, /annulla o i bottoni del wizard — chiunque altro riceve solo il
// proprio chat-id (da inoltrare al proprietario) e le istruzioni di /aiuto.
'use strict';
const crypto = require('crypto');
const { createBookingCore } = require('./booking-logic');
const { findAlreadyVerifiedGuests, recordVerifiedGuests } = require('./guest-verification');
const { validateGuest, movePhotoToPermanent } = require('./guest-documents');
const { parseMrzFromText } = require('./mrz-parser');

const SOURCE_MAP = { airbnb: 'manual_airbnb', booking: 'manual_booking', phone: 'manual_phone' };
const CHANNEL_LABELS = { airbnb: 'Airbnb', booking: 'Booking.com', phone: 'Telefono/altro' };
const DOC_TYPE_LABELS = { carta_identita: "Carta d'identità", passaporto: 'Passaporto', patente: 'Patente' };
const DOC_TYPE_CODES = { ci: 'carta_identita', pa: 'passaporto', pt: 'patente' };
// Prezzi fittizi/placeholder — devono restare allineati manualmente con
// affittacamere/js/app.js e functions/booking-logic.js (stessa nota lì).
const CRIB_PRICE_PER_NIGHT = 8;
const EXTRA_BED_PRICE_PER_NIGHT = 15;
const MONTH_NAMES = ['', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
const WEEKDAY_HEADERS = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
const FIELD_LABELS = {
  firstName: 'Nome', lastName: 'Cognome', birthDate: 'Data di nascita (GG/MM/AAAA)',
  birthPlace: 'Luogo di nascita', nationality: 'Cittadinanza',
  docNumber: 'Numero documento', docIssuePlace: 'Luogo di rilascio del documento'
};
const FIELD_CODES = { f: 'firstName', l: 'lastName', b: 'birthDate', p: 'birthPlace', n: 'nationality', u: 'docNumber', i: 'docIssuePlace' };
const FIELD_CODES_REVERSE = { firstName: 'f', lastName: 'l', birthDate: 'b', birthPlace: 'p', nationality: 'n', docNumber: 'u', docIssuePlace: 'i' };

/* ==========================================================================
   Date helpers — copiate in piccolo qui (non condivise con
   affittacamere/scripts/_lib.js: cartelle diverse con deploy diversi,
   stesso motivo per cui functions/index.js ha già la propria copia di
   telegramSend invece di importarla da _lib.js).
   ========================================================================== */
function pad2(n) { return String(n).padStart(2, '0'); }
function todayIso() { return new Date().toISOString().slice(0, 10); }
function isoFromParts(y, m, d) { return y + '-' + pad2(m) + '-' + pad2(d); }
function addMonths(year, month1to12, delta) {
  const total = (year * 12 + (month1to12 - 1)) + delta;
  return { y: Math.floor(total / 12), m: (total % 12) + 1 };
}
function daysInMonth(year, month1to12) { return new Date(Date.UTC(year, month1to12, 0)).getUTCDate(); }
function firstWeekdayMon0(year, month1to12) {
  const dow = new Date(Date.UTC(year, month1to12 - 1, 1)).getUTCDay(); // Dom=0..Sab=6
  return (dow + 6) % 7; // Lun=0..Dom=6
}
function isoToItalian(iso) { if (!iso) return ''; const p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
function parseItalianDate(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s || '').trim());
  if (!m) return null;
  const iso = m[3] + '-' + m[2] + '-' + m[1];
  const d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) return null;
  return iso;
}
function rangeContainsDay(ranges, iso) {
  return (ranges || []).some((r) => iso >= r.start && iso < r.end);
}

/* ==========================================================================
   Wrapper API Telegram — un solo posto dove costruire le chiamate REST.
   ========================================================================== */
function tgApi(token, method) { return 'https://api.telegram.org/bot' + token + '/' + method; }

async function tgSendMessage(ctx, chatId, text, keyboard) {
  const body = { chat_id: chatId, text: text, parse_mode: undefined };
  if (keyboard) body.reply_markup = keyboard;
  const res = await fetch(tgApi(ctx.botToken, 'sendMessage'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  return res.json().catch(() => null);
}
async function tgEditMessageText(ctx, chatId, messageId, text, keyboard) {
  const body = { chat_id: chatId, message_id: messageId, text: text };
  if (keyboard) body.reply_markup = keyboard;
  try {
    const res = await fetch(tgApi(ctx.botToken, 'editMessageText'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => null);
    return !!(data && data.ok);
  } catch (e) {
    return false;
  }
}
async function tgAnswerCallbackQuery(ctx, callbackQueryId, text) {
  try {
    await fetch(tgApi(ctx.botToken, 'answerCallbackQuery'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text: text || undefined })
    });
  } catch (e) { /* best-effort */ }
}
async function tgGetFile(ctx, fileId) {
  const res = await fetch(tgApi(ctx.botToken, 'getFile') + '?file_id=' + encodeURIComponent(fileId));
  const data = await res.json().catch(() => null);
  return data && data.ok ? data.result : null;
}
async function tgDownloadFile(ctx, filePath) {
  const res = await fetch('https://api.telegram.org/file/bot' + ctx.botToken + '/' + filePath);
  if (!res.ok) throw new Error('Download file Telegram fallito: ' + res.status);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Mostra un passo del wizard riusando lo stesso messaggio quando possibile
// (modifica in-place, niente spam in chat) — se non è più modificabile
// (es. l'utente ha chiuso/cancellato quel messaggio) ne manda uno nuovo.
// Salva sempre la sessione aggiornata (step/draft/messageId) in un colpo
// solo, il chiamante passa la sessione già mutata con i nuovi valori.
async function commitStep(ctx, chatId, session, text, keyboard) {
  let usedExisting = false;
  if (session.messageId) {
    usedExisting = await tgEditMessageText(ctx, chatId, session.messageId, text, keyboard || { inline_keyboard: [] });
  }
  if (!usedExisting) {
    const sent = await tgSendMessage(ctx, chatId, text, keyboard);
    if (sent && sent.ok && sent.result) session.messageId = sent.result.message_id;
  }
  await saveSession(ctx, chatId, session);
}

/* ==========================================================================
   Sessione conversazione — tourism_botSessions/{chatId}.
   ========================================================================== */
function sessionsRef(ctx) { return ctx.db.collection('tourism_botSessions'); }
async function getSession(ctx, chatId) {
  const snap = await sessionsRef(ctx).doc(String(chatId)).get();
  return snap.exists ? snap.data() : null;
}
async function saveSession(ctx, chatId, session) {
  const toSave = Object.assign({}, session, { updatedAt: ctx.admin.firestore.FieldValue.serverTimestamp() });
  await sessionsRef(ctx).doc(String(chatId)).set(toSave, { merge: false });
}
async function clearSession(ctx, chatId) {
  await sessionsRef(ctx).doc(String(chatId)).delete().catch(() => {});
}

/* ==========================================================================
   Autorizzazione — stessa fonte del vecchio bot (tourism_settings.site).
   ========================================================================== */
async function getAuthorizedChatIds(ctx) {
  const snap = await ctx.db.collection('tourism_settings').doc('site').get();
  const settings = snap.exists ? snap.data() : {};
  return (settings.bookingCommandAuthorized || []).filter((r) => r.enabled && r.chatId).map((r) => String(r.chatId));
}
async function isAuthorized(ctx, chatId) {
  const list = await getAuthorizedChatIds(ctx);
  return list.indexOf(String(chatId)) !== -1;
}
function unauthorizedText(chatId) {
  return 'Non sei autorizzato a creare prenotazioni da qui (chat-id: ' + chatId + '). Chiedi al proprietario di aggiungerti da dashboard.html → Impostazioni, oppure scrivi /aiuto.';
}
function helpText(authorized, chatId) {
  return [
    '👋 Ciao! Sono il bot di Casa Celeste.',
    '',
    'Cosa faccio automaticamente, se sei autorizzato:',
    '• ti avviso appena arriva una nuova prenotazione dal sito;',
    '• ti avviso la sera prima e la mattina del check-out quando c\'è da fare le pulizie;',
    '• ti avviso se qualcosa richiede attenzione (email in esaurimento, invii falliti).',
    '',
    'Comandi che puoi usare, se sei autorizzato:',
    '/nuova → avvia la compilazione guidata passo-passo (stanza, calendario, ospiti, opzioni, contatti, foto documenti con lettura automatica da confermare).',
    '/nuova <Stanza> <check-in GG/MM/AAAA> <check-out GG/MM/AAAA> <Nome Cognome> <email> <telefono> <ospiti> [canale] → formato veloce su una riga, invariato.',
    '/annulla → interrompe la compilazione in corso.',
    '',
    'Esempio formato veloce:',
    '/nuova Scirocco 01/08/2026 05/08/2026 Mario Rossi mario@email.com 3331234567 2 airbnb',
    '',
    'Il tuo chat-id: ' + chatId,
    authorized
      ? 'Sei autorizzato: ricevi le notifiche e puoi usare /nuova.'
      : 'Non sei ancora autorizzato a ricevere notifiche o usare /nuova: manda questo chat-id al proprietario, che deve aggiungerti da dashboard.html → Impostazioni.'
  ].join('\n');
}

/* ==========================================================================
   Formato veloce a riga singola — logica invariata rispetto al vecchio
   affittacamere/scripts/telegram-bot-poll.js (stesso parsing, stessa
   createBookingCore condivisa), solo adattata a girare qui.
   ========================================================================== */
const DATE_RE_IT = /^(\d{2})\/(\d{2})\/(\d{4})$/;
function parseDateItLegacy(s) {
  const m = DATE_RE_IT.exec(s);
  if (!m) return null;
  return m[3] + '-' + m[2] + '-' + m[1];
}
async function findRoomIdByName(ctx, name) {
  const snap = await ctx.db.collection('tourism_rooms').get();
  const target = name.trim().toLowerCase();
  let found = null;
  snap.forEach((d) => { if (d.id.toLowerCase() === target || (d.data().name || '').toLowerCase() === target) found = d.id; });
  return found;
}
async function handleLegacyNuovaCommand(ctx, chatId, text) {
  const parts = text.trim().split(/\s+/);
  parts.shift(); // rimuove "/nuova"
  if (parts.length < 6) {
    await tgSendMessage(ctx, chatId, 'Formato non valido. Esempio:\n/nuova Scirocco 01/08/2026 05/08/2026 Mario Rossi mario@email.com 3331234567 2 airbnb\n\nOppure scrivi solo /nuova per la compilazione guidata.');
    return;
  }
  const roomName = parts.shift();
  const checkInRaw = parts.shift();
  const checkOutRaw = parts.shift();
  let channel = 'other';
  const lastLower = parts.length && parts[parts.length - 1].toLowerCase();
  if (SOURCE_MAP[lastLower]) channel = parts.pop().toLowerCase();
  let guestsCount = 1;
  if (parts.length && /^\d+$/.test(parts[parts.length - 1])) guestsCount = Number(parts.pop());
  const phone = parts.length ? parts.pop() : '';
  const email = parts.length ? parts.pop() : '';
  const name = parts.join(' ');

  const checkIn = parseDateItLegacy(checkInRaw);
  const checkOut = parseDateItLegacy(checkOutRaw);
  if (!checkIn || !checkOut) { await tgSendMessage(ctx, chatId, 'Date non valide: usa il formato GG/MM/AAAA.'); return; }

  const roomId = await findRoomIdByName(ctx, roomName);
  if (!roomId) { await tgSendMessage(ctx, chatId, 'Stanza "' + roomName + '" non trovata.'); return; }

  try {
    const result = await createBookingCore(ctx.admin, ctx.db, {
      roomId: roomId, checkIn: checkIn, checkOut: checkOut, guests: guestsCount, exemptGuests: 0,
      name: name || 'Ospite ' + (SOURCE_MAP[channel] || channel), email: email || 'nessuna@email.non-fornita.invalid',
      phone: phone, source: SOURCE_MAP[channel] || 'manual_other', contractAccepted: true
    });
    const origin = 'https://lacasaceleste.it/affittacamere/';
    const docsLink = origin + 'ospiti.html?booking=' + result.id + '&token=' + result.guestFormToken;
    await tgSendMessage(ctx, chatId, '✅ Prenotazione creata: ' + result.roomLabel + ' dal ' + checkIn + ' al ' + checkOut + ' (' + result.nights + ' notti).\nLink documenti da inoltrare all\'ospite:\n' + docsLink);
  } catch (err) {
    if (err.code === 'already-exists') { await tgSendMessage(ctx, chatId, '❌ Quelle notti sono già occupate per questa stanza.'); return; }
    await tgSendMessage(ctx, chatId, '❌ Errore: ' + err.message);
  }
}

/* ==========================================================================
   Wizard — tastiere.
   ========================================================================== */
function roomsKeyboard(rooms) {
  const rows = rooms.map((r) => [{ text: r.name || r.id, callback_data: 'rm:' + r.id }]);
  rows.push([{ text: '❌ Annulla', callback_data: 'cancel' }]);
  return { inline_keyboard: rows };
}
function calendarKeyboard(field, year, month, isDisabled) {
  const rows = [];
  const prev = addMonths(year, month, -1);
  const next = addMonths(year, month, 1);
  rows.push([
    { text: '«', callback_data: 'cal:' + field + ':nav:' + prev.y + '-' + pad2(prev.m) },
    { text: MONTH_NAMES[month] + ' ' + year, callback_data: 'noop' },
    { text: '»', callback_data: 'cal:' + field + ':nav:' + next.y + '-' + pad2(next.m) }
  ]);
  rows.push(WEEKDAY_HEADERS.map((w) => ({ text: w, callback_data: 'noop' })));

  const total = daysInMonth(year, month);
  const leading = firstWeekdayMon0(year, month);
  let cells = [];
  for (let i = 0; i < leading; i++) cells.push({ text: ' ', callback_data: 'noop' });
  for (let d = 1; d <= total; d++) {
    const iso = isoFromParts(year, month, d);
    const disabled = isDisabled(iso);
    cells.push({ text: disabled ? '·' : String(d), callback_data: disabled ? 'noop' : 'cal:' + field + ':day:' + iso });
  }
  while (cells.length % 7 !== 0) cells.push({ text: ' ', callback_data: 'noop' });
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  rows.push([{ text: '❌ Annulla', callback_data: 'cancel' }]);
  return { inline_keyboard: rows };
}
function guestsKeyboard(maxGuests) {
  const row = [];
  for (let n = 1; n <= Math.max(1, maxGuests || 1); n++) row.push({ text: String(n) + (n === 1 ? ' ospite' : ' ospiti'), callback_data: 'gc:' + n });
  return { inline_keyboard: [row, [{ text: '❌ Annulla', callback_data: 'cancel' }]] };
}
function bedTypeKeyboard() {
  return { inline_keyboard: [[{ text: '🛏️ Matrimoniale', callback_data: 'bed:m' }, { text: '🛏️ Letto singolo', callback_data: 'bed:s' }], [{ text: '❌ Annulla', callback_data: 'cancel' }]] };
}
function cribKeyboard() {
  return { inline_keyboard: [[{ text: 'Nessuna culla', callback_data: 'crib:0' }, { text: '+1 culla (+' + CRIB_PRICE_PER_NIGHT + '€/notte, extra)', callback_data: 'crib:1' }], [{ text: '❌ Annulla', callback_data: 'cancel' }]] };
}
function extraBedKeyboard() {
  return { inline_keyboard: [[{ text: 'Nessun letto extra', callback_data: 'xbed:0' }, { text: '+1 letto singolo (+' + EXTRA_BED_PRICE_PER_NIGHT + '€/notte, extra)', callback_data: 'xbed:1' }], [{ text: '❌ Annulla', callback_data: 'cancel' }]] };
}
function channelKeyboard() {
  return {
    inline_keyboard: [
      [{ text: 'Airbnb', callback_data: 'ch:airbnb' }, { text: 'Booking.com', callback_data: 'ch:booking' }],
      [{ text: 'Telefono / altro', callback_data: 'ch:phone' }],
      [{ text: '❌ Annulla', callback_data: 'cancel' }]
    ]
  };
}
function confirmBookingKeyboard() {
  return { inline_keyboard: [[{ text: '✅ Conferma prenotazione', callback_data: 'confirm:booking' }], [{ text: '❌ Annulla', callback_data: 'cancel' }]] };
}
function docsOfferKeyboard() {
  return { inline_keyboard: [[{ text: '📎 Carica ora', callback_data: 'docs:yes' }, { text: '⏭️ Più tardi', callback_data: 'docs:skip' }]] };
}
function truncateLabel(v, n) { return v ? (String(v).length > n ? String(v).slice(0, n - 1) + '…' : String(v)) : '—'; }
function docConfirmCard(session) {
  const g = session.docsGuestDraft || {};
  const idx = (session.docsGuestIndex || 0) + 1;
  const total = session.draft.guests;
  const lines = [
    '📄 Ospite ' + idx + ' di ' + total + ' — verifica i dati prima di confermare:',
    'Nome: ' + (g.firstName || '—'),
    'Cognome: ' + (g.lastName || '—'),
    'Data di nascita: ' + (g.birthDate ? isoToItalian(g.birthDate) : '—'),
    'Luogo di nascita: ' + (g.birthPlace || '—'),
    'Cittadinanza: ' + (g.nationality || '—'),
    'Tipo documento: ' + (DOC_TYPE_LABELS[g.docType] || '—'),
    'Numero documento: ' + (g.docNumber || '—'),
    'Rilasciato a: ' + (g.docIssuePlace || '—'),
    '',
    'Tocca un campo per correggerlo, oppure conferma.'
  ];
  const keyboard = {
    inline_keyboard: [
      [{ text: 'Nome: ' + truncateLabel(g.firstName, 16), callback_data: 'doc:field:f' }, { text: 'Cognome: ' + truncateLabel(g.lastName, 16), callback_data: 'doc:field:l' }],
      [{ text: 'Nascita: ' + (g.birthDate ? isoToItalian(g.birthDate) : '—'), callback_data: 'doc:field:b' }, { text: 'Luogo nascita: ' + truncateLabel(g.birthPlace, 14), callback_data: 'doc:field:p' }],
      [{ text: 'Cittadinanza: ' + truncateLabel(g.nationality, 14), callback_data: 'doc:field:n' }, { text: 'Tipo: ' + truncateLabel(DOC_TYPE_LABELS[g.docType], 14), callback_data: 'doc:field:t' }],
      [{ text: 'N. documento: ' + truncateLabel(g.docNumber, 14), callback_data: 'doc:field:u' }, { text: 'Rilasciato a: ' + truncateLabel(g.docIssuePlace, 14), callback_data: 'doc:field:i' }],
      [{ text: '✅ Conferma questo ospite', callback_data: 'doc:confirm' }],
      [{ text: '🔄 Rifai la foto', callback_data: 'doc:retry' }],
      [{ text: '❌ Annulla tutto', callback_data: 'cancel' }]
    ]
  };
  return { text: lines.join('\n'), keyboard: keyboard };
}
function docTypeKeyboard() {
  return { inline_keyboard: [[{ text: "Carta d'identità", callback_data: 'dt:ci' }, { text: 'Passaporto', callback_data: 'dt:pa' }, { text: 'Patente', callback_data: 'dt:pt' }], [{ text: '❌ Annulla', callback_data: 'cancel' }]] };
}

/* ==========================================================================
   Vision API — DOCUMENT_TEXT_DETECTION via REST diretta (nessuna nuova
   dipendenza npm, coerente con lo stile del resto di functions/).
   ========================================================================== */
async function visionDocumentText(apiKey, buffer) {
  if (!apiKey) return null;
  const res = await fetch('https://vision.googleapis.com/v1/images:annotate?key=' + apiKey, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ image: { content: buffer.toString('base64') }, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }] }] })
  });
  if (!res.ok) throw new Error('Vision API ' + res.status + ': ' + (await res.text()));
  const data = await res.json();
  const r = data.responses && data.responses[0];
  if (!r || r.error) return null;
  return (r.fullTextAnnotation && r.fullTextAnnotation.text) || null;
}

/* ==========================================================================
   Wizard — passi.
   ========================================================================== */
async function startWizard(ctx, chatId) {
  const snap = await ctx.db.collection('tourism_rooms').get();
  const rooms = [];
  snap.forEach((d) => rooms.push(Object.assign({ id: d.id }, d.data())));
  if (!rooms.length) { await tgSendMessage(ctx, chatId, 'Nessuna stanza trovata.'); return; }
  const session = { step: 'room', draft: {}, messageId: null };
  await commitStep(ctx, chatId, session, '🏠 Quale stanza?', roomsKeyboard(rooms));
}

async function onRoomPick(ctx, chatId, session, roomId) {
  if (session.step !== 'room') return;
  const snap = await ctx.db.collection('tourism_rooms').doc(roomId).get();
  if (!snap.exists) { await tgSendMessage(ctx, chatId, 'Stanza non trovata, riprova con /nuova.'); await clearSession(ctx, chatId); return; }
  const room = snap.data();
  session.draft.roomId = roomId;
  session.draft.roomLabel = room.name || roomId;
  session.draft.maxGuests = room.maxGuests || 1;
  session.draft.blockedRanges = room.blockedRanges || [];
  session.step = 'checkin';
  const today = todayIso();
  const y = Number(today.slice(0, 4)), m = Number(today.slice(5, 7));
  session.calendarCursor = { y: y, m: m };
  const kb = calendarKeyboard('i', y, m, (iso) => iso < today || rangeContainsDay(session.draft.blockedRanges, iso));
  await commitStep(ctx, chatId, session, '📅 ' + session.draft.roomLabel + ' — scegli la data di check-in:', kb);
}

async function onCalendar(ctx, chatId, session, data) {
  const parts = data.split(':'); // cal:<field>:<action>:<value>
  const field = parts[1], action = parts[2], value = parts[3];
  const expectedStep = field === 'i' ? 'checkin' : 'checkout';
  if (session.step !== expectedStep) return;

  if (action === 'nav') {
    const [y, m] = value.split('-').map(Number);
    session.calendarCursor = { y: y, m: m };
    const today = todayIso();
    const isDisabled = field === 'i'
      ? (iso) => iso < today || rangeContainsDay(session.draft.blockedRanges, iso)
      : (iso) => iso <= session.draft.checkIn || rangeContainsDay(session.draft.blockedRanges, iso);
    const label = field === 'i' ? 'check-in' : 'check-out';
    await commitStep(ctx, chatId, session, '📅 ' + session.draft.roomLabel + ' — scegli la data di ' + label + ':', calendarKeyboard(field, y, m, isDisabled));
    return;
  }

  if (action === 'day') {
    const today = todayIso();
    if (field === 'i') {
      if (value < today || rangeContainsDay(session.draft.blockedRanges, value)) return;
      session.draft.checkIn = value;
      session.step = 'checkout';
      const y = Number(value.slice(0, 4)), m = Number(value.slice(5, 7));
      session.calendarCursor = { y: y, m: m };
      const kb = calendarKeyboard('o', y, m, (iso) => iso <= session.draft.checkIn || rangeContainsDay(session.draft.blockedRanges, iso));
      await commitStep(ctx, chatId, session, '📅 Check-in: ' + isoToItalian(value) + '\nOra scegli la data di check-out:', kb);
      return;
    }
    if (field === 'o') {
      if (value <= session.draft.checkIn || rangeContainsDay(session.draft.blockedRanges, value)) return;
      session.draft.checkOut = value;
      session.step = 'guests';
      await commitStep(ctx, chatId, session, '📅 ' + isoToItalian(session.draft.checkIn) + ' → ' + isoToItalian(value) + '\n👥 Quanti ospiti?', guestsKeyboard(session.draft.maxGuests));
      return;
    }
  }
}

async function onGuestCount(ctx, chatId, session, data) {
  if (session.step !== 'guests') return;
  session.draft.guests = Number(data.split(':')[1]);
  session.step = 'bedType';
  await commitStep(ctx, chatId, session, '🛏️ Che tipo di letto?', bedTypeKeyboard());
}
async function onBedType(ctx, chatId, session, data) {
  if (session.step !== 'bedType') return;
  session.draft.bedType = data === 'bed:s' ? 'singolo' : 'matrimoniale';
  session.step = 'crib';
  await commitStep(ctx, chatId, session, '👶 Serve una culla?', cribKeyboard());
}
async function onCrib(ctx, chatId, session, data) {
  if (session.step !== 'crib') return;
  session.draft.cribCount = Number(data.split(':')[1]);
  session.step = 'extraBed';
  await commitStep(ctx, chatId, session, '🛏️ Serve un letto singolo aggiuntivo?', extraBedKeyboard());
}
async function onExtraBed(ctx, chatId, session, data) {
  if (session.step !== 'extraBed') return;
  session.draft.extraBedCount = Number(data.split(':')[1]);
  session.step = 'channel';
  await commitStep(ctx, chatId, session, '📱 Da dove arriva la prenotazione?', channelKeyboard());
}
async function onChannel(ctx, chatId, session, data) {
  if (session.step !== 'channel') return;
  const code = data.split(':')[1];
  session.draft.channel = code;
  session.step = 'contactName';
  await commitStep(ctx, chatId, session, '✍️ Scrivi nome e cognome dell\'ospite principale (rispondi con un messaggio):', null);
}

function bookingSummaryText(d) {
  const lines = [
    '📋 Riepilogo prenotazione:',
    d.roomLabel + ' — ' + isoToItalian(d.checkIn) + ' → ' + isoToItalian(d.checkOut),
    d.guests + ' ospiti, letto ' + (d.bedType === 'singolo' ? 'singolo' : 'matrimoniale'),
    d.cribCount ? 'Culla: sì' : 'Culla: no',
    d.extraBedCount ? 'Letto singolo aggiuntivo: sì' : 'Letto singolo aggiuntivo: no',
    'Canale: ' + (CHANNEL_LABELS[d.channel] || d.channel),
    d.name + ' — ' + d.email + (d.phone ? ' — ' + d.phone : ''),
    '',
    'Confermi?'
  ];
  return lines.join('\n');
}

async function handleWizardTextInput(ctx, chatId, session, text) {
  const step = session.step;
  if (step === 'contactName') {
    if (text.trim().length < 2) { await commitStep(ctx, chatId, session, '⚠️ Nome troppo corto, riscrivi nome e cognome:', null); return true; }
    session.draft.name = text.trim();
    session.step = 'contactEmail';
    await commitStep(ctx, chatId, session, '✉️ Scrivi l\'email dell\'ospite:', null);
    return true;
  }
  if (step === 'contactEmail') {
    const v = text.trim();
    if (v.indexOf('@') === -1 || v.indexOf('.') === -1) { await commitStep(ctx, chatId, session, '⚠️ Email non valida, riscrivila:', null); return true; }
    session.draft.email = v;
    session.step = 'contactPhone';
    await commitStep(ctx, chatId, session, '📞 Numero di telefono? (scrivi "-" se non lo hai)', null);
    return true;
  }
  if (step === 'contactPhone') {
    session.draft.phone = text.trim() === '-' ? '' : text.trim();
    session.step = 'confirmBooking';
    await commitStep(ctx, chatId, session, bookingSummaryText(session.draft), confirmBookingKeyboard());
    return true;
  }
  if (step === 'docConfirm' && session.awaitingFieldInput) {
    const field = session.awaitingFieldInput;
    const raw = text.trim();
    if (field === 'birthDate') {
      const iso = parseItalianDate(raw);
      if (!iso || iso >= todayIso()) { await commitStep(ctx, chatId, session, '⚠️ Data non valida: usa GG/MM/AAAA e assicurati che sia nel passato. Riprova:', null); return true; }
      session.docsGuestDraft.birthDate = iso;
    } else {
      if (!raw) { await commitStep(ctx, chatId, session, '⚠️ Campo vuoto, riscrivi ' + (FIELD_LABELS[field] || field) + ':', null); return true; }
      session.docsGuestDraft[field] = raw.slice(0, 100);
    }
    session.awaitingFieldInput = null;
    const card = docConfirmCard(session);
    await commitStep(ctx, chatId, session, card.text, card.keyboard);
    return true;
  }
  return false;
}

async function onConfirmBooking(ctx, chatId, session) {
  if (session.step !== 'confirmBooking') return;
  const d = session.draft;
  let result;
  try {
    result = await createBookingCore(ctx.admin, ctx.db, {
      roomId: d.roomId, checkIn: d.checkIn, checkOut: d.checkOut, guests: d.guests, exemptGuests: 0,
      name: d.name, email: d.email, phone: d.phone, source: 'telegram_wizard',
      bedType: d.bedType, cribCount: d.cribCount, extraBedCount: d.extraBedCount
    });
  } catch (err) {
    const msg = err.code === 'already-exists' ? 'Quelle date sono appena state occupate: scrivi di nuovo /nuova per riprovare.' : ('Errore: ' + err.message);
    await commitStep(ctx, chatId, session, '❌ ' + msg, { inline_keyboard: [] });
    await clearSession(ctx, chatId);
    return;
  }
  session.bookingId = result.id;
  session.guestFormToken = result.guestFormToken;
  session.docsGuestIndex = 0;
  session.confirmedGuests = [];
  session.step = 'docsOffer';
  const origin = 'https://lacasaceleste.it/affittacamere/';
  const link = origin + 'ospiti.html?booking=' + result.id + '&token=' + result.guestFormToken;
  const text = '✅ Prenotazione creata: ' + result.roomLabel + ' dal ' + isoToItalian(d.checkIn) + ' al ' + isoToItalian(d.checkOut) + ' (' + result.nights + ' notti).\nLink documenti da inoltrare all\'ospite:\n' + link + '\n\nVuoi caricare subito le foto documento degli ospiti?';
  await commitStep(ctx, chatId, session, text, docsOfferKeyboard());
}

async function onDocsOffer(ctx, chatId, session, data) {
  if (session.step !== 'docsOffer') return;
  if (data === 'docs:skip') {
    await tgEditMessageText(ctx, chatId, session.messageId, 'Va bene, il link per i documenti resta valido: potrai inviarlo o completare in dashboard quando vuoi.', { inline_keyboard: [] });
    await clearSession(ctx, chatId);
    return;
  }
  session.step = 'docCapture';
  const total = session.draft.guests;
  await commitStep(ctx, chatId, session, '📷 Invia la foto del documento dell\'ospite 1 di ' + total + ' (va bene anche solo il retro, se ha la banda MRZ).', null);
}

async function handlePhotoForDocCapture(ctx, chatId, session, msg) {
  const photos = msg.photo || [];
  if (!photos.length) return;
  const best = photos[photos.length - 1];
  const fileInfo = await tgGetFile(ctx, best.file_id);
  if (!fileInfo || !fileInfo.file_path) { await tgSendMessage(ctx, chatId, '⚠️ Non sono riuscito a scaricare la foto, riprova.'); return; }
  const buffer = await tgDownloadFile(ctx, fileInfo.file_path);
  const bookingId = session.bookingId;
  const idx = session.docsGuestIndex || 0;
  const path = 'tourism-guest-docs-tmp/' + bookingId + '/guest' + idx + '.jpg';
  await ctx.bucket.file(path).save(buffer, { contentType: 'image/jpeg' });

  let ocrText = null;
  try { ocrText = await visionDocumentText(ctx.visionApiKey, buffer); } catch (e) { console.error('Errore Vision API:', e.message); }
  const mrz = ocrText ? parseMrzFromText(ocrText) : null;

  session.docsGuestDraft = {
    firstName: mrz ? mrz.firstName : '', lastName: mrz ? mrz.lastName : '',
    birthDate: mrz ? mrz.birthDate : '', birthPlace: '', nationality: mrz ? mrz.nationality : '',
    docType: mrz ? mrz.docType : '', docNumber: mrz ? mrz.docNumber : '', docIssuePlace: '',
    docPhotoPath: path
  };
  session.awaitingFieldInput = null;
  session.step = 'docConfirm';

  const intro = mrz
    ? '📄 Ho letto automaticamente parte dei dati dal documento — verifica sempre prima di confermare (luogo di nascita e di rilascio non si leggono mai automaticamente):\n\n'
    : '📄 Non sono riuscito a leggere automaticamente il documento: inserisci i dati manualmente.\n\n';
  const card = docConfirmCard(session);
  await commitStep(ctx, chatId, session, intro + card.text, card.keyboard);
}

async function onDocFieldPick(ctx, chatId, session, data) {
  if (session.step !== 'docConfirm') return;
  const code = data.split(':')[2];
  if (code === 't') {
    await commitStep(ctx, chatId, session, 'Scegli il tipo di documento:', docTypeKeyboard());
    return;
  }
  const field = FIELD_CODES[code];
  if (!field) return;
  session.awaitingFieldInput = field;
  await commitStep(ctx, chatId, session, '✍️ Scrivi: ' + (FIELD_LABELS[field] || field), null);
}
async function onDocTypePick(ctx, chatId, session, data) {
  if (session.step !== 'docConfirm') return;
  const code = data.split(':')[1];
  const docType = DOC_TYPE_CODES[code];
  if (!docType) return;
  session.docsGuestDraft.docType = docType;
  const card = docConfirmCard(session);
  await commitStep(ctx, chatId, session, card.text, card.keyboard);
}
async function onDocRetry(ctx, chatId, session) {
  if (session.step !== 'docConfirm') return;
  const path = session.docsGuestDraft && session.docsGuestDraft.docPhotoPath;
  if (path) await ctx.bucket.file(path).delete().catch(() => {});
  session.docsGuestDraft = null;
  session.awaitingFieldInput = null;
  session.step = 'docCapture';
  const idx = (session.docsGuestIndex || 0) + 1;
  const total = session.draft.guests;
  await commitStep(ctx, chatId, session, '📷 Ok, rimanda la foto del documento dell\'ospite ' + idx + ' di ' + total + '.', null);
}

async function finalizeGuestDocuments(ctx, session) {
  const bookingId = session.bookingId;
  const guests = session.confirmedGuests;
  const movedGuests = await Promise.all(guests.map((g, i) => movePhotoToPermanent(ctx.bucket, bookingId, i, g)));
  await ctx.db.collection('tourism_guestDocuments').doc(bookingId).set({
    guests: movedGuests, submittedAt: ctx.admin.firestore.FieldValue.serverTimestamp()
  });
  const patch = { guestDocsComplete: true };
  const alreadyVerified = await findAlreadyVerifiedGuests(ctx.db, guests).catch(() => false);
  if (alreadyVerified) patch.identityVerified = { method: 'auto_returning', verifiedAt: ctx.admin.firestore.FieldValue.serverTimestamp() };
  await ctx.db.collection('tourism_bookings').doc(bookingId).update(patch);
}

async function onDocConfirm(ctx, chatId, session) {
  if (session.step !== 'docConfirm') return;
  const guest = session.docsGuestDraft;
  const err = validateGuest(guest);
  if (err) {
    const card = docConfirmCard(session);
    await commitStep(ctx, chatId, session, '⚠️ ' + err + '\n\n' + card.text, card.keyboard);
    return;
  }
  session.confirmedGuests = (session.confirmedGuests || []).concat([guest]);
  const nextIndex = (session.docsGuestIndex || 0) + 1;
  const totalGuests = session.draft.guests;
  if (nextIndex < totalGuests) {
    session.docsGuestIndex = nextIndex;
    session.docsGuestDraft = null;
    session.awaitingFieldInput = null;
    session.step = 'docCapture';
    await commitStep(ctx, chatId, session, '✅ Ospite ' + nextIndex + ' salvato.\n\n📷 Invia ora la foto del documento dell\'ospite ' + (nextIndex + 1) + ' di ' + totalGuests + '.', null);
    return;
  }
  await finalizeGuestDocuments(ctx, session);
  await tgEditMessageText(ctx, chatId, session.messageId, '✅ Documenti di tutti gli ospiti salvati correttamente.', { inline_keyboard: [] });
  await clearSession(ctx, chatId);
}

/* ==========================================================================
   Dispatcher principale — chiamato dalla Cloud Function onRequest.
   ========================================================================== */
async function routeCallback(ctx, chatId, session, data) {
  if (data.startsWith('rm:')) return onRoomPick(ctx, chatId, session, data.slice(3));
  if (data.startsWith('cal:')) return onCalendar(ctx, chatId, session, data);
  if (data.startsWith('gc:')) return onGuestCount(ctx, chatId, session, data);
  if (data.startsWith('bed:')) return onBedType(ctx, chatId, session, data);
  if (data.startsWith('crib:')) return onCrib(ctx, chatId, session, data);
  if (data.startsWith('xbed:')) return onExtraBed(ctx, chatId, session, data);
  if (data.startsWith('ch:')) return onChannel(ctx, chatId, session, data);
  if (data === 'confirm:booking') return onConfirmBooking(ctx, chatId, session);
  if (data.startsWith('docs:')) return onDocsOffer(ctx, chatId, session, data);
  if (data.startsWith('doc:field:')) return onDocFieldPick(ctx, chatId, session, data);
  if (data.startsWith('dt:')) return onDocTypePick(ctx, chatId, session, data);
  if (data === 'doc:confirm') return onDocConfirm(ctx, chatId, session);
  if (data === 'doc:retry') return onDocRetry(ctx, chatId, session);
}

async function handleCallbackQuery(ctx, cq) {
  if (!cq.message || !cq.message.chat) return;
  const chatId = String(cq.message.chat.id);
  const data = cq.data || '';
  const authorized = await isAuthorized(ctx, chatId);
  if (!authorized) { await tgAnswerCallbackQuery(ctx, cq.id, 'Non autorizzato'); return; }
  if (data === 'noop') { await tgAnswerCallbackQuery(ctx, cq.id); return; }
  if (data === 'cancel') {
    await tgAnswerCallbackQuery(ctx, cq.id, 'Annullato');
    await tgEditMessageText(ctx, chatId, cq.message.message_id, '❌ Operazione annullata.', { inline_keyboard: [] });
    await clearSession(ctx, chatId);
    return;
  }
  const session = await getSession(ctx, chatId);
  if (!session) { await tgAnswerCallbackQuery(ctx, cq.id, 'Sessione scaduta, scrivi di nuovo /nuova'); return; }
  session.messageId = cq.message.message_id;
  await tgAnswerCallbackQuery(ctx, cq.id);
  await routeCallback(ctx, chatId, session, data);
}

async function handleMessage(ctx, msg) {
  if (!msg.chat) return;
  const chatId = String(msg.chat.id);
  const authorized = await isAuthorized(ctx, chatId);
  const text = (msg.text || '').trim();
  const lower = text.toLowerCase();

  if (lower === '/start' || lower === '/aiuto' || lower === '/help') {
    await tgSendMessage(ctx, chatId, helpText(authorized, chatId));
    return;
  }
  if (lower === '/annulla') {
    await clearSession(ctx, chatId);
    await tgSendMessage(ctx, chatId, authorized ? 'Operazione annullata.' : unauthorizedText(chatId));
    return;
  }
  if (lower === '/nuova' || lower.startsWith('/nuova ')) {
    if (!authorized) { await tgSendMessage(ctx, chatId, unauthorizedText(chatId)); return; }
    const parts = text.split(/\s+/);
    if (parts.length > 1) { await handleLegacyNuovaCommand(ctx, chatId, text); return; }
    await startWizard(ctx, chatId);
    return;
  }

  const session = await getSession(ctx, chatId);
  if (session && authorized) {
    if (msg.photo && session.step === 'docCapture') { await handlePhotoForDocCapture(ctx, chatId, session, msg); return; }
    if (text) { const handled = await handleWizardTextInput(ctx, chatId, session, text); if (handled) return; }
  }

  if (!authorized) { await tgSendMessage(ctx, chatId, unauthorizedText(chatId)); return; }
  await tgSendMessage(ctx, chatId, 'Comando non riconosciuto. Scrivi /aiuto per le istruzioni, o /nuova per registrare una prenotazione.');
}

// `ctx` = { admin, db, bucket, botToken, visionApiKey }
async function handleTelegramUpdate(ctx, update) {
  try {
    if (update.callback_query) { await handleCallbackQuery(ctx, update.callback_query); return; }
    if (update.message) { await handleMessage(ctx, update.message); return; }
  } catch (err) {
    console.error('Errore gestione update Telegram:', err);
  }
}

module.exports = { handleTelegramUpdate };
