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
const { validateGuest, movePhotoToPermanent, visionDocumentText } = require('./guest-documents');
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
// Stessa condizione di sovrapposizione di functions/booking-logic.js
// (rangesOverlap) — serve perché un giorno di check-out non bloccato di
// per sé può comunque "scavalcare" un intervallo occupato nel mezzo.
function rangeOverlapsBlocked(ranges, checkIn, checkOut) {
  return (ranges || []).some((r) => checkIn < r.end && r.start < checkOut);
}
function nightsBetween(checkIn, checkOut) {
  return Math.round((new Date(checkOut + 'T00:00:00Z') - new Date(checkIn + 'T00:00:00Z')) / 86400000);
}

/* ==========================================================================
   Modello ospiti per fascia d'età — IDENTICO a affittacamere/js/app.js
   (countedGuests/taxablePersons/CHILD_ROOM_COUNT_MIN_AGE/CHILD_TAX_MIN_AGE):
   i bambini sotto i 3 anni non contano mai nel limite stanza (rientrano
   anche senza letto extra, con o senza culla), quelli sotto i 12 sono
   esenti dalla tassa di soggiorno. Il letto singolo aggiuntivo alza il
   limite della stanza di 1 posto — stessa regola in functions/booking-logic.js.
   ========================================================================== */
