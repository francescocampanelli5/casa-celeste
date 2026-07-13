// Comando prenotazione via bot Telegram — per aggiungere al volo dal
// telefono una prenotazione arrivata da Airbnb/Booking/telefono, senza
// aprire la dashboard. Riusa ESATTAMENTE la stessa transazione anti-doppia-
// prenotazione di functions/booking-logic.js (nessuna logica duplicata).
//
// Formato comando (in un unico messaggio al bot):
//   /nuova <StanzaIdOnome> <check-in DD/MM/AAAA> <check-out DD/MM/AAAA> <nome ospite> <email> <telefono> <ospiti> [canale]
// Esempio:
//   /nuova Scirocco 01/08/2026 05/08/2026 Mario Rossi mario@email.com 3331234567 2 airbnb
//
// Accetta il comando SOLO da chat-id presenti in bookingCommandAuthorized
// (Impostazioni dashboard) — altrimenti risponde con un errore e ignora.
// Esegue ogni 5 minuti (.github/workflows/affittacamere-bot-poll.yml, con
// concurrency group per evitare esecuzioni sovrapposte).
'use strict';
var lib = require('./_lib');
var admin = lib.initAdmin();
var db = admin.firestore();
var bookingLogic = require('../../functions/booking-logic');

var SOURCE_MAP = { airbnb: 'manual_airbnb', booking: 'manual_booking', telefono: 'manual_phone', phone: 'manual_phone' };
var DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

function parseDate(s) {
  var m = DATE_RE.exec(s);
  if (!m) return null;
  return m[3] + '-' + m[2] + '-' + m[1];
}
function replyTo(chatId, text) { return lib.telegramSend(chatId, text); }

async function findRoomIdByName(name) {
  var snap = await db.collection('tourism_rooms').get();
  var target = name.trim().toLowerCase();
  var found = null;
  snap.forEach(function (d) {
    if (d.id.toLowerCase() === target || (d.data().name || '').toLowerCase() === target) found = d.id;
  });
  return found;
}

async function handleNuovaCommand(chatId, text) {
  // /nuova Stanza dd/mm/yyyy dd/mm/yyyy Nome Cognome email telefono ospiti [canale]
  var parts = text.trim().split(/\s+/);
  parts.shift(); // rimuove "/nuova"
  if (parts.length < 6) {
    await replyTo(chatId, 'Formato non valido. Esempio:\n/nuova Scirocco 01/08/2026 05/08/2026 Mario Rossi mario@email.com 3331234567 2 airbnb');
    return;
  }
  var roomName = parts.shift();
  var checkInRaw = parts.shift();
  var checkOutRaw = parts.shift();
  var channel = 'other';
  if (SOURCE_MAP[parts[parts.length - 1] && parts[parts.length - 1].toLowerCase()]) channel = parts.pop().toLowerCase();
  var guestsCount = 1;
  if (parts.length && /^\d+$/.test(parts[parts.length - 1])) guestsCount = Number(parts.pop());
  var phone = parts.length ? parts.pop() : '';
  var email = parts.length ? parts.pop() : '';
  var name = parts.join(' ');

  var checkIn = parseDate(checkInRaw);
  var checkOut = parseDate(checkOutRaw);
  if (!checkIn || !checkOut) { await replyTo(chatId, 'Date non valide: usa il formato GG/MM/AAAA.'); return; }

  var roomId = await findRoomIdByName(roomName);
  if (!roomId) { await replyTo(chatId, 'Stanza "' + roomName + '" non trovata.'); return; }

  try {
    var result = await bookingLogic.createBookingCore(admin, db, {
      roomId: roomId, checkIn: checkIn, checkOut: checkOut, guests: guestsCount, exemptGuests: 0,
      name: name || 'Ospite ' + (SOURCE_MAP[channel] || channel), email: email || 'nessuna@email.non-fornita.invalid',
      phone: phone, source: SOURCE_MAP[channel] || 'manual_other', contractAccepted: true
    });
    var origin = process.env.SITE_ORIGIN || 'https://lacasaceleste.it/affittacamere/';
    var docsLink = origin + 'ospiti.html?booking=' + result.id + '&token=' + result.guestFormToken;
    await replyTo(chatId, '✅ Prenotazione creata: ' + result.roomLabel + ' dal ' + checkIn + ' al ' + checkOut + ' (' + result.nights + ' notti).\nLink documenti da inoltrare all\'ospite:\n' + docsLink);
  } catch (err) {
    if (err.code === 'already-exists') { await replyTo(chatId, '❌ Quelle notti sono già occupate per questa stanza.'); return; }
    await replyTo(chatId, '❌ Errore: ' + err.message);
  }
}

async function main() {
  if (!lib.telegramConfigured()) { console.log('TELEGRAM_BOT_TOKEN non configurato: esco.'); return; }

  var settingsRef = db.collection('tourism_settings').doc('site');
  var settingsSnap = await settingsRef.get();
  var settings = settingsSnap.exists ? settingsSnap.data() : {};
  var authorized = (settings.bookingCommandAuthorized || []).filter(function (r) { return r.enabled && r.chatId; }).map(function (r) { return String(r.chatId); });
  var lastUpdateId = settings.telegramLastUpdateId || 0;

  var res = await fetch('https://api.telegram.org/bot' + process.env.TELEGRAM_BOT_TOKEN + '/getUpdates?offset=' + (lastUpdateId + 1) + '&timeout=0');
  if (!res.ok) throw new Error('Telegram getUpdates ' + res.status + ': ' + (await res.text()));
  var data = await res.json();
  var updates = data.result || [];
  var maxId = lastUpdateId;

  for (var i = 0; i < updates.length; i++) {
    var u = updates[i];
    if (u.update_id > maxId) maxId = u.update_id;
    var msg = u.message;
    if (!msg || !msg.text || !msg.text.trim().toLowerCase().startsWith('/nuova')) continue;
    var chatId = String(msg.chat.id);
    if (authorized.indexOf(chatId) === -1) {
      await replyTo(chatId, 'Non sei autorizzato a creare prenotazioni da qui. Chiedi al proprietario di aggiungerti in Impostazioni.');
      continue;
    }
    await handleNuovaCommand(chatId, msg.text);
  }

  if (maxId !== lastUpdateId) await settingsRef.set({ telegramLastUpdateId: maxId }, { merge: true });
  console.log('Poll bot Telegram: ' + updates.length + ' update processati.');
}

main().catch(function (err) { console.error(err); process.exit(1); });
