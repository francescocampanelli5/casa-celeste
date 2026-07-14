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
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { createBookingCore, createGroupBookingCore, computeQuoteCore, cancelBookingCore, lookupBookingForCancellationCore } = require('./booking-logic');
const { findAlreadyVerifiedGuests, recordVerifiedGuests } = require('./guest-verification');
const { validateGuest, movePhotoToPermanent, deletePermanentGuestPhoto, todayISO, isNonEmptyString } = require('./guest-documents');
const { handleTelegramUpdate } = require('./telegram-bot');
const { submitAssistMessageCore } = require('./assist-messages');

admin.initializeApp();
setGlobalOptions({ region: 'europe-west1', maxInstances: 5 });

const telegramBotToken = defineSecret('TELEGRAM_BOT_TOKEN');
const telegramWebhookSecret = defineSecret('TELEGRAM_WEBHOOK_SECRET');
const visionApiKey = defineSecret('VISION_API_KEY');
// Chiave segreta Stripe (sk_...) — impostarla con:
//   firebase functions:secrets:set STRIPE_SECRET_KEY
// (mai nel codice, stesso pattern di TELEGRAM_BOT_TOKEN). La chiave
// PUBBLICABILE (pk_...) invece va in affittacamere/js/stripe-config.js,
// non è un segreto.
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');

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

async function notifyOwnerNewGroupBooking(result, data) {
  const token = telegramBotToken.value();
  if (!token) return;
  try {
    const settingsSnap = await db.collection('tourism_settings').doc('site').get();
    const recipients = ((settingsSnap.exists ? settingsSnap.data() : {}).bookingCommandAuthorized || [])
      .filter((r) => r.enabled && r.chatId);
    const roomLabels = result.bookings.map((b) => b.roomLabel).join(', ');
    const text = '🛎️ Nuova richiesta di prenotazione di gruppo (' + result.bookings.length + ' stanze)\n' +
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
   createGroupBooking — prenotazione di gruppo su più stanze insieme (vedi
   createGroupBookingCore in booking-logic.js): una sola transazione
   atomica, o tutte le stanze richieste vengono prenotate o nessuna.
   ========================================================================== */
exports.createGroupBooking = onCall({ secrets: [telegramBotToken] }, async (request) => {
  const data = request.data || {};
  const source = data.source === 'site' ? 'site' : (data.source || 'site');
  if (source !== 'site' && !request.auth) {
    throw new HttpsError('permission-denied', 'Solo il proprietario può creare prenotazioni manuali.');
  }
  let result;
  try {
    result = await createGroupBookingCore(admin, db, data);
  } catch (err) {
    if (err.code === 'already-exists') throw new HttpsError('already-exists', 'dates_taken');
    if (err.code) throw new HttpsError(err.code, err.message);
    throw new HttpsError('internal', 'Errore imprevisto: riprova.');
  }
  if (source === 'site') await notifyOwnerNewGroupBooking(result, data);
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
  const data = request.data || {};
  const key = stripeSecretKey.value();
  if (!key) throw new HttpsError('failed-precondition', 'Pagamento online non ancora configurato: manca STRIPE_SECRET_KEY.');

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
    description: 'Casa Celeste — prenotazione stanza',
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
exports.lookupBookingForCancellation = onCall(async (request) => {
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
    existingGuests: existing.exists ? (existing.data().guests || []).map((g) => Object.assign({}, g, { docPhotoUrl: undefined })) : null,
    status: b.status, source: b.source, payment: b.payment || null, groupId: b.groupId || null
  };
});

/* ==========================================================================
   submitGuestDocuments — validateGuest/movePhotoToPermanent ora in
   guest-documents.js (condivise con functions/telegram-bot.js).
   ========================================================================== */
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
  const patch = { guestDocsComplete: true };

  // Identificazione: la legge impone di verificare che l'ospite corrisponda
  // al documento (non solo raccogliere/trasmettere i dati) — vedi
  // functions/guest-verification.js. Se OGNI ospite di questa prenotazione
  // risulta già verificato in un soggiorno precedente, lo riconosciamo qui
  // in automatico: dalla seconda volta niente nuova videochiamata/citofono.
  const alreadyVerified = await findAlreadyVerifiedGuests(db, guests).catch(() => false);
  if (alreadyVerified) {
    patch.identityVerified = { method: 'auto_returning', verifiedAt: admin.firestore.FieldValue.serverTimestamp() };
  }
  await bookingRef.update(patch);

  return { ok: true, identityAlreadyVerified: alreadyVerified };
});

/* ==========================================================================
   markIdentityVerified — il proprietario conferma l'identità di un ospite
   (videochiamata 1h prima del check-in con documento in mano, oppure
   videocitofono solo la prima volta) e registra l'ospite come "già
   verificato" per i soggiorni futuri. Solo owner autenticato.
   ========================================================================== */
exports.markIdentityVerified = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('permission-denied', 'Solo il proprietario può confermare la verifica.');
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
