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

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { createBookingCore, createGroupBookingCore, computeQuoteCore, cancelBookingCore, lookupBookingForCancellationCore } = require('./booking-logic');
const { recordVerifiedGuests } = require('./guest-verification');
const { validateGuest, movePhotoToPermanent, deletePermanentGuestPhoto, todayISO, isNonEmptyString, visionDocumentText, findTempGuestPhoto } = require('./guest-documents');
const { parseMrzFromText } = require('./mrz-parser');
const { handleTelegramUpdate, notifyMaintenanceRecipientsCore } = require('./telegram-bot');
const { submitAssistMessageCore } = require('./assist-messages');
const { logRecClickCore } = require('./recs-clicks');
const { buildBookingIcs } = require('./calendar-ics');
const { notifyBookingConfirmed, notifyBookingCancelled } = require('./guest-notify');
const { enforceRateLimit } = require('./rate-limit');
const { requestSignatureOtpCore, verifySignatureOtpCore } = require('./guest-signature');
const {
  staffGetBoardCore, staffSetCleaningStatusCore, staffReportMaintenanceCore,
  staffGetMaintenanceBoardCore, staffSetMaintenanceStatusCore
} = require('./staff-actions');
const { rebuildBookingsExcel, EXPORT_PATH: BOOKINGS_EXCEL_PATH } = require('./bookings-excel-export');

admin.initializeApp();
setGlobalOptions({ region: 'europe-west1', maxInstances: 5 });

// `enforceAppCheck: true` TEMPORANEAMENTE RIMOSSO da tutte le funzioni onCall
// qui sotto (31/07, richiesta esplicita dell'utente): lo scambio del token
// reCAPTCHA v3 → App Check falliva in produzione con "App attestation
// failed" (dominio/chiave non collegati correttamente in console Firebase),
// bloccando OGNI prenotazione/pagamento/upload reale. Riabilitare (rimettere
// `enforceAppCheck: true` su ogni onCall qui sotto, e "&& request.app !=
// null" in firestore.rules/storage.rules) SOLO dopo aver verificato in
// Firebase Console → App Check che il provider reCAPTCHA v3 sia registrato
// con la chiave/dominio corretti.

const telegramBotToken = defineSecret('TELEGRAM_BOT_TOKEN');
const telegramWebhookSecret = defineSecret('TELEGRAM_WEBHOOK_SECRET');
const visionApiKey = defineSecret('VISION_API_KEY');
// Email immediate all'ospite (conferma/annullamento) — vedi guest-notify.js
// e il trigger onBookingStatusChange più sotto. Stesso account Gmail usato
// dal cron GitHub Actions per le altre email (affittacamere/scripts/_lib.js),
// ma è un secret separato: Cloud Functions e GitHub Actions non condividono
// lo stesso "secret store", vanno impostati in entrambi i posti.
const gmailUser = defineSecret('GMAIL_USER');
const gmailAppPassword = defineSecret('GMAIL_APP_PASSWORD');
// Chiave segreta Stripe (sk_...) — impostarla con:
//   firebase functions:secrets:set STRIPE_SECRET_KEY
// (mai nel codice, stesso pattern di TELEGRAM_BOT_TOKEN). La chiave
// PUBBLICABILE (pk_...) invece va in affittacamere/js/stripe-config.js,
// non è un segreto.
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');

// Stesso controllo del custom claim "role: owner" introdotto in
// firestore.rules/storage.rules (01/08): prima queste funzioni si fidavano
// di "request.auth" da solo, cioè QUALSIASI account Firebase autenticato,
// non solo il proprietario — stesso problema già chiuso lato regole,
// mancava qui lato Cloud Functions.
function isOwner(request) {
  return !!(request.auth && request.auth.token && request.auth.token.role === 'owner');
}

async function notifyOwnerNewBooking(result, data) {
  const token = telegramBotToken.value();
  if (!token) return; // bot non ancora configurato: nessun errore, semplicemente niente notifica
  try {
    const settingsSnap = await db.collection('tourism_settings').doc('site').get();
    const recipients = ((settingsSnap.exists ? settingsSnap.data() : {}).bookingCommandAuthorized || [])
      .filter((r) => r.enabled && r.chatId);
    const text = (data.source === 'site_test' ? '🧪 [TEST — nessun pagamento reale] ' : '🛎️ ') + 'Nuova richiesta di prenotazione\n' + result.roomLabel + ' — ' + data.checkIn + ' → ' + data.checkOut +
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

async function notifyOwnerNewGroupBooking(result, data) {
  const token = telegramBotToken.value();
  if (!token) return;
  try {
    const settingsSnap = await db.collection('tourism_settings').doc('site').get();
    const recipients = ((settingsSnap.exists ? settingsSnap.data() : {}).bookingCommandAuthorized || [])
      .filter((r) => r.enabled && r.chatId);
    const roomLabels = result.bookings.map((b) => b.roomLabel).join(', ');
    const text = (data.source === 'site_test' ? '🧪 [TEST — nessun pagamento reale] ' : '🛎️ ') + 'Nuova richiesta di prenotazione di gruppo (' + result.bookings.length + ' stanze)\n' +
      roomLabels + ' — ' + data.checkIn + ' → ' + data.checkOut + '\n' +
      data.name + ' — ' + data.email + (data.phone ? ' — ' + data.phone : '') + '\n' +
      'Totale: €' + result.grandTotal.toFixed(2) + '\nConfermala dalla dashboard quando vuoi.';
    await Promise.all(recipients.map((r) => fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: r.chatId, text: text })
    }).catch(() => {})));
  } catch (e) {
    // Notifica best-effort: non deve mai far fallire la creazione della prenotazione.
  }
}