const CHILD_ROOM_COUNT_MIN_AGE = 3;
const CHILD_TAX_MIN_AGE = 12;
function countedGuests(adults, childAges) {
  return adults + childAges.filter((age) => age >= CHILD_ROOM_COUNT_MIN_AGE).length;
}
function taxablePersons(adults, childAges) {
  return adults + childAges.filter((age) => age >= CHILD_TAX_MIN_AGE).length;
}
function effectiveMaxGuests(draft) {
  return (draft.maxGuests || 1) + (draft.extraBedCount ? 1 : 0);
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
// /pulizie e /manutenzione servono anche a chi fa le pulizie, elencato in
// settings.cleaningRecipients — una lista DIVERSA da bookingCommandAuthorized
// (chi crea prenotazioni). Autorizzato chi è in uno dei due elenchi.
async function isAuthorizedForCleaning(ctx, chatId) {
  const snap = await ctx.db.collection('tourism_settings').doc('site').get();
  const settings = snap.exists ? snap.data() : {};
  const list = (settings.cleaningRecipients || []).filter((r) => r.enabled && r.chatId).map((r) => String(r.chatId));
  return list.indexOf(String(chatId)) !== -1;
}
function unauthorizedText(chatId) {
  return 'Non sei autorizzato a creare prenotazioni da qui (chat-id: ' + chatId + '). Chiedi al proprietario di aggiungerti da dashboard.html → Impostazioni, oppure scrivi /aiuto.';
}
function helpText(authorized, chatId, siteName) {
  return [
    '👋 Ciao! Sono il bot di ' + (siteName || 'Casa Celeste') + '.',
    '',
    'Cosa faccio automaticamente, se sei autorizzato:',
    '• ti avviso appena arriva una nuova prenotazione dal sito;',
    '• ti avviso la sera prima e la mattina del check-out quando c\'è da fare le pulizie;',
    '• ti avviso se qualcosa richiede attenzione (email in esaurimento, invii falliti).',
    '',
    'Comandi che puoi usare, se sei autorizzato:',
    '/nuova → avvia la compilazione guidata passo-passo (stanza, calendario, ospiti, opzioni, contatti, foto documenti con lettura automatica da confermare).',
    '/nuova <Stanza> <check-in GG/MM/AAAA> <check-out GG/MM/AAAA> <Nome Cognome> <email> <telefono> <ospiti> [canale] → formato veloce su una riga, invariato.',
    '/pulizie → segna lo stato pulizie di una stanza (pronta/sporca/in pulizia/da ispezionare). Anche per chi è solo nell\'elenco pulizie, non serve essere autorizzato a creare prenotazioni.',
    '/manutenzione → registra un problema/lavoro da fare su una stanza, bloccando le date scelte (non prenotabili finché non la risolvi).',
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
    const result = await createBookingCore(ctx.admin, ctx.db, null, {
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
function roomsKeyboard(rooms, prefix) {
  const p = prefix || 'rm:';
  const rows = rooms.map((r) => [{ text: r.name || r.id, callback_data: p + r.id }]);
  rows.push([{ text: '❌ Annulla', callback_data: 'cancel' }]);
  return { inline_keyboard: rows };
}
// Un solo calendario per check-in E check-out, esattamente come sul sito
// pubblico (affittacamere/js/app.js, pickDate/calendarStepHtml): il primo
// giorno toccato è il check-in, il secondo (successivo) è il check-out;
// toccare un giorno prima o uguale al check-in già scelto lo sposta lì
// (ricomincia la selezione) invece di dare errore.
function datesCalendarKeyboard(year, month, session) {
  const draft = session.draft;
  const today = todayIso();
  const rows = [];
  const prev = addMonths(year, month, -1);
  const next = addMonths(year, month, 1);
  rows.push([
    { text: '«', callback_data: 'cal:nav:' + prev.y + '-' + pad2(prev.m) },
    { text: MONTH_NAMES[month] + ' ' + year, callback_data: 'noop' },
    { text: '»', callback_data: 'cal:nav:' + next.y + '-' + pad2(next.m) }
  ]);
  rows.push(WEEKDAY_HEADERS.map((w) => ({ text: w, callback_data: 'noop' })));

  const total = daysInMonth(year, month);
  const leading = firstWeekdayMon0(year, month);
  let cells = [];
  for (let i = 0; i < leading; i++) cells.push({ text: ' ', callback_data: 'noop' });
  for (let d = 1; d <= total; d++) {
    const iso = isoFromParts(year, month, d);
    const disabled = iso < today || rangeContainsDay(draft.blockedRanges, iso);
    const isStart = draft.checkIn === iso;
    const isEnd = draft.checkOut === iso;
    const inRange = draft.checkIn && draft.checkOut && iso > draft.checkIn && iso < draft.checkOut;
    let label = String(d);
    if (disabled) label = '·';
    else if (isStart) label = '🔵' + d;
    else if (isEnd) label = '🔴' + d;
    else if (inRange) label = '-' + d + '-';
    cells.push({ text: label, callback_data: disabled ? 'noop' : 'cal:day:' + iso });
  }
  while (cells.length % 7 !== 0) cells.push({ text: ' ', callback_data: 'noop' });
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  rows.push([{ text: '❌ Annulla', callback_data: 'cancel' }]);
  return { inline_keyboard: rows };
}
function adultsKeyboard(effectiveMax) {
  const row = [];
  for (let n = 1; n <= Math.max(1, effectiveMax); n++) row.push({ text: String(n) + (n === 1 ? ' adulto' : ' adulti'), callback_data: 'ga:' + n });
  return { inline_keyboard: [row, [{ text: '❌ Annulla', callback_data: 'cancel' }]] };
}
// I bambini sotto i 3 anni non contano nel limite stanza, quindi il numero
// di bottoni non dipende strettamente dai posti rimasti — 0..3 copre
// qualunque caso realistico per una stanza di questa dimensione.
function childrenCountKeyboard() {
  const row = [0, 1, 2, 3].map((n) => ({ text: String(n), callback_data: 'gcc:' + n }));
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
function confirmMaintenanceKeyboard() {
  return { inline_keyboard: [[{ text: '✅ Conferma manutenzione', callback_data: 'confirm:maintenance' }], [{ text: '❌ Annulla', callback_data: 'cancel' }]] };
}
// Categoria della segnalazione — richiesta esplicitamente (2026-08-01) per
// distinguere furti/danni da normali interventi di manutenzione, sia in
// dashboard sia nella notifica Telegram al proprietario (vedi
// notifyOwnerMaintenanceReport). MAINTENANCE_CATEGORY_LABELS duplica lo
// stesso elenco presente in affittacamere/js/dashboard.js: bot e dashboard
// sono due pacchetti Node/browser separati, nessun modo semplice di
// condividere costanti (stesso motivo già documentato per CLEANING_STATUS_LABELS
// e i template email in guest-notify.js).
const MAINTENANCE_CATEGORY_LABELS = { furto: '🚨 Furto', danno: '🔨 Danno o rottura', manutenzione: '🔧 Manutenzione generica' };
const MAINTENANCE_CATEGORY_PROMPTS = {
  furto: '🚨 Furto — descrivi cosa è stato rubato:',
  danno: '🔨 Danno o rottura — descrivi cosa si è rotto:',
  manutenzione: '🔧 Manutenzione — descrivi cosa c\'è da fare:'
};
function maintenanceCategoryKeyboard() {
  return {
    inline_keyboard: [
      [{ text: MAINTENANCE_CATEGORY_LABELS.furto, callback_data: 'maintcat:furto' }],
      [{ text: MAINTENANCE_CATEGORY_LABELS.danno, callback_data: 'maintcat:danno' }],
      [{ text: MAINTENANCE_CATEGORY_LABELS.manutenzione, callback_data: 'maintcat:manutenzione' }],
      [{ text: '❌ Annulla', callback_data: 'cancel' }]
    ]
  };
}
// /pulizie — nessuna sessione: tutto lo stato serve nel callback_data
// stesso (roomId + stato), due tap in croce.
const CLEANING_STATUS_LABELS = { pronta: '🟢 Pronta', sporca: '🔴 Sporca', in_pulizia: '🟡 In pulizia', da_ispezionare: '🔵 Da ispezionare' };
function cleaningStatusKeyboard(roomId) {
  return {
    inline_keyboard: [
      [{ text: '🟢 Pronta', callback_data: 'clns:' + roomId + ':pronta' }, { text: '🔴 Sporca', callback_data: 'clns:' + roomId + ':sporca' }],
      [{ text: '🟡 In pulizia', callback_data: 'clns:' + roomId + ':in_pulizia' }, { text: '🔵 Da ispezionare', callback_data: 'clns:' + roomId + ':da_ispezionare' }],
      [{ text: '❌ Annulla', callback_data: 'cancel' }]
    ]
  };
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
/* ==========================================================================
   Wizard — passi.
   ========================================================================== */
async function startWizard(ctx, chatId) {
  const snap = await ctx.db.collection('tourism_rooms').get();
  const rooms = [];
  snap.forEach((d) => rooms.push(Object.assign({ id: d.id }, d.data())));
  if (!rooms.length) { await tgSendMessage(ctx, chatId, 'Nessuna stanza trovata.'); return; }
  const session = { mode: 'booking', step: 'room', draft: {}, messageId: null };
  await commitStep(ctx, chatId, session, '🏠 Quale stanza?', roomsKeyboard(rooms));
}
// /manutenzione — riusa lo STESSO meccanismo di sessione/wizard di /nuova
// (stanza poi calendario), ma con `session.mode` a 'maintenance': onRoomPick
// e onCalendar leggono questo campo per saltare i passi specifici delle
// prenotazioni (ospiti, canale, contatti) e andare dritti al titolo.
async function startMaintenanceWizard(ctx, chatId) {
  const snap = await ctx.db.collection('tourism_rooms').get();
  const rooms = [];
  snap.forEach((d) => rooms.push(Object.assign({ id: d.id }, d.data())));
  if (!rooms.length) { await tgSendMessage(ctx, chatId, 'Nessuna stanza trovata.'); return; }
  const session = { mode: 'maintenance', step: 'room', draft: {}, messageId: null };
  await commitStep(ctx, chatId, session, '🔧 Manutenzione — quale stanza?', roomsKeyboard(rooms));
}
async function startCleaningStatusPick(ctx, chatId) {
  const snap = await ctx.db.collection('tourism_rooms').get();
  const rooms = [];
  snap.forEach((d) => rooms.push(Object.assign({ id: d.id }, d.data())));
  if (!rooms.length) { await tgSendMessage(ctx, chatId, 'Nessuna stanza trovata.'); return; }
  await tgSendMessage(ctx, chatId, '🧹 Quale stanza?', roomsKeyboard(rooms, 'cln:'));
}

function datesPromptText(session, errorText) {
  const d = session.draft;
  const lines = ['📅 ' + d.roomLabel + ' — tocca il check-in, poi il check-out (come sul sito):'];
  if (errorText) lines.push('⚠️ ' + errorText);
  lines.push('Check-in: ' + (d.checkIn ? isoToItalian(d.checkIn) : '—') + '   Check-out: ' + (d.checkOut ? isoToItalian(d.checkOut) : '—'));
  return lines.join('\n');
}

async function onRoomPick(ctx, chatId, session, roomId) {
  if (session.step !== 'room') return;
  const snap = await ctx.db.collection('tourism_rooms').doc(roomId).get();
  if (!snap.exists) { await tgSendMessage(ctx, chatId, 'Stanza non trovata, riprova con /nuova.'); await clearSession(ctx, chatId); return; }
  const room = snap.data();
  session.draft.roomId = roomId;
  session.draft.roomLabel = room.name || roomId;
  session.draft.blockedRanges = room.blockedRanges || [];
  session.draft.checkIn = null;
  session.draft.checkOut = null;
  // Una manutenzione non ha un minimo notti legato alla tariffa stanza
  // (quello vale solo per le prenotazioni paganti): sempre 1.
  if (session.mode === 'maintenance') {
    session.draft.minNights = 1;
  } else {
    session.draft.maxGuests = room.maxGuests || 1;
    session.draft.minNights = room.minNights || 1;
  }
  session.step = 'dates';
  const today = todayIso();
  const y = Number(today.slice(0, 4)), m = Number(today.slice(5, 7));
  session.calendarCursor = { y: y, m: m };
  await commitStep(ctx, chatId, session, datesPromptText(session), datesCalendarKeyboard(y, m, session));
}

async function onCalendar(ctx, chatId, session, data) {
  if (session.step !== 'dates') return;
  const parts = data.split(':'); // cal:nav:YYYY-MM oppure cal:day:YYYY-MM-DD
  const action = parts[1], value = parts[2];

  if (action === 'nav') {
    const [y, m] = value.split('-').map(Number);
    session.calendarCursor = { y: y, m: m };
    await commitStep(ctx, chatId, session, datesPromptText(session), datesCalendarKeyboard(y, m, session));
    return;
  }

  if (action === 'day') {
    const d = session.draft;
    // Stessa logica del calendario sul sito pubblico (app.js pickDate): il
    // primo tocco (o un tocco dopo che entrambe le date erano già scelte)
    // è il check-in; un tocco su/prima del check-in lo sposta lì
    // (ricomincia la selezione); altrimenti è il check-out.
    if (!d.checkIn || (d.checkIn && d.checkOut)) {
      d.checkIn = value; d.checkOut = null;
      const y = Number(value.slice(0, 4)), m = Number(value.slice(5, 7));
      session.calendarCursor = { y: y, m: m };
      await commitStep(ctx, chatId, session, datesPromptText(session), datesCalendarKeyboard(y, m, session));
      return;
    }
    if (value <= d.checkIn) {
      d.checkIn = value; d.checkOut = null;
      await commitStep(ctx, chatId, session, datesPromptText(session), datesCalendarKeyboard(session.calendarCursor.y, session.calendarCursor.m, session));
      return;
    }
    if (nightsBetween(d.checkIn, value) < d.minNights) {
      await commitStep(ctx, chatId, session, datesPromptText(session, 'Soggiorno troppo corto (minimo ' + d.minNights + ' nott' + (d.minNights === 1 ? 'e' : 'i') + ').'), datesCalendarKeyboard(session.calendarCursor.y, session.calendarCursor.m, session));
      return;
    }
    if (rangeOverlapsBlocked(d.blockedRanges, d.checkIn, value)) {
      await commitStep(ctx, chatId, session, datesPromptText(session, 'In quell\'intervallo ci sono notti già occupate.'), datesCalendarKeyboard(session.calendarCursor.y, session.calendarCursor.m, session));
      return;
    }
    d.checkOut = value;
    if (session.mode === 'maintenance') {
      session.step = 'maintCategory';
      await commitStep(ctx, chatId, session, '🔧 ' + isoToItalian(d.checkIn) + ' → ' + isoToItalian(value) + '\nChe tipo di segnalazione è?', maintenanceCategoryKeyboard());
      return;
    }
    // Le Opzioni (letto/culla/letto extra) vengono chieste PRIMA degli
    // ospiti, come sul sito (dove si scelgono nella pagina stanza prima del
    // calendario): serve sapere se c'è il letto extra per calcolare il
    // limite ospiti effettivo nel passo successivo.
    session.step = 'bedType';
    await commitStep(ctx, chatId, session, '📅 ' + isoToItalian(d.checkIn) + ' → ' + isoToItalian(value) + '\n🛏️ Che tipo di letto?', bedTypeKeyboard());
  }
}

async function onMaintenanceCategoryPick(ctx, chatId, session, data) {
  if (session.step !== 'maintCategory') return;
  const category = data.split(':')[1];
  if (!MAINTENANCE_CATEGORY_PROMPTS[category]) return;
  session.draft.category = category;
  session.step = 'maintTitle';
  await commitStep(ctx, chatId, session, MAINTENANCE_CATEGORY_PROMPTS[category], null);
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
  await commitStep(ctx, chatId, session, '🛏️ Serve un letto singolo aggiuntivo? (alza di 1 il limite ospiti della stanza — i neonati sotto i 3 anni non ne hanno comunque mai bisogno)', extraBedKeyboard());
}
async function onExtraBed(ctx, chatId, session, data) {
  if (session.step !== 'extraBed') return;
  session.draft.extraBedCount = Number(data.split(':')[1]);
  session.draft.childAges = [];
  session.guestsChildIndex = 0;
  session.step = 'guestsAdults';
  const max = effectiveMaxGuests(session.draft);
  await commitStep(ctx, chatId, session, '👥 Quanti adulti (18+)? (limite stanza: ' + max + ')', adultsKeyboard(max));
}

async function onAdultsPick(ctx, chatId, session, data) {
  if (session.step !== 'guestsAdults') return;
  session.draft.adults = Number(data.split(':')[1]);
  session.step = 'guestsChildrenCount';
  await commitStep(ctx, chatId, session, '👶 Quanti bambini/ragazzi (0-17 anni) oltre agli adulti? (i minori di 3 anni non contano nel limite stanza)', childrenCountKeyboard());
}

function childAgePromptText(session, errorText) {
  const idx = (session.guestsChildIndex || 0) + 1;
  const total = session.draft.childrenCount;
  const lines = [];
  if (errorText) lines.push('⚠️ ' + errorText);
  lines.push('✍️ Età del bambino/ragazzo ' + idx + ' di ' + total + ' (scrivi un numero da 0 a 17):');
  return lines.join('\n');
}

async function onChildrenCountPick(ctx, chatId, session, data) {
  if (session.step !== 'guestsChildrenCount') return;
  const n = Number(data.split(':')[1]);
  session.draft.childrenCount = n;
  session.draft.childAges = [];
  session.guestsChildIndex = 0;
  if (n === 0) { await finalizeGuestsCount(ctx, chatId, session); return; }
  session.step = 'guestsChildAge';
  await commitStep(ctx, chatId, session, childAgePromptText(session), null);
}

// Calcola ospiti/esenti dal modello adulti+età bambini (countedGuests/
// taxablePersons, identico al sito) e passa al canale — se il totale supera
// il limite effettivo della stanza, spiega perché e fa rifare le età da
// capo invece di bloccare senza spiegazione.
async function finalizeGuestsCount(ctx, chatId, session) {
  const d = session.draft;
  const counted = countedGuests(d.adults, d.childAges);
  const max = effectiveMaxGuests(d);
  if (counted > max) {
    session.draft.childAges = [];
    session.guestsChildIndex = 0;
    session.step = d.childrenCount > 0 ? 'guestsChildAge' : 'guestsChildrenCount';
    const msg = 'Con queste età si contano ' + counted + ' ospiti nel limite stanza (i minori di 3 anni non contano), ma il massimo qui è ' + max +
      (d.extraBedCount ? '' : ' — puoi tornare indietro con /annulla e riprovare aggiungendo il letto singolo aggiuntivo, oppure') + '. Reinserisci le età:';
    if (d.childrenCount > 0) { await commitStep(ctx, chatId, session, childAgePromptText(session, msg), null); return; }
    await commitStep(ctx, chatId, session, '⚠️ ' + msg, childrenCountKeyboard());
    return;
  }
  d.guests = counted;
  d.exemptGuests = counted - taxablePersons(d.adults, d.childAges);
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

function guestsSummaryLine(d) {
  const childAges = d.childAges || [];
  const parts = [d.adults + (d.adults === 1 ? ' adulto' : ' adulti')];
  if (childAges.length) parts.push(childAges.length + (childAges.length === 1 ? ' bambino/ragazzo' : ' bambini/ragazzi') + ' (' + childAges.join(', ') + ' anni)');
  return parts.join(' + ') + ' — ' + d.guests + ' nel limite stanza, ' + d.exemptGuests + ' esenti tassa (under 12)';
}

// Dettaglio prezzo autoritativo già calcolato da createBookingCore
// (functions/booking-logic.js) — qui solo formattato, nessun ricalcolo.
function pricingSummaryText(result) {
  const p = result.pricing || {};
  const tax = result.touristTax || {};
  const lines = ['💶 Stanza: €' + (p.roomTotal || 0).toFixed(2)];
  if (tax.totalDue) {
    lines.push('Tassa di soggiorno: €' + tax.totalDue.toFixed(2) + ' (€' + tax.perNight + ' a persona a notte, ' + tax.exemptGuests + ' esenti under-12)');
  }
  if (p.crib && p.crib.total) lines.push('Culla: €' + p.crib.total.toFixed(2));
  if (p.extraBed && p.extraBed.total) lines.push('Letto singolo aggiuntivo: €' + p.extraBed.total.toFixed(2));
  lines.push('Totale: €' + (p.total || 0).toFixed(2));
  return lines.join('\n');
}

function bookingSummaryText(d) {
  const lines = [
    '📋 Riepilogo prenotazione:',
    d.roomLabel + ' — ' + isoToItalian(d.checkIn) + ' → ' + isoToItalian(d.checkOut),
    guestsSummaryLine(d),
    'Letto ' + (d.bedType === 'singolo' ? 'singolo' : 'matrimoniale'),
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
  if (step === 'maintTitle') {
    if (text.trim().length < 2) { await commitStep(ctx, chatId, session, '⚠️ Scrivi una breve descrizione (almeno qualche parola):', null); return true; }
    session.draft.title = text.trim().slice(0, 200);
    session.step = 'maintConfirm';
    const d = session.draft;
    const summary = '🔧 Riepilogo manutenzione:\n' + d.roomLabel + ' — ' + isoToItalian(d.checkIn) + ' → ' + isoToItalian(d.checkOut) + '\n' +
      MAINTENANCE_CATEGORY_LABELS[d.category] + '\n' + d.title +
      '\n\nConfermi? Le date verranno bloccate su questa stanza (non prenotabili finché non risolvi la manutenzione da dashboard.html → Stanze).';
    await commitStep(ctx, chatId, session, summary, confirmMaintenanceKeyboard());
    return true;
  }
  if (step === 'guestsChildAge') {
    const raw = text.trim();
    const age = Number(raw);
    if (!/^\d+$/.test(raw) || age < 0 || age > 17) {
      await commitStep(ctx, chatId, session, childAgePromptText(session, 'Età non valida: scrivi un numero da 0 a 17.'), null);
      return true;
    }
    session.draft.childAges.push(age);
    session.guestsChildIndex = (session.guestsChildIndex || 0) + 1;
    if (session.guestsChildIndex < session.draft.childrenCount) {
      await commitStep(ctx, chatId, session, childAgePromptText(session), null);
      return true;
    }
    await finalizeGuestsCount(ctx, chatId, session);
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
    result = await createBookingCore(ctx.admin, ctx.db, null, {
      roomId: d.roomId, checkIn: d.checkIn, checkOut: d.checkOut, guests: d.guests, exemptGuests: d.exemptGuests,
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
  const text = '✅ Prenotazione creata: ' + result.roomLabel + ' dal ' + isoToItalian(d.checkIn) + ' al ' + isoToItalian(d.checkOut) + ' (' + result.nights + ' notti).\n' +
    pricingSummaryText(result) + '\nLink documenti da inoltrare all\'ospite:\n' + link + '\n\nVuoi caricare subito le foto documento degli ospiti?';
  await commitStep(ctx, chatId, session, text, docsOfferKeyboard());
}

// Stessa logica di createMaintenance in affittacamere/js/firebase-init.js
// (crea il documento E blocca le date sulla stanza), qui in una transazione
// Admin SDK invece che client — rifiuta se nel frattempo quelle notti sono
// state occupate da un'altra prenotazione/manutenzione.
async function onConfirmMaintenance(ctx, chatId, session) {
  if (session.step !== 'maintConfirm') return;
  const d = session.draft;
  const maintRef = ctx.db.collection('tourism_maintenance').doc();
  try {
    await ctx.db.runTransaction(async (tx) => {
      const roomRef = ctx.db.collection('tourism_rooms').doc(d.roomId);
      const roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists) throw new Error('Stanza non trovata.');
      const room = roomSnap.data();
      const ranges = (room.blockedRanges || []).slice();
      if (rangeOverlapsBlocked(ranges, d.checkIn, d.checkOut)) throw new Error('Quelle date sono appena state occupate.');
      ranges.push({ start: d.checkIn, end: d.checkOut, source: 'maintenance', maintenanceId: maintRef.id });
      tx.set(maintRef, {
        roomId: d.roomId, roomLabel: d.roomLabel, title: d.title, category: d.category, description: '', status: 'aperta',
        start: d.checkIn, end: d.checkOut, createdBy: { type: 'telegram', chatId: chatId },
        createdAt: ctx.admin.firestore.FieldValue.serverTimestamp(), updatedAt: ctx.admin.firestore.FieldValue.serverTimestamp()
      });
      tx.update(roomRef, { blockedRanges: ranges });
    });
    await tgEditMessageText(ctx, chatId, session.messageId, '✅ Manutenzione registrata: ' + d.roomLabel + ' dal ' + isoToItalian(d.checkIn) + ' al ' + isoToItalian(d.checkOut) + '. Date bloccate.', { inline_keyboard: [] });
    await notifyOwnerMaintenanceReport(ctx, { roomLabel: d.roomLabel, category: d.category, title: d.title, start: d.checkIn, end: d.checkOut, createdBy: { type: 'telegram' } });
  } catch (err) {
    await tgEditMessageText(ctx, chatId, session.messageId, '❌ Errore: ' + err.message, { inline_keyboard: [] });
  }
  await clearSession(ctx, chatId);
}

// Notifica il proprietario (stessa lista bookingCommandAuthorized già usata
// per nuove prenotazioni/messaggi di assistenza, vedi notifyOwnerNewBooking
// in functions/index.js) di una nuova segnalazione manutenzione — sia dal
// bot sia dalla dashboard limitata del personale (functions/staff-actions.js),
// che importa questa stessa funzione invece di duplicarla: sono nello
// stesso pacchetto functions/, a differenza di scripts/ (vedi nota duplicazione
// helper in guest-notify.js, lì sì necessaria per un vincolo di deploy).
// Best-effort: un errore qui non deve mai far fallire la registrazione
// della manutenzione, che a quel punto è già stata salvata.
async function notifyOwnerMaintenanceReport(ctx, m) {
  if (!ctx.botToken) return;
  try {
    const settingsSnap = await ctx.db.collection('tourism_settings').doc('site').get();
    const recipients = ((settingsSnap.exists ? settingsSnap.data() : {}).bookingCommandAuthorized || [])
      .filter((r) => r.enabled && r.chatId);
    if (!recipients.length) return;
    const emoji = m.category === 'furto' ? '🚨' : '🔧';
    const sourceLabel = m.createdBy && m.createdBy.type === 'staff_dashboard' ? 'dashboard pulizie' : 'bot Telegram';
    const text = emoji + ' Nuova segnalazione — ' + (MAINTENANCE_CATEGORY_LABELS[m.category] || 'Manutenzione') + '\n' +
      m.roomLabel + ' — ' + isoToItalian(m.start) + ' → ' + isoToItalian(m.end) + '\n' +
      m.title + '\nSegnalato da: ' + sourceLabel + '\nVedi dashboard.html → Stanze per i dettagli.';
    await Promise.all(recipients.map((r) => fetch('https://api.telegram.org/bot' + ctx.botToken + '/sendMessage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: r.chatId, text: text })
    }).catch(() => {})));
  } catch (e) {
    // best-effort, vedi commento sopra
  }
}

/* ==========================================================================
   /pulizie — nessuna sessione: stanza poi stato, due tap, tutto lo stato
   nel callback_data stesso.
   ========================================================================== */
async function onCleaningRoomPick(ctx, chatId, cq, roomId) {
  const snap = await ctx.db.collection('tourism_rooms').doc(roomId).get();
  if (!snap.exists) { await tgEditMessageText(ctx, chatId, cq.message.message_id, 'Stanza non trovata.', { inline_keyboard: [] }); return; }
  const room = snap.data();
  await tgEditMessageText(ctx, chatId, cq.message.message_id, '🧹 ' + (room.name || roomId) + ' — che stato ha?', cleaningStatusKeyboard(roomId));
}
async function onCleaningStatusPick(ctx, chatId, cq, data) {
  const parts = data.split(':'); // clns:roomId:status
  const roomId = parts[1], status = parts[2];
  if (!CLEANING_STATUS_LABELS[status]) return;
  await ctx.db.collection('tourism_rooms').doc(roomId).update({
    cleaningStatus: status,
    cleaningStatusUpdatedAt: ctx.admin.firestore.FieldValue.serverTimestamp(),
    cleaningStatusUpdatedBy: { type: 'telegram', chatId: chatId }
  });
  await tgEditMessageText(ctx, chatId, cq.message.message_id, '✅ Stato aggiornato: ' + CLEANING_STATUS_LABELS[status] + '.', { inline_keyboard: [] });
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
  const bookingId = session.bookingId;
  const idx = session.docsGuestIndex || 0;
  const path = 'tourism-guest-docs-tmp/' + bookingId + '/guest' + idx + '.jpg';
  // Senza questo try/catch, un fallimento di rete verso Telegram o di quota
  // Storage risaliva silenziosamente fino al catch generico dell'update
  // (solo un console.error): il proprietario restava senza risposta, senza
  // sapere se rimandare la foto.
  let buffer;
  try {
    buffer = await tgDownloadFile(ctx, fileInfo.file_path);
    await ctx.bucket.file(path).save(buffer, { contentType: 'image/jpeg' });
  } catch (e) {
    console.error('Errore download/salvataggio foto documento:', e.message);
    await tgSendMessage(ctx, chatId, '⚠️ Errore nel salvare la foto, riprova a inviarla.');
    return;
  }

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
  // Nessuno skip: la legge impone di verificare l'identità a ogni NUOVA
  // prenotazione, anche per un ospite già soggiornato in passato (vedi
  // guest-verification.js) — identityVerified si imposta solo a mano dal
  // proprietario (markIdentityVerified) dopo la videochiamata/videocitofono.
  await ctx.db.collection('tourism_bookings').doc(bookingId).update({ guestDocsComplete: true });
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
  if (data.startsWith('maintcat:')) return onMaintenanceCategoryPick(ctx, chatId, session, data);
  if (data.startsWith('bed:')) return onBedType(ctx, chatId, session, data);
  if (data.startsWith('crib:')) return onCrib(ctx, chatId, session, data);
  if (data.startsWith('xbed:')) return onExtraBed(ctx, chatId, session, data);
  if (data.startsWith('ga:')) return onAdultsPick(ctx, chatId, session, data);
  if (data.startsWith('gcc:')) return onChildrenCountPick(ctx, chatId, session, data);
  if (data.startsWith('ch:')) return onChannel(ctx, chatId, session, data);
  if (data === 'confirm:booking') return onConfirmBooking(ctx, chatId, session);
  if (data === 'confirm:maintenance') return onConfirmMaintenance(ctx, chatId, session);
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
  // Un solo controllo per tutti i flussi bottone (prenotazioni, pulizie,
  // manutenzioni): chi è SOLO nell'elenco pulizie non può avviare /nuova
  // (quel gate resta più stretto in handleMessage), ma può rispondere ai
  // bottoni di una sessione — che esiste solo se è stata creata da
  // un'azione già autorizzata a monte, quindi allargare qui non apre nulla
  // di nuovo.
  const authorized = await isAuthorized(ctx, chatId);
  const allowed = authorized || await isAuthorizedForCleaning(ctx, chatId);
  if (!allowed) { await tgAnswerCallbackQuery(ctx, cq.id, 'Non autorizzato'); return; }
  if (data === 'noop') { await tgAnswerCallbackQuery(ctx, cq.id); return; }
  if (data === 'cancel') {
    await tgAnswerCallbackQuery(ctx, cq.id, 'Annullato');
    await tgEditMessageText(ctx, chatId, cq.message.message_id, '❌ Operazione annullata.', { inline_keyboard: [] });
    await clearSession(ctx, chatId);
    return;
  }
  if (data.startsWith('cln:') || data.startsWith('clns:')) {
    await tgAnswerCallbackQuery(ctx, cq.id);
    if (data.startsWith('clns:')) await onCleaningStatusPick(ctx, chatId, cq, data);
    else await onCleaningRoomPick(ctx, chatId, cq, data.slice(4));
    return;
  }
  const session = await getSession(ctx, chatId);
  if (!session) { await tgAnswerCallbackQuery(ctx, cq.id, 'Sessione scaduta, scrivi di nuovo /nuova o /manutenzione'); return; }
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
    const settingsSnap = await ctx.db.collection('tourism_settings').doc('site').get();
    const siteName = settingsSnap.exists ? settingsSnap.data().siteName : null;
    await tgSendMessage(ctx, chatId, helpText(authorized, chatId, siteName));
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
  if (lower === '/pulizie' || lower === '/manutenzione') {
    const authorizedForThis = authorized || await isAuthorizedForCleaning(ctx, chatId);
    if (!authorizedForThis) { await tgSendMessage(ctx, chatId, unauthorizedText(chatId)); return; }
    if (lower === '/pulizie') await startCleaningStatusPick(ctx, chatId);
    else await startMaintenanceWizard(ctx, chatId);
    return;
  }

  const session = await getSession(ctx, chatId);
  // Stesso ragionamento di handleCallbackQuery: una sessione esiste solo se
  // creata da un comando già gate-ato a monte (/nuova o /manutenzione), quindi
  // qui basta verificare che l'utente sia autorizzato per QUALCHE motivo,
  // altrimenti /manutenzione si romperebbe per chi è solo nell'elenco pulizie.
  const authorizedForSession = authorized || await isAuthorizedForCleaning(ctx, chatId);
  if (session && authorizedForSession) {
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

module.exports = { handleTelegramUpdate, notifyOwnerMaintenanceReport, MAINTENANCE_CATEGORY_LABELS };
