// Cloud Functions — Casa Celeste (Affittacamere)
//
// Perché queste due funzioni esistono invece di semplici scritture client
// validate da firestore.rules (vedi studentato/firestore.rules per il
// pattern "semplice" usato ovunque nel resto del sito):
//
// 1. createBooking: creare una prenotazione richiede leggere le notti già
//    occupate e scriverne di nuove nello stesso respiro — fatto con due
//    scritture client separate, due ospiti potrebbero scegliere le stesse
//    notti nello stesso istante (corsa critica). Qui gira dentro una
//    transazione Firestore vera: o va tutto a buon fine atomicamente, o
//    fallisce con un errore chiaro ("notti appena occupate").
// 2. submitGuestDocuments: le security rules di Firestore non hanno un
//    ciclo "for" per validare in profondità un array di lunghezza
//    variabile (un ospite per persona in stanza) — qui la validazione è
//    normale codice JS, molto più semplice da scrivere bene.
//
// Costo: piano Blaze già attivo per Storage: le Cloud Functions hanno un
// piano gratuito di 2 milioni di invocazioni/mese, per 4 stanze restiamo a
// poche decine al mese — a costo pratico zero.

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { createBookingCore } = require('./booking-logic');

admin.initializeApp();
setGlobalOptions({ region: 'europe-west1', maxInstances: 5 });

const telegramBotToken = defineSecret('TELEGRAM_BOT_TOKEN');

async function notifyOwnerNewBooking(result, data) {
  const token = telegramBotToken.value();
  if (!token) return; // bot non ancora configurato: nessun errore, semplicemente niente notifica
  try {
    const settingsSnap = await db.collection('tourism_settings').doc('site').get();
    const recipients = ((settingsSnap.exists ? settingsSnap.data() : {}).bookingCommandAuthorized || [])
      .filter((r) => r.enabled && r.chatId);
    const text = '🛎️ Nuova richiesta di prenotazione\n' + result.roomLabel + ' — ' + data.checkIn + ' → ' + data.checkOut +
      ' (' + result.nights + ' notti, ' + data.guests + ' ospiti)\n' + data.name + ' — ' + data.email + (data.phone ? ' — ' + data.phone : '') +
      '\nConfermala dalla dashboard quando vuoi.';
    await Promise.all(recipients.map((r) => fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: r.chatId, text: text })
    }).catch(() => {})));
  } catch (e) {
    // Notifica best-effort: non deve mai far fallire la creazione della prenotazione.
  }
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