async function notifyOwnerNewAssistMessage(result, data) {
  const token = telegramBotToken.value();
  if (!token) return;
  try {
    const settingsSnap = await db.collection('tourism_settings').doc('site').get();
    const recipients = ((settingsSnap.exists ? settingsSnap.data() : {}).bookingCommandAuthorized || [])
      .filter((r) => r.enabled && r.chatId);
    const contactLabel = data.contactMethod === 'email' ? 'email' : 'WhatsApp';
    const text = '💬 Nuovo messaggio dal widget di assistenza' +
      (data.topic ? '\nArgomento: ' + data.topic : '') +
      '\n' + data.name + ' — vuole essere ricontattato su ' + contactLabel + ': ' + data.contactValue +
      '\n"' + data.message + '"' +
      '\nRispondi dalla dashboard (tab Assistenza) o scrivigli direttamente.';
    await Promise.all(recipients.map((r) => fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: r.chatId, text: text })
    }).catch(() => {})));
  } catch (e) {
    // Notifica best-effort: non deve mai far fallire il salvataggio del messaggio.
  }
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

/* ==========================================================================
   createBooking — logica condivisa in booking-logic.js (usata anche dal
   bot Telegram via telegram-bot.js).
   ========================================================================== */
exports.createBooking = onCall({ secrets: [telegramBotToken, stripeSecretKey] }, async (request) => {
  await enforceRateLimit(db, request, 'createBooking', 8, 15);
  const data = request.data || {};
  const source = data.source || 'site';
  // 'site_test' TEMPORANEO (vedi booking-logic.js): salta Stripe ma crea una
  // prenotazione VERA (blocca le date). Volutamente aperto a chiunque finché
  // il sito è in fase di test pre-lancio (nessun controllo isOwner qui) —
  // DA RIMETTERE dietro isOwner() o da eliminare del tutto insieme al resto
  // di TEMP_TEST_SKIP_PAYMENT prima del lancio pubblico, altrimenti chiunque
  // potrebbe creare prenotazioni reali gratis dal sito pubblico.
  if (source !== 'site' && source !== 'site_test' && !isOwner(request)) {
    throw new HttpsError('permission-denied', 'Solo il proprietario può creare prenotazioni manuali.');
  }
  // Lo Stripe client serve solo per le richieste dal sito (createBookingCore
  // ricontrolla lì il pagamento prima di confermare — vedi verifyPaidIntent
  // in booking-logic.js): le prenotazioni manuali non lo toccano mai.
  let stripe = null;
  if (source === 'site') {
    const key = stripeSecretKey.value();
    if (!key) throw new HttpsError('failed-precondition', 'Pagamento online non ancora configurato.');
    try { stripe = require('stripe')(key); } catch (e) { throw new HttpsError('failed-precondition', 'Pacchetto "stripe" mancante lato server.'); }
  }
  let result;
  try {
    result = await createBookingCore(admin, db, stripe, data);
  } catch (err) {
    if (err.code) throw new HttpsError(err.code, err.message);
    throw new HttpsError('internal', 'Errore imprevisto: riprova.');
  }
  // Notifica Telegram al proprietario per le richieste dal sito (le
  // prenotazioni manuali le crea lui stesso, non serve avvisarlo di nuovo).
  if (source === 'site' || source === 'site_test') await notifyOwnerNewBooking(result, data);
  return result;
});

/* ==========================================================================
   createGroupBooking — prenotazione di gruppo su più stanze insieme (vedi
   createGroupBookingCore in booking-logic.js): una sola transazione
   atomica, o tutte le stanze richieste vengono prenotate o nessuna.
   ========================================================================== */
exports.createGroupBooking = onCall({ secrets: [telegramBotToken, stripeSecretKey] }, async (request) => {
  await enforceRateLimit(db, request, 'createGroupBooking', 8, 15);
  const data = request.data || {};
  const source = data.source || 'site';
  // 'site_test' TEMPORANEO (vedi booking-logic.js): salta Stripe ma crea una
  // prenotazione VERA (blocca le date). Volutamente aperto a chiunque finché
  // il sito è in fase di test pre-lancio (nessun controllo isOwner qui) —
  // DA RIMETTERE dietro isOwner() o da eliminare del tutto insieme al resto
  // di TEMP_TEST_SKIP_PAYMENT prima del lancio pubblico, altrimenti chiunque
  // potrebbe creare prenotazioni reali gratis dal sito pubblico.
  if (source !== 'site' && source !== 'site_test' && !isOwner(request)) {
    throw new HttpsError('permission-denied', 'Solo il proprietario può creare prenotazioni manuali.');
  }
  let stripe = null;
  if (source === 'site') {
    const key = stripeSecretKey.value();
    if (!key) throw new HttpsError('failed-precondition', 'Pagamento online non ancora configurato.');
    try { stripe = require('stripe')(key); } catch (e) { throw new HttpsError('failed-precondition', 'Pacchetto "stripe" mancante lato server.'); }
  }
  let result;
  try {
    result = await createGroupBookingCore(admin, db, stripe, data);
  } catch (err) {
    if (err.code) throw new HttpsError(err.code, err.message);
    throw new HttpsError('internal', 'Errore imprevisto: riprova.');
  }
  if (source === 'site' || source === 'site_test') await notifyOwnerNewGroupBooking(result, data);
  return result;
});

/* ==========================================================================
   createPaymentIntent — pagamento in-page con Stripe Payment Element
   (niente redirect al Checkout ospitato da Stripe). L'importo NON arriva
   mai dal client: viene ricalcolato qui da computeQuoteCore a partire da
   stanza/date/ospiti, così un client malevolo non può far pagare meno del
   dovuto modificando il totale mostrato in pagina. Richiede STRIPE_SECRET_KEY
   impostata come secret (vedi sopra) e il pacchetto "stripe" installato in
   functions/ — require() è dentro la funzione (non in cima al file) apposta,
   così finché non è installato/configurato solo questa funzione fallisce con
   un errore chiaro invece di rompere il deploy di tutte le altre.
   ========================================================================== */
exports.createPaymentIntent = onCall({ secrets: [stripeSecretKey] }, async (request) => {
  await enforceRateLimit(db, request, 'createPaymentIntent', 20, 15);
  const data = request.data || {};
  const key = stripeSecretKey.value();
  if (!key) throw new HttpsError('failed-precondition', 'Pagamento online non ancora configurato: manca STRIPE_SECRET_KEY.');

  const settingsSnap = await db.collection('tourism_settings').doc('site').get();
  const settings = settingsSnap.exists ? settingsSnap.data() : {};

  let quote;
  try {
    quote = await computeQuoteCore(db, data);
  } catch (err) {
    if (err.code) throw new HttpsError(err.code, err.message);
    throw new HttpsError('internal', 'Errore nel calcolo del totale.');
  }
  if (!(quote.amount > 0)) throw new HttpsError('invalid-argument', 'Totale non valido.');

  let stripe;
  try {
    stripe = require('stripe')(key);
  } catch (e) {
    throw new HttpsError('failed-precondition', 'Pagamento online non ancora configurato: pacchetto "stripe" mancante (npm install stripe in functions/).');
  }

  // L'addebito include la commissione di elaborazione (quote.fee), mostrata
  // esplicitamente all'ospite nel riepilogo prima di pagare — se poi
  // cancella entro i termini, viene rimborsato solo quote.baseTotal.
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(quote.amount * 100),
    currency: 'eur',
    // Solo 'card': con automatic_payment_methods Stripe aggiungeva da solo
    // tutti i metodi abilitati sull'account (Amazon Pay, Bancontact, MB WAY,
    // EPS...), quasi tutti irrilevanti per un B&B a Monopoli. Apple Pay e
    // Google Pay restano disponibili comunque: viaggiano sul metodo 'card',
    // li mostra l'Express Checkout Element lato client.
    payment_method_types: ['card'],
    description: (settings.siteName || 'Casa Celeste') + ' — prenotazione stanza',
    metadata: { checkIn: data.checkIn || '', checkOut: data.checkOut || '', roomId: data.roomId || '', groupBooking: Array.isArray(data.rooms) ? 'si' : 'no' }
  });
  return { clientSecret: intent.client_secret, amount: quote.amount, baseTotal: quote.baseTotal, fee: quote.fee, paymentIntentId: intent.id };
});