const DOC_TYPES = ['carta_identita', 'passaporto', 'patente'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateStr(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function isNonEmptyString(v, maxLen) {
  return typeof v === 'string' && v.trim().length > 0 && v.trim().length <= (maxLen || 100);
}

/* ==========================================================================
   createBooking — logica condivisa in booking-logic.js (usata anche dal
   bot Telegram via affittacamere/scripts/telegram-bot-poll.js).
   ========================================================================== */
exports.createBooking = onCall({ secrets: [telegramBotToken] }, async (request) => {
  const data = request.data || {};
  const source = data.source === 'site' ? 'site' : (data.source || 'site');
  if (source !== 'site' && !request.auth) {
    throw new HttpsError('permission-denied', 'Solo il proprietario può creare prenotazioni manuali.');
  }
  let result;
  try {
    result = await createBookingCore(admin, db, data);
  } catch (err) {
    if (err.code === 'already-exists') throw new HttpsError('already-exists', 'dates_taken');
    if (err.code) throw new HttpsError(err.code, err.message);
    throw new HttpsError('internal', 'Errore imprevisto: riprova.');
  }
  // Notifica Telegram al proprietario per le richieste dal sito (le
  // prenotazioni manuali le crea lui stesso, non serve avvisarlo di nuovo).
  if (source === 'site') await notifyOwnerNewBooking(result, data);
  return result;
});

/* ==========================================================================
   getBookingForGuestForm — usata da ospiti.html per sapere quanti blocchi
   ospite mostrare (nome stanza, numero ospiti, date), senza mai concedere
   lettura pubblica diretta di tourism_bookings (che contiene contatti e
   stato interno): il token fa da chiave d'accesso, verificato qui.
   ========================================================================== */
exports.getBookingForGuestForm = onCall(async (request) => {
  const data = request.data || {};
  const bookingId = data.bookingId;
  const token = data.token;
  if (!isNonEmptyString(bookingId, 100) || !isNonEmptyString(token, 200)) {
    throw new HttpsError('invalid-argument', 'Link non valido.');
  }
  const snap = await db.collection('tourism_bookings').doc(bookingId).get();
  if (!snap.exists || snap.data().guestFormToken !== token) {
    throw new HttpsError('permission-denied', 'Link non valido o scaduto.');
  }
  const b = snap.data();
  if (b.status === 'annullato') {
    throw new HttpsError('failed-precondition', 'Questa prenotazione è stata annullata.');
  }
  const existing = await db.collection('tourism_guestDocuments').doc(bookingId).get();
  return {
    roomLabel: b.roomLabel, guests: b.guests, checkIn: b.checkIn, checkOut: b.checkOut,
    checkInPassed: todayISO() > b.checkIn,
    existingGuests: existing.exists ? (existing.data().guests || []).map((g) => Object.assign({}, g, { docPhotoUrl: undefined })) : null
  };
});

/* ==========================================================================
   submitGuestDocuments
   ========================================================================== */
function validateGuest(g) {
  if (!g || typeof g !== 'object') return 'Dati ospite mancanti.';
  if (!isNonEmptyString(g.firstName, 80)) return 'Nome non valido.';
  if (!isNonEmptyString(g.lastName, 80)) return 'Cognome non valido.';
  if (!isValidDateStr(g.birthDate) || g.birthDate >= todayISO()) return 'Data di nascita non valida.';
  if (!isNonEmptyString(g.birthPlace, 100)) return 'Luogo di nascita non valido.';
  if (!isNonEmptyString(g.nationality, 60)) return 'Cittadinanza non valida.';
  if (DOC_TYPES.indexOf(g.docType) === -1) return 'Tipo documento non valido.';
  if (!isNonEmptyString(g.docNumber, 30) || g.docNumber.trim().length < 3) return 'Numero documento non valido.';
  if (!isNonEmptyString(g.docIssuePlace, 100)) return 'Luogo di rilascio non valido.';
  if (!isNonEmptyString(g.docPhotoUrl, 500) || g.docPhotoUrl.indexOf('tourism-guest-docs-tmp/') === -1) {
    return 'Foto documento mancante o non caricata correttamente.';
  }
  return null;
}

exports.submitGuestDocuments = onCall(async (request) => {
  const data = request.data || {};
  const bookingId = data.bookingId;
  const token = data.token;
  const mode = data.mode === 'delete' ? 'delete' : 'upsert';
  const guests = Array.isArray(data.guests) ? data.guests : [];

  if (!isNonEmptyString(bookingId, 100) || !isNonEmptyString(token, 200)) {
    throw new HttpsError('invalid-argument', 'Link non valido.');
  }

  const bookingRef = db.collection('tourism_bookings').doc(bookingId);
  const bookingSnap = await bookingRef.get();
  if (!bookingSnap.exists) throw new HttpsError('not-found', 'Prenotazione non trovata.');
  const booking = bookingSnap.data();

  if (booking.guestFormToken !== token) {
    throw new HttpsError('permission-denied', 'Link non valido o scaduto.');
  }
  if (booking.status === 'annullato') {
    throw new HttpsError('failed-precondition', 'Questa prenotazione è stata annullata.');
  }
  // Modificabile dall'ospite solo fino al giorno del check-in incluso; dopo,
  // solo il proprietario può correggere i dati (registro del soggiorno già
  // iniziato — vedi nota GDPR/Alloggiati Web in Fase B del piano).
  if (todayISO() > booking.checkIn && !request.auth) {
    throw new HttpsError('permission-denied', 'Il check-in è già passato: contatta il proprietario per correggere i dati.');
  }

  const docRef = db.collection('tourism_guestDocuments').doc(bookingId);

  if (mode === 'delete') {
    const existing = await docRef.get();
    if (existing.exists) {
      const prevGuests = existing.data().guests || [];
      await Promise.all(prevGuests.map((g, i) => deletePermanentGuestPhoto(bookingId, i).catch(() => {})));
    }
    await docRef.delete();
    await bookingRef.update({ guestDocsComplete: false });
    return { ok: true };
  }

  if (guests.length !== Number(booking.guests)) {
    throw new HttpsError('invalid-argument', 'Il numero di ospiti inseriti non corrisponde alla prenotazione.');
  }
  for (let i = 0; i < guests.length; i++) {
    const err = validateGuest(guests[i]);
    if (err) throw new HttpsError('invalid-argument', 'Ospite ' + (i + 1) + ': ' + err);
  }

  // Sposta ogni foto dall'area temporanea pubblica a quella definitiva
  // (lettura riservata al proprietario, mai pubblica — vedi storage.rules).
  const movedGuests = await Promise.all(guests.map((g, i) => movePhotoToPermanent(bookingId, i, g)));

  await docRef.set({
    guests: movedGuests,
    submittedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  await bookingRef.update({ guestDocsComplete: true });

  return { ok: true };
});

async function movePhotoToPermanent(bookingId, guestIndex, guest) {
  const tempPath = storagePathFromUrl(guest.docPhotoUrl);
  const ext = (tempPath.split('.').pop() || 'jpg').toLowerCase();
  const destPath = 'tourism-guest-docs/' + bookingId + '/guest' + guestIndex + '.' + ext;
  try {
    await bucket.file(tempPath).copy(bucket.file(destPath));
    await bucket.file(tempPath).delete().catch(() => {});
  } catch (e) {
    throw new HttpsError('internal', 'Errore nel salvataggio della foto documento ospite ' + (guestIndex + 1) + '.');
  }
  const clean = Object.assign({}, guest);
  delete clean.docPhotoUrl;
  clean.docPhotoPath = destPath;
  return clean;
}
async function deletePermanentGuestPhoto(bookingId, guestIndex) {
  const [files] = await bucket.getFiles({ prefix: 'tourism-guest-docs/' + bookingId + '/guest' + guestIndex + '.' });
  await Promise.all(files.map((f) => f.delete().catch(() => {})));
}
function storagePathFromUrl(url) {
  // Le URL di download Firebase Storage contengono il path codificato dopo "/o/".
  const m = String(url).match(/\/o\/([^?]+)/);
  if (!m) throw new HttpsError('invalid-argument', 'URL foto documento non valido.');
  return decodeURIComponent(m[1]);
}