/* ==========================================================================
   cancelBooking — cancellazione self-service dell'ospite (nessun login: il
   guestFormToken è la stessa chiave d'accesso già usata per ospiti.html).
   Rimborsa solo il costo del soggiorno (mai la commissione di pagamento) e
   solo entro il termine di 48 ore prima del check-in — vedi
   cancelBookingCore in booking-logic.js.
   ========================================================================== */
exports.cancelBooking = onCall({ secrets: [stripeSecretKey] }, async (request) => {
  await enforceRateLimit(db, request, 'cancelBooking', 10, 15);
  const data = request.data || {};
  const key = stripeSecretKey.value();
  if (!key) throw new HttpsError('failed-precondition', 'Pagamento online non ancora configurato.');
  let stripe;
  try {
    stripe = require('stripe')(key);
  } catch (e) {
    throw new HttpsError('failed-precondition', 'Pacchetto "stripe" mancante lato server.');
  }
  try {
    return await cancelBookingCore(admin, db, stripe, data);
  } catch (err) {
    if (err.code) throw new HttpsError(err.code, err.message);
    throw new HttpsError('internal', 'Errore imprevisto: riprova.');
  }
});

/* ==========================================================================
   lookupBookingForCancellation — usata dal widget di assistenza (opzione
   "Cancellazione") per chi non ha più sottomano il link con token: ritrova
   la prenotazione da nome+email+data di check-in e restituisce lo stesso
   bookingId/token del link email, così il client richiama poi cancelBooking
   esattamente come dal flusso normale. Errore sempre generico per non
   rivelare quale dato è sbagliato — vedi lookupBookingForCancellationCore.
   ========================================================================== */
exports.lookupBookingForCancellation = onCall({}, async (request) => {
  // Limite più stretto: questo endpoint prova a indovinare nome+email+data,
  // il bersaglio più naturale per un tentativo di enumerazione automatizzato.
  await enforceRateLimit(db, request, 'lookupBookingForCancellation', 5, 15);
  const data = request.data || {};
  try {
    return await lookupBookingForCancellationCore(db, data);
  } catch (err) {
    if (err.code === 'not-found') throw new HttpsError('not-found', 'booking-not-found');
    if (err.code) throw new HttpsError(err.code, err.message);
    throw new HttpsError('internal', 'Errore imprevisto: riprova.');
  }
});

/* ==========================================================================
   submitAssistMessage — widget di assistenza (affittacamere/js/app.js),
   nodo "message": l'ospite lascia nome + testo + un contatto dove essere
   ricontattato (WhatsApp o email), niente WhatsApp aperto in automatico.
   Salva su tourism_assistMessages (letto/gestito dalla dashboard, tab
   Assistenza) e avvisa subito il proprietario su Telegram — stesso canale
   già usato per le nuove prenotazioni, nessuna quota EmailJS consumata.
   ========================================================================== */
exports.submitAssistMessage = onCall({ secrets: [telegramBotToken] }, async (request) => {
  await enforceRateLimit(db, request, 'submitAssistMessage', 5, 15);
  const data = request.data || {};
  let result;
  try {
    result = await submitAssistMessageCore(admin, db, data);
  } catch (err) {
    if (err.code) throw new HttpsError(err.code, err.message);
    throw new HttpsError('internal', 'Errore imprevisto: riprova.');
  }
  await notifyOwnerNewAssistMessage(result, data);
  return result;
});

/* ==========================================================================
   logRecClick — un click su una card "Consigli & dintorni" (nessuna
   notifica Telegram: sarebbe rumore, il proprietario guarda i totali in
   dashboard quando vuole, non evento per evento).
   ========================================================================== */
exports.logRecClick = onCall({}, async (request) => {
  await enforceRateLimit(db, request, 'logRecClick', 30, 15);
  const data = request.data || {};
  try {
    return await logRecClickCore(admin, db, data);
  } catch (err) {
    if (err.code) throw new HttpsError(err.code, err.message);
    throw new HttpsError('internal', 'Errore imprevisto: riprova.');
  }
});

/* ==========================================================================
   getBookingForGuestForm — usata da ospiti.html per sapere quanti blocchi
   ospite mostrare (nome stanza, numero ospiti, date), senza mai concedere
   lettura pubblica diretta di tourism_bookings (che contiene contatti e
   stato interno): il token fa da chiave d'accesso, verificato qui.
   ========================================================================== */
exports.getBookingForGuestForm = onCall({}, async (request) => {
  await enforceRateLimit(db, request, 'getBookingForGuestForm', 15, 15);
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
  const settingsSnap = await db.collection('tourism_settings').doc('site').get();
  const settings = settingsSnap.exists ? settingsSnap.data() : {};
  return {
    roomLabel: b.roomLabel, guests: b.guests, checkIn: b.checkIn, checkOut: b.checkOut,
    checkInPassed: todayISO() > b.checkIn,
    existingGuests: existing.exists ? (existing.data().guests || []).map((g) => Object.assign({}, g, { docPhotoUrl: undefined })) : null,
    status: b.status, source: b.source, payment: b.payment || null, groupId: b.groupId || null,
    // Firma OTP contratto di locazione (FES) — vedi guest-signature.js:
    // ospiti.js mostra la sezione firma solo se il proprietario l'ha
    // attivata E i documenti sono già completi (gate coerente con
    // requestSignatureOtpCore, che rifiuta comunque lato server).
    guestDocsComplete: !!b.guestDocsComplete,
    contractSignatureEnabled: !!settings.contractSignatureEnabled,
    contractSigned: b.contractSigned || null,
    name: b.name || '', email: b.email || '', nights: b.nights || 0,
    touristTax: b.touristTax || null, pricing: b.pricing || null, lang: b.lang || 'it'
  };
});

/* ==========================================================================
   submitGuestDocuments — validateGuest/movePhotoToPermanent ora in
   guest-documents.js (condivise con functions/telegram-bot.js).
   ========================================================================== */
exports.submitGuestDocuments = onCall({}, async (request) => {
  await enforceRateLimit(db, request, 'submitGuestDocuments', 10, 15);
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
  if (todayISO() > booking.checkIn && !isOwner(request)) {
    throw new HttpsError('permission-denied', 'Il check-in è già passato: contatta il proprietario per correggere i dati.');
  }

  const docRef = db.collection('tourism_guestDocuments').doc(bookingId);

  if (mode === 'delete') {
    const existing = await docRef.get();
    if (existing.exists) {
      const prevGuests = existing.data().guests || [];
      await Promise.all(prevGuests.map((g, i) => deletePermanentGuestPhoto(bucket, bookingId, i).catch(() => {})));
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
  const movedGuests = await Promise.all(guests.map((g, i) => movePhotoToPermanent(bucket, bookingId, i, g)));

  await docRef.set({
    guests: movedGuests,
    submittedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  // Identificazione: la legge impone di verificare che l'ospite corrisponda
  // al documento (non solo raccogliere/trasmettere i dati) — vedi
  // functions/guest-verification.js. Nessuno skip automatico: ogni NUOVA
  // prenotazione richiede una nuova verifica al primo ingresso, anche per
  // un ospite già soggiornato in passato — identityVerified si imposta solo
  // a mano dal proprietario (markIdentityVerified), dopo la videochiamata
  // o la conferma al videocitofono.
  await bookingRef.update({ guestDocsComplete: true });

  return { ok: true };
});

/* ==========================================================================
   requestSignatureOtp / verifySignatureOtp — firma OTP del contratto di
   locazione (FES), vedi guest-signature.js per tutta la logica. Attivabile/
   disattivabile da dashboard (tourism_settings/site.contractSignatureEnabled);
   riusa gli stessi secret Gmail già configurati per onBookingStatusChange,
   nessun nuovo servizio/costo.
   ========================================================================== */
exports.requestSignatureOtp = onCall({ secrets: [gmailUser, gmailAppPassword] }, async (request) => {
  await enforceRateLimit(db, request, 'requestSignatureOtp', 5, 15);
  return requestSignatureOtpCore({
    admin, db, request, gmailUser: gmailUser.value(), gmailAppPassword: gmailAppPassword.value()
  }, request.data || {});
});
exports.verifySignatureOtp = onCall({}, async (request) => {
  await enforceRateLimit(db, request, 'verifySignatureOtp', 10, 15);
  return verifySignatureOtpCore({ db, request }, request.data || {});
});

/* ==========================================================================
   staffGetBoard / staffSetCleaningStatus / staffReportMaintenance — la
   "dashboard limitata" del personale (affittacamere/pulizie.html), vedi
   functions/staff-actions.js per tutta la logica. Nessun login Firebase:
   un token in tourism_settingsPrivate/site (rigenerabile dal proprietario)
   verificato dentro ciascuna funzione, stesso principio già usato per
   ospiti.html/cancella.html (guestFormToken). staffReportMaintenance ha
   bisogno del secret Telegram per notificare il proprietario (stessa
   funzione condivisa dal bot, functions/telegram-bot.js).
   ========================================================================== */
exports.staffGetBoard = onCall({}, async (request) => {
  await enforceRateLimit(db, request, 'staffGetBoard', 30, 15);
  return staffGetBoardCore({ db }, request.data || {});
});
exports.staffSetCleaningStatus = onCall({}, async (request) => {
  await enforceRateLimit(db, request, 'staffSetCleaningStatus', 30, 15);
  return staffSetCleaningStatusCore({ db, admin }, request.data || {});
});
exports.staffReportMaintenance = onCall({ secrets: [telegramBotToken] }, async (request) => {
  await enforceRateLimit(db, request, 'staffReportMaintenance', 10, 15);
  return staffReportMaintenanceCore({ db, admin, botToken: telegramBotToken.value() }, request.data || {});
});

/* ==========================================================================
   staffGetMaintenanceBoard / staffSetMaintenanceStatus — mini dashboard
   manutenzione (affittacamere/manutenzione.html), stesso principio di
   staffGetBoard/staffSetCleaningStatus ma con il token separato
   maintenanceAccessToken (vedi verifyMaintenanceToken in staff-actions.js).
   ========================================================================== */
exports.staffGetMaintenanceBoard = onCall({}, async (request) => {
  await enforceRateLimit(db, request, 'staffGetMaintenanceBoard', 30, 15);
  return staffGetMaintenanceBoardCore({ db }, request.data || {});
});
exports.staffSetMaintenanceStatus = onCall({}, async (request) => {
  await enforceRateLimit(db, request, 'staffSetMaintenanceStatus', 30, 15);
  return staffSetMaintenanceStatusCore({ db, admin }, request.data || {});
});

// Invio manuale, scelto dal proprietario nella sezione manutenzione della
// tab Assistenza, a chi si occupa dei lavori — vedi notifyMaintenanceRecipientsCore
// in functions/telegram-bot.js. Riservato al proprietario autenticato
// (niente token pubblico: qui il chiamante è già dentro dashboard.html).
exports.notifyMaintenanceRecipients = onCall({ secrets: [telegramBotToken] }, async (request) => {
  if (!isOwner(request)) throw new HttpsError('permission-denied', 'Solo il proprietario può inviare questa notifica.');
  await enforceRateLimit(db, request, 'notifyMaintenanceRecipients', 15, 15);
  return notifyMaintenanceRecipientsCore({ db, admin, botToken: telegramBotToken.value() }, request.data || {});
});

/* ==========================================================================
   markIdentityVerified — il proprietario conferma l'identità di un ospite
   (videochiamata 1h prima del check-in con documento in mano, oppure
   videocitofono solo la prima volta) e registra l'ospite come "già
   verificato" per i soggiorni futuri. Solo owner autenticato.
   ========================================================================== */
exports.markIdentityVerified = onCall({}, async (request) => {
  if (!isOwner(request)) throw new HttpsError('permission-denied', 'Solo il proprietario può confermare la verifica.');
  const data = request.data || {};
  const bookingId = data.bookingId;
  const method = data.method === 'door_intercom' ? 'door_intercom' : 'video_call';
  if (!isNonEmptyString(bookingId, 100)) throw new HttpsError('invalid-argument', 'Prenotazione non valida.');

  const bookingRef = db.collection('tourism_bookings').doc(bookingId);
  const docsSnap = await db.collection('tourism_guestDocuments').doc(bookingId).get();
  if (!docsSnap.exists) throw new HttpsError('failed-precondition', 'Documenti ospiti non ancora inviati per questa prenotazione.');
  const guests = docsSnap.data().guests || [];

  await recordVerifiedGuests(db, admin, guests, bookingId, method);
  await bookingRef.update({ identityVerified: { method: method, verifiedAt: admin.firestore.FieldValue.serverTimestamp() } });
  return { ok: true };
});

/* ==========================================================================
   parseGuestDocPhoto — il proprietario carica dalla dashboard (invece che
   l'ospite da ospiti.html o via bot Telegram) la foto documento di un
   ospite in tourism-guest-docs-tmp/{bookingId}/guest{N}.*, poi chiama
   questa funzione per farsi pre-compilare nome/cognome/data di
   nascita/cittadinanza/tipo e numero documento via OCR+MRZ — stessa identica
   logica già usata dal bot Telegram (vedi handlePhotoForDocCapture in
   telegram-bot.js), qui esposta come funzione standalone per la dashboard.
   Luogo di nascita e di rilascio non si leggono mai dall'MRZ: restano da
   inserire a mano, sempre da verificare prima di salvare (submitGuestDocuments
   fa la validazione finale). Solo owner autenticato.
   ========================================================================== */
exports.parseGuestDocPhoto = onCall({ secrets: [visionApiKey] }, async (request) => {
  if (!isOwner(request)) throw new HttpsError('permission-denied', 'Solo il proprietario può usare questa funzione.');
  await enforceRateLimit(db, request, 'parseGuestDocPhoto', 20, 15);
  const data = request.data || {};
  const bookingId = data.bookingId;
  const guestIndex = Number(data.guestIndex);
  if (!isNonEmptyString(bookingId, 100) || !Number.isInteger(guestIndex) || guestIndex < 0) {
    throw new HttpsError('invalid-argument', 'Richiesta non valida.');
  }

  const file = await findTempGuestPhoto(bucket, bookingId, guestIndex);
  if (!file) throw new HttpsError('not-found', 'Nessuna foto caricata per questo ospite: caricala prima di leggerla automaticamente.');

  let buffer;
  try {
    [buffer] = await file.download();
  } catch (e) {
    throw new HttpsError('internal', 'Errore nel leggere la foto caricata.');
  }

  let ocrText = null;
  try { ocrText = await visionDocumentText(visionApiKey.value(), buffer); } catch (e) { console.error('Errore Vision API:', e.message); }
  const mrz = ocrText ? parseMrzFromText(ocrText) : null;

  return {
    recognized: !!mrz,
    firstName: mrz ? mrz.firstName : '',
    lastName: mrz ? mrz.lastName : '',
    birthDate: mrz ? mrz.birthDate : '',
    nationality: mrz ? mrz.nationality : '',
    docType: mrz ? mrz.docType : '',
    docNumber: mrz ? mrz.docNumber : ''
  };
});

/* ==========================================================================
   telegramWebhook — endpoint pubblico che riceve in tempo reale i messaggi
   del bot (sostituisce il vecchio polling ogni 5 minuti da GitHub Actions).
   Autenticazione: Telegram rimanda ad ogni chiamata l'header
   X-Telegram-Bot-Api-Secret-Token impostato in fase di registrazione del
   webhook (vedi affittacamere/scripts/telegram-set-webhook.js) — qualunque
   richiesta senza quell'header esatto viene rifiutata prima di toccare
   Firestore/Telegram. Risponde SEMPRE 200 quando l'header è valido (anche
   in caso di errore interno, loggato ma non propagato): Telegram rifà
   retry aggressivi su risposte non-2xx, che duplicherebbero i passi del
   wizard per l'utente.
   ========================================================================== */
exports.telegramWebhook = onRequest({ secrets: [telegramBotToken, telegramWebhookSecret, visionApiKey] }, async (req, res) => {
  const expectedSecret = telegramWebhookSecret.value();
  const receivedSecret = req.get('X-Telegram-Bot-Api-Secret-Token');
  if (!expectedSecret || receivedSecret !== expectedSecret) {
    res.status(401).send('');
    return;
  }
  try {
    await handleTelegramUpdate(
      { admin, db, bucket, botToken: telegramBotToken.value(), visionApiKey: visionApiKey.value() },
      req.body || {}
    );
  } catch (err) {
    console.error('Errore telegramWebhook:', err);
  }
  res.status(200).send('');
});

// File .ics scaricabile per la prenotazione (bottone "Aggiungi al calendario
// Apple/Outlook" nell'email di conferma, vedi
// affittacamere/email-templates/1-conferma-prenotazione.html). onRequest
// (non onCall) perché deve essere un link cliccabile diretto — protetto
// dallo stesso guestFormToken usato per ospiti.html, non da App Check
// (che qui non si applica, non è una chiamata dell'SDK client).
exports.bookingCalendarIcs = onRequest(async (req, res) => {
  // onRequest (non onCall): niente request.auth/rawRequest nativi, serve un
  // adattatore minimo per riusare enforceRateLimit (stesso limite degli
  // altri endpoint pubblici — unico endpoint che ne era rimasto sprovvisto).
  try {
    await enforceRateLimit(db, { auth: null, rawRequest: req }, 'bookingCalendarIcs', 30, 15);
  } catch (err) {
    res.status(429).send('Troppe richieste da questo indirizzo in poco tempo: riprova tra qualche minuto.');
    return;
  }
  const bookingId = String(req.query.booking || '');
  const token = String(req.query.token || '');
  if (!bookingId || !token) {
    res.status(400).send('Link non valido.');
    return;
  }
  const snap = await db.collection('tourism_bookings').doc(bookingId).get();
  if (!snap.exists || snap.data().guestFormToken !== token) {
    res.status(403).send('Link non valido o scaduto.');
    return;
  }
  const b = snap.data();
  if (b.status === 'annullato') {
    res.status(410).send('Questa prenotazione è stata annullata.');
    return;
  }
  const settingsSnap = await db.collection('tourism_settings').doc('site').get();
  const settings = settingsSnap.exists ? settingsSnap.data() : {};
  // label: per una prenotazione di gruppo (più stanze insieme), il link
  // .ics nell'email di conferma passa qui i nomi di TUTTE le stanze invece
  // del solo nome di questa (vedi icsLink in guest-lifecycle-emails.js).
  const labelOverride = req.query.label ? String(req.query.label) : '';
  const ics = buildBookingIcs(Object.assign({ id: bookingId }, b, labelOverride ? { roomLabel: labelOverride } : {}), {
    checkInTime: settings.checkInTime, checkOutTime: settings.checkOutTime,
    siteName: settings.siteName, address: settings.address
  });
  res.set('Content-Type', 'text/calendar; charset=utf-8');
  res.set('Content-Disposition', 'attachment; filename="casa-celeste.ics"');
  res.status(200).send(ics);
});

// onBookingStatusChange — email IMMEDIATA all'ospite (non il cron orario)
// appena una prenotazione passa a status='confermato' o 'annullato', da
// qualunque percorso (pagamento online, conferma manuale in dashboard,
// cancellazione self-service o manuale). onDocumentWritten copre sia la
// creazione (prenotazione online già confermata al momento della scrittura,
// before.exists=false) sia l'aggiornamento (conferma/annullamento manuale
// da parte del proprietario). Vedi guest-notify.js per la logica di invio
// (gestisce da sola i gruppi di più stanze e la corsa critica tra invii
// simultanei).
exports.onBookingStatusChange = onDocumentWritten({
  document: 'tourism_bookings/{bookingId}',
  secrets: [gmailUser, gmailAppPassword, telegramBotToken]
}, async (event) => {
  const after = event.data.after.exists ? event.data.after.data() : null;
  // Registro Excel: rigenerato per QUALUNQUE scrittura su una prenotazione,
  // creazione/modifica/cancellazione inclusa (vedi bookings-excel-export.js)
  // — best-effort, non deve mai bloccare/rompere la logica email sotto.
  rebuildBookingsExcel({ db: db, bucket: bucket }).catch((err) => console.error('Errore aggiornamento registro Excel prenotazioni:', err));
  if (!after) return; // documento eliminato, niente email da mandare
  const before = event.data.before.exists ? event.data.before.data() : null;
  const beforeStatus = before ? before.status : null;
  const bookingId = event.params.bookingId;

  const ctx = {
    admin: admin, db: db,
    gmailUser: gmailUser.value(), gmailAppPassword: gmailAppPassword.value(),
    telegramBotToken: telegramBotToken.value()
  };

  if (after.status === 'confermato' && beforeStatus !== 'confermato') {
    await notifyBookingConfirmed(ctx, bookingId, after).catch((err) => console.error('Errore onBookingStatusChange (conferma):', err));
  } else if (after.status === 'annullato' && beforeStatus !== 'annullato') {
    await notifyBookingCancelled(ctx, bookingId, after).catch((err) => console.error('Errore onBookingStatusChange (annullamento):', err));
  }
});

// I dati ospite (nome, data di nascita, documento...) arrivano di solito
// DOPO la creazione della prenotazione (ospiti.html o il bot, vedi
// submitGuestDocuments/onDocumentsSubmit) — serve un secondo trigger
// separato per tenere il registro Excel aggiornato anche quando cambia
// solo questo, senza toccare lo stato della prenotazione.
exports.onGuestDocumentsWriteExcel = onDocumentWritten({
  document: 'tourism_guestDocuments/{bookingId}'
}, async () => {
  await rebuildBookingsExcel({ db: db, bucket: bucket }).catch((err) => console.error('Errore aggiornamento registro Excel prenotazioni (documenti ospiti):', err));
});

// Scarica il registro Excel — riservato al proprietario autenticato: contiene
// dati sensibili degli ospiti (data di nascita, numero documento...), stesso
// livello di protezione di storage.rules (tourism-exports/, allow read: if
// isOwner()). Restituito come base64 invece di una signed URL: generare
// signed URL dall'Admin SDK su Cloud Functions richiede un permesso IAM
// aggiuntivo (iam.serviceAccounts.signBlob) non garantito di default — questa
// via evita quel problema e resta comunque un file di poche decine/centinaia
// di KB per una struttura di questa dimensione.
exports.getBookingsExcelExport = onCall({}, async (request) => {
  if (!isOwner(request)) throw new HttpsError('permission-denied', 'Riservato al proprietario.');
  await enforceRateLimit(db, request, 'getBookingsExcelExport', 10, 15);
  try {
    const [buffer] = await bucket.file(BOOKINGS_EXCEL_PATH).download();
    return { base64: buffer.toString('base64'), fileName: 'prenotazioni.xlsx' };
  } catch (err) {
    if (err.code === 404) {
      // Non ancora generato (nessuna prenotazione scritta da quando questa
      // funzione è stata deployata): lo generiamo ora al volo invece di
      // restituire un errore all'utente.
      await rebuildBookingsExcel({ db: db, bucket: bucket });
      const [buffer] = await bucket.file(BOOKINGS_EXCEL_PATH).download();
      return { base64: buffer.toString('base64'), fileName: 'prenotazioni.xlsx' };
    }
    throw new HttpsError('internal', 'Errore nel recupero del registro Excel: ' + err.message);
  }
});
