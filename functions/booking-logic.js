// Logica di creazione prenotazione condivisa tra:
// - functions/index.js (Cloud Function createBooking, chiamata dal sito)
// - functions/telegram-bot.js (comando /nuova via bot, wizard e formato veloce)
//
// Tenerla in un solo posto evita che le due strade per creare una
// prenotazione (sito vs bot) finiscano per avere regole diverse — in
// particolare la transazione anti-doppia-prenotazione, che è il pezzo più
// delicato di tutto il sistema.
//
// Errori: lancia Error normali con un campo `.code` (stile Firebase:
// 'invalid-argument' | 'failed-precondition' | 'already-exists' | 'not-found'),
// così chi la usa da una Cloud Function può ricostruire una HttpsError, e
// chi la usa da uno script Node può semplicemente leggere err.code/err.message.
'use strict';
const crypto = require('crypto');
const pricing = require('./pricing');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Opzioni stanza (letto a scelta, culla, letto singolo aggiuntivo) — vedi
// affittacamere/js/app.js per le stesse costanti lato client (CRIB_MAX,
// EXTRA_BED_MAX, CRIB_PRICE, EXTRA_BED_PRICE). Prezzi fittizi/placeholder,
// da tenere allineati manualmente nei due file finché non hanno una sola
// fonte di verità comune. Forfettari per l'intero soggiorno, non a notte.
const CRIB_MAX = 1;
const EXTRA_BED_MAX = 1;
const CRIB_PRICE = 8;
const EXTRA_BED_PRICE = 15;

// Commissione di elaborazione pagamento (stima, aliquota carte europee di
// Stripe) addebitata all'ospite IN CIMA al costo del soggiorno, mostrata
// esplicitamente nel riepilogo prima del pagamento. Se l'ospite cancella
// entro i termini viene rimborsato solo il costo del soggiorno (baseTotal):
// questa commissione non è mai rimborsabile, Stripe non la restituisce
// nemmeno al gestore in caso di rimborso, quindi non può essere restituita
// all'ospite.
const PAYMENT_FEE_PERCENT = 1.5;
const PAYMENT_FEE_FIXED = 0.25;
// Finestra minima per cancellare gratis e ottenere il rimborso.
const CANCELLATION_CUTOFF_HOURS = 48;
function computePaymentFee(baseTotal) {
  return Math.round((baseTotal * PAYMENT_FEE_PERCENT / 100 + PAYMENT_FEE_FIXED) * 100) / 100;
}

function fail(code, message) {
  const err = new Error(message);
  err.code = code;
  throw err;
}
function isValidDateStr(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}
function isNonEmptyString(v, maxLen) {
  return typeof v === 'string' && v.trim().length > 0 && v.trim().length <= (maxLen || 100);
}

// verifyPaidIntent — non ci si fida MAI del solo fatto che il client abbia
// mandato un paymentIntentId (potrebbe essere inventato, riciclato da un
// altro pagamento, o corrispondere a un pagamento non ancora davvero
// concluso): si ricontrolla qui, direttamente con l'API di Stripe, che quel
// PaymentIntent sia (1) effettivamente 'succeeded', (2) per l'importo giusto
// (calcolato server-side da computeQuoteCore, mai da un totale inviato dal
// client) e (3) non già usato per un'altra prenotazione. Solo se tutti e tre
// i controlli passano la prenotazione viene creata e le notti bloccate.
async function verifyPaidIntent(db, stripe, paymentIntentId, expectedAmountEuro) {
  if (!stripe) fail('failed-precondition', 'Pagamento online non configurato lato server.');
  let intent;
  try {
    intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (err) {
    fail('failed-precondition', 'Pagamento non trovato o non valido.');
  }
  if (!intent || intent.status !== 'succeeded') {
    fail('failed-precondition', 'payment_not_confirmed');
  }
  const expectedCents = Math.round(expectedAmountEuro * 100);
  if (intent.currency !== 'eur' || intent.amount !== expectedCents) {
    fail('failed-precondition', 'payment_amount_mismatch');
  }
  const already = await db.collection('tourism_bookings').where('payment.intentId', '==', paymentIntentId).limit(1).get();
  if (!already.empty) {
    fail('already-exists', 'payment_already_used');
  }
}

async function createBookingCore(admin, db, stripe, data) {
  const roomId = data.roomId;
  const checkIn = data.checkIn;
  const checkOut = data.checkOut;
  const guests = Number(data.guests);
  const exemptGuests = Number(data.exemptGuests) || 0;
  const name = data.name;
  const email = data.email;
  const phone = data.phone || '';
  const contractAccepted = !!data.contractAccepted;
  const source = data.source || 'site';
  // TEMPORANEO — RIMUOVERE PRIMA DEL LANCIO PUBBLICO: 'site_test' salta la
  // verifica del pagamento Stripe per poter testare l'intero flusso (prezzo
  // dinamico, sconto di gruppo, email di conferma...) senza pagare davvero.
  // Vedi il bottone "(TEST) Conferma senza pagare" in affittacamere/js/app.js
  // (TEMP_TEST_SKIP_PAYMENT) — stesso interruttore da disattivare insieme a
  // questo. Richiede comunque l'accettazione delle condizioni, come 'site'.
  const isSiteFlow = source === 'site' || source === 'site_test';
  const bedType = data.bedType === 'singolo' ? 'singolo' : 'matrimoniale';
  const cribCount = Math.max(0, Math.min(CRIB_MAX, Number(data.cribCount) || 0));
  const extraBedCount = Math.max(0, Math.min(EXTRA_BED_MAX, Number(data.extraBedCount) || 0));
  const paymentIntentId = data.paymentIntentId || null;
  // Lingua scelta dall'ospite sul sito (vedi state.lang in app.js) - salvata
  // sulla prenotazione così guest-lifecycle-emails.js sa in quale lingua
  // scrivere le email, senza dover indovinare dal nome/dominio email.
  const lang = data.lang === 'en' ? 'en' : 'it';

  if (!isNonEmptyString(roomId, 50)) fail('invalid-argument', 'Stanza mancante.');
  if (!isValidDateStr(checkIn) || !isValidDateStr(checkOut) || checkIn >= checkOut) {
    fail('invalid-argument', 'Date non valide.');
  }
  if (!Number.isInteger(guests) || guests < 1 || guests > 20) {
    fail('invalid-argument', 'Numero ospiti non valido.');
  }
  if (exemptGuests < 0 || exemptGuests > guests) {
    fail('invalid-argument', 'Numero di esenti non valido.');
  }
  if (!isNonEmptyString(name, 200) || !isNonEmptyString(email, 200)) {
    fail('invalid-argument', 'Nome o email mancanti.');
  }
  if (isSiteFlow && !contractAccepted) {
    fail('failed-precondition', 'Condizioni di soggiorno non accettate.');
  }
  // Le prenotazioni dal sito passano sempre dal pagamento online prima di
  // arrivare qui (vedi createPaymentIntent): senza un PaymentIntent non
  // c'è modo di rimborsare più avanti se l'ospite cancella. Le prenotazioni
  // manuali (bot, dashboard) restano fuori da questo obbligo — non passano
  // da Stripe.
  if (source === 'site' && !isNonEmptyString(paymentIntentId, 200)) {
    fail('failed-precondition', 'Pagamento mancante.');
  }
  // Preventivo autoritativo (prezzo dinamico stagionale/festività + eventuale
  // prezzo manuale per periodo, vedi functions/pricing.js): calcolato SEMPRE,
  // non solo per le prenotazioni dal sito, così la prenotazione registrata
  // usa esattamente gli stessi numeri mostrati/addebitati in preventivo —
  // mai due calcoli separati che potrebbero disallinearsi. Per le
  // prenotazioni dal sito, l'importo del pagamento reale deve combaciare con
  // questo preventivo. Se una qualunque di queste condizioni non regge, la
  // prenotazione NON viene creata e le notti restano libere.
  const quote = await computeQuoteCore(db, { roomId: roomId, checkIn: checkIn, checkOut: checkOut, guests: guests, exemptGuests: exemptGuests, cribCount: cribCount, extraBedCount: extraBedCount });
  if (source === 'site') {
    await verifyPaidIntent(db, stripe, paymentIntentId, quote.amount);
  }
  const roomQuote = quote.rooms[0];

  const roomRef = db.collection('tourism_rooms').doc(roomId);
  const settingsRef = db.collection('tourism_settings').doc('site');
  const bookingRef = db.collection('tourism_bookings').doc();

  return db.runTransaction(async (tx) => {
    const roomSnap = await tx.get(roomRef);
    if (!roomSnap.exists) fail('not-found', 'Stanza non trovata.');
    const room = roomSnap.data();

    // Il letto singolo aggiuntivo alza il limite della stanza di 1 posto
    // (es. stanza per 2 -> fino a 3 con letto extra) — i bambini sotto i 3
    // anni non contano MAI in questo limite (vedi CHILD_ROOM_COUNT_MIN_AGE
    // lato client, affittacamere/js/app.js), quindi il numero "guests" che
    // arriva qui li ha già esclusi prima dell'invio.
    const effectiveMaxGuests = (room.maxGuests || 1) + (extraBedCount ? 1 : 0);
    if (guests > effectiveMaxGuests) fail('failed-precondition', 'Troppi ospiti per questa stanza.');
    const nights = Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
    if (nights < (room.minNights || 1)) fail('failed-precondition', 'Soggiorno più corto del minimo richiesto.');

    const blocked = Array.isArray(room.blockedRanges) ? room.blockedRanges : [];
    const overlap = blocked.some((r) => rangesOverlap(checkIn, checkOut, r.start, r.end));
    if (overlap) fail('already-exists', 'dates_taken');

    const guestFormToken = crypto.randomBytes(24).toString('hex');
    const touristTax = roomQuote.touristTax;

    // Prezzo autoritativo, già calcolato in quote sopra (dinamico stagionale/
    // festività o manuale per periodo, più eventuale sconto di gruppo): mai
    // ricalcolato qui, per restare sempre allineato a quanto mostrato/
    // addebitato all'ospite.
    const pricingData = {
      roomTotal: roomQuote.roomTotal, roomTotalBeforeDiscount: roomQuote.roomTotalBeforeDiscount,
      groupDiscountRate: roomQuote.groupDiscountRate, groupDiscountAmount: roomQuote.groupDiscountAmount,
      crib: roomQuote.crib, extraBed: roomQuote.extraBed,
      touristTax: touristTax.totalDue, total: roomQuote.total
    };

    // Pagata online -> confermata subito (nessuna approvazione manuale del
    // proprietario nel mezzo, vedi Condizioni di soggiorno). Le prenotazioni
    // manuali (bot/dashboard, mai pagate qui) restano 'nuovo' come prima.
    // 'site_test' (TEMPORANEO, vedi sopra) si comporta come 'site' per lo
    // status/consenso ma non ha mai un pagamento reale.
    const status = isSiteFlow ? 'confermato' : 'nuovo';
    const fee = source === 'site' ? computePaymentFee(pricingData.total) : 0;
    const bookingData = {
      roomId: roomId, roomLabel: room.name || roomId, checkIn: checkIn, checkOut: checkOut,
      nights: nights, guests: guests, exemptGuests: exemptGuests, name: name, email: email, phone: phone,
      bedType: bedType, cribCount: cribCount, extraBedCount: extraBedCount, pricing: pricingData, lang: lang,
      source: source, status: status, touristTax: touristTax, testBooking: source === 'site_test',
      payment: paymentIntentId ? { intentId: paymentIntentId, baseTotal: pricingData.total, fee: fee, chargedTotal: Math.round((pricingData.total + fee) * 100) / 100 } : null,
      contractAcceptedAt: isSiteFlow ? admin.firestore.FieldValue.serverTimestamp() : null,
      // Prima non veniva mai inizializzato: le query di
      // guest-lifecycle-emails.js filtrano su confirmationEmailSent == false,
      // e Firestore non fa mai match su un campo assente, quindi le email di
      // conferma automatica rischiavano di non partire mai per le
      // prenotazioni create senza questo campo esplicito.
      confirmationEmailSent: false,
      guestFormToken: guestFormToken, guestDocsComplete: false,
      alloggiatiWeb: { submitted: false, submittedAt: null, error: null },
      payTourist: { reported: false, reportedAt: null },
      cleaningNotified: { dayBefore: false, sameDay: false },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    tx.set(bookingRef, bookingData);

    const newBlockedRanges = blocked.concat([{ start: checkIn, end: checkOut, source: source === 'site' ? 'booking' : 'manual', bookingId: bookingRef.id }]);
    tx.update(roomRef, { blockedRanges: newBlockedRanges });

    return { id: bookingRef.id, guestFormToken: guestFormToken, nights: nights, touristTax: touristTax, pricing: pricingData, roomLabel: bookingData.roomLabel };
  });
}

// createGroupBookingCore — prenotazione di più stanze insieme (gruppo che
// non entra in una stanza sola) in un'UNICA transazione Firestore: o tutte
// le stanze richieste vengono prenotate atomicamente, o nessuna (se anche
// una sola stanza risulta appena occupata da qualcun altro, l'intero
// gruppo fallisce con dates_taken invece di lasciare prenotazioni parziali
// a metà). Scritta come funzione indipendente da createBookingCore (non la
// richiama, non la modifica) per non toccare la transazione a singola
// stanza già in uso — quella resta il percorso più delicato del sistema,
// vedi commento in testa al file.
async function createGroupBookingCore(admin, db, stripe, data) {
  const checkIn = data.checkIn;
  const checkOut = data.checkOut;
  const rooms = Array.isArray(data.rooms) ? data.rooms : [];
  const name = data.name;
  const email = data.email;
  const phone = data.phone || '';
  const contractAccepted = !!data.contractAccepted;
  const source = data.source || 'site';
  // TEMPORANEO — RIMUOVERE PRIMA DEL LANCIO PUBBLICO: vedi la stessa nota
  // in createBookingCore ('site_test' salta la verifica del pagamento).
  const isSiteFlow = source === 'site' || source === 'site_test';
  const paymentIntentId = data.paymentIntentId || null;
  const lang = data.lang === 'en' ? 'en' : 'it';

  if (!isValidDateStr(checkIn) || !isValidDateStr(checkOut) || checkIn >= checkOut) {
    fail('invalid-argument', 'Date non valide.');
  }
  if (rooms.length < 2 || rooms.length > 10) fail('invalid-argument', 'Numero di stanze del gruppo non valido.');
  if (!isNonEmptyString(name, 200) || !isNonEmptyString(email, 200)) fail('invalid-argument', 'Nome o email mancanti.');
  if (isSiteFlow && !contractAccepted) fail('failed-precondition', 'Condizioni di soggiorno non accettate.');
  if (source === 'site' && !isNonEmptyString(paymentIntentId, 200)) fail('failed-precondition', 'Pagamento mancante.');

  const roomIds = rooms.map((r) => r.roomId);
  if (new Set(roomIds).size !== roomIds.length) fail('invalid-argument', 'Ogni stanza del gruppo deve essere diversa dalle altre.');

  const specs = rooms.map((r) => {
    const guests = Number(r.guests);
    const exemptGuests = Number(r.exemptGuests) || 0;
    if (!isNonEmptyString(r.roomId, 50)) fail('invalid-argument', 'Stanza mancante nel gruppo.');
    if (!Number.isInteger(guests) || guests < 1 || guests > 20) fail('invalid-argument', 'Numero ospiti non valido per una delle stanze.');
    if (exemptGuests < 0 || exemptGuests > guests) fail('invalid-argument', 'Numero di esenti non valido.');
    return {
      roomId: r.roomId, guests: guests, exemptGuests: exemptGuests,
      bedType: r.bedType === 'singolo' ? 'singolo' : 'matrimoniale',
      cribCount: Math.max(0, Math.min(CRIB_MAX, Number(r.cribCount) || 0)),
      extraBedCount: Math.max(0, Math.min(EXTRA_BED_MAX, Number(r.extraBedCount) || 0))
    };
  });

  // Preventivo autoritativo condiviso (prezzo dinamico + sconto di gruppo,
  // vedi createBookingCore per lo stesso ragionamento): calcolato SEMPRE,
  // non solo per le prenotazioni dal sito, e mai ricalcolato più sotto.
  const quote = await computeQuoteCore(db, { checkIn: checkIn, checkOut: checkOut, rooms: specs });
  if (source === 'site') {
    await verifyPaidIntent(db, stripe, paymentIntentId, quote.amount);
  }
  const quoteByRoomId = {};
  quote.rooms.forEach((rq) => { quoteByRoomId[rq.roomId] = rq; });

  const groupId = crypto.randomBytes(12).toString('hex');
  const roomRefs = specs.map((s) => db.collection('tourism_rooms').doc(s.roomId));
  const bookingRefs = specs.map(() => db.collection('tourism_bookings').doc());

  return db.runTransaction(async (tx) => {
    const roomSnaps = await Promise.all(roomRefs.map((ref) => tx.get(ref)));

    const results = [];
    let grandTotal = 0;
    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i];
      const roomSnap = roomSnaps[i];
      if (!roomSnap.exists) fail('not-found', 'Una delle stanze del gruppo non esiste più.');
      const room = roomSnap.data();
      const roomQuote = quoteByRoomId[spec.roomId];

      const effectiveMaxGuests = (room.maxGuests || 1) + (spec.extraBedCount ? 1 : 0);
      if (spec.guests > effectiveMaxGuests) fail('failed-precondition', 'Troppi ospiti per una delle stanze del gruppo.');
      const nights = Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
      if (nights < (room.minNights || 1)) fail('failed-precondition', 'Soggiorno più corto del minimo richiesto per una delle stanze.');

      const blocked = Array.isArray(room.blockedRanges) ? room.blockedRanges : [];
      const overlap = blocked.some((r) => rangesOverlap(checkIn, checkOut, r.start, r.end));
      if (overlap) fail('already-exists', 'dates_taken');

      const guestFormToken = crypto.randomBytes(24).toString('hex');
      const touristTax = roomQuote.touristTax;
      const pricingData = {
        roomTotal: roomQuote.roomTotal, roomTotalBeforeDiscount: roomQuote.roomTotalBeforeDiscount,
        groupDiscountRate: roomQuote.groupDiscountRate, groupDiscountAmount: roomQuote.groupDiscountAmount,
        crib: roomQuote.crib, extraBed: roomQuote.extraBed,
        touristTax: touristTax.totalDue, total: roomQuote.total
      };
      grandTotal = Math.round((grandTotal + pricingData.total) * 100) / 100;

      // Pagata online -> confermata subito, stesso ragionamento di
      // createBookingCore. Un solo PaymentIntent copre tutte le stanze del
      // gruppo: ogni prenotazione registra il proprio baseTotal (per capire
      // quanto rimborsarle se il gruppo viene cancellato) più lo stesso
      // intentId condiviso.
      const status = isSiteFlow ? 'confermato' : 'nuovo';
      const fee = source === 'site' ? computePaymentFee(pricingData.total) : 0;
      const bookingData = {
        roomId: spec.roomId, roomLabel: room.name || spec.roomId, checkIn: checkIn, checkOut: checkOut,
        nights: nights, guests: spec.guests, exemptGuests: spec.exemptGuests, name: name, email: email, phone: phone,
        bedType: spec.bedType, cribCount: spec.cribCount, extraBedCount: spec.extraBedCount, pricing: pricingData, lang: lang,
        source: source, status: status, touristTax: touristTax, testBooking: source === 'site_test',
        payment: paymentIntentId ? { intentId: paymentIntentId, baseTotal: pricingData.total, fee: fee, chargedTotal: Math.round((pricingData.total + fee) * 100) / 100 } : null,
        groupId: groupId, groupSize: specs.length,
        contractAcceptedAt: isSiteFlow ? admin.firestore.FieldValue.serverTimestamp() : null,
        confirmationEmailSent: false,
        guestFormToken: guestFormToken, guestDocsComplete: false,
        alloggiatiWeb: { submitted: false, submittedAt: null, error: null },
        payTourist: { reported: false, reportedAt: null },
        cleaningNotified: { dayBefore: false, sameDay: false },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      tx.set(bookingRefs[i], bookingData);
      const newBlockedRanges = blocked.concat([{ start: checkIn, end: checkOut, source: source === 'site' ? 'booking' : 'manual', bookingId: bookingRefs[i].id }]);
      tx.update(roomRefs[i], { blockedRanges: newBlockedRanges });

      results.push({ id: bookingRefs[i].id, roomId: spec.roomId, guestFormToken: guestFormToken, nights: nights, touristTax: touristTax, pricing: pricingData, roomLabel: bookingData.roomLabel });
    }

    return { groupId: groupId, bookings: results, grandTotal: grandTotal };
  });
}

// computeQuoteCore — ricalcola il totale autoritativo (in euro) di una
// prenotazione a stanza singola o di gruppo, a partire dai soli
// identificativi delle stanze/date/ospiti — MAI dal totale inviato dal
// client. Usata da createPaymentIntent (functions/index.js) prima di
// creare l'addebito Stripe: l'importo dell'addebito deve sempre venire da
// qui, mai da un valore in euro passato dal browser (altrimenti un client
// malevolo potrebbe far pagare meno del dovuto). Sola lettura, nessuna
// transazione: qui si sta solo facendo un preventivo, la prenotazione
// vera e propria (con blocco delle date) resta a createBookingCore/
// createGroupBookingCore.
async function computeQuoteCore(db, data) {
  const checkIn = data.checkIn;
  const checkOut = data.checkOut;
  if (!isValidDateStr(checkIn) || !isValidDateStr(checkOut) || checkIn >= checkOut) {
    fail('invalid-argument', 'Date non valide.');
  }
  const nights = Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
  const rooms = Array.isArray(data.rooms) && data.rooms.length
    ? data.rooms
    : [{ roomId: data.roomId, guests: data.guests, exemptGuests: data.exemptGuests, cribCount: data.cribCount, extraBedCount: data.extraBedCount }];

  const settingsSnap = await db.collection('tourism_settings').doc('site').get();
  const settings = settingsSnap.exists ? settingsSnap.data() : {};
  const taxRate = Number(settings.touristTaxRate) || 0;

  // Occupazione attuale della struttura per il periodo cercato — un solo
  // valore condiviso da tutte le stanze del preventivo (di gruppo o
  // singola): il "prezzo di domanda" riflette quanto la struttura nel suo
  // insieme si sta riempiendo per quelle date, non stanza per stanza.
  const occupancyRatio = await pricing.computeOccupancyRatio(db, checkIn, checkOut);
  const discountRate = pricing.groupDiscountRate(rooms.length);

  const roomBreakdown = [];
  let baseTotal = 0;
  for (let i = 0; i < rooms.length; i++) {
    const r = rooms[i];
    if (!isNonEmptyString(r.roomId, 50)) fail('invalid-argument', 'Stanza mancante.');
    const roomSnap = await db.collection('tourism_rooms').doc(r.roomId).get();
    if (!roomSnap.exists) fail('not-found', 'Stanza non trovata.');
    const room = roomSnap.data();
    const guests = Number(r.guests) || 0;
    const exemptGuests = Math.max(0, Number(r.exemptGuests) || 0);
    const cribCount = Math.max(0, Math.min(CRIB_MAX, Number(r.cribCount) || 0));
    const extraBedCount = Math.max(0, Math.min(EXTRA_BED_MAX, Number(r.extraBedCount) || 0));

    // Anche dopo lo sconto di gruppo il prezzo stanza resta un euro intero
    // (mai centesimi): senza questo arrotondamento, applicare una percentuale
    // a un totale già intero reintrodurrebbe i centesimi (es. 264 * 0.92 =
    // 242.88).
    const roomTotalBeforeDiscount = pricing.roomStayTotal(room, checkIn, checkOut, occupancyRatio);
    const roomTotal = Math.round(roomTotalBeforeDiscount * (1 - discountRate));
    const groupDiscountAmount = Math.round(roomTotalBeforeDiscount - roomTotal);

    const taxableGuests = Math.max(0, guests - exemptGuests);
    const touristTaxDue = Math.round(taxRate * taxableGuests * nights * 100) / 100;
    const cribTotal = Math.round(cribCount * CRIB_PRICE * 100) / 100;
    const extraBedTotal = Math.round(extraBedCount * EXTRA_BED_PRICE * 100) / 100;
    const roomGrandTotal = Math.round((roomTotal + touristTaxDue + cribTotal + extraBedTotal) * 100) / 100;

    baseTotal = Math.round((baseTotal + roomGrandTotal) * 100) / 100;
    roomBreakdown.push({
      roomId: r.roomId, nights: nights,
      roomTotalBeforeDiscount: roomTotalBeforeDiscount, roomTotal: roomTotal,
      groupDiscountRate: discountRate, groupDiscountAmount: groupDiscountAmount,
      touristTax: { perNight: taxRate, totalGuests: guests, exemptGuests: exemptGuests, totalDue: touristTaxDue },
      crib: { count: cribCount, price: CRIB_PRICE, total: cribTotal },
      extraBed: { count: extraBedCount, price: EXTRA_BED_PRICE, total: extraBedTotal },
      total: roomGrandTotal
    });
  }
  const fee = computePaymentFee(baseTotal);
  return { baseTotal: baseTotal, fee: fee, amount: Math.round((baseTotal + fee) * 100) / 100, rooms: roomBreakdown, occupancyRatio: occupancyRatio };
}

// cancelBookingCore — cancellazione self-service da parte dell'ospite
// (nessun login: il token è la stessa chiave d'accesso già usata per
// ospiti.html). Rimborsa SOLO il costo del soggiorno (baseTotal): la
// commissione di pagamento non è mai rimborsabile (vedi PAYMENT_FEE_*
// sopra). Se la prenotazione fa parte di un gruppo (stesso groupId),
// cancella e rimborsa TUTTE le stanze del gruppo insieme in un solo
// rimborso Stripe sul PaymentIntent condiviso — un gruppo si cancella
// come un blocco unico, non stanza per stanza.
async function cancelBookingCore(admin, db, stripe, data) {
  const bookingId = data.bookingId;
  const token = data.token;
  if (!isNonEmptyString(bookingId, 100) || !isNonEmptyString(token, 200)) {
    fail('invalid-argument', 'Link non valido.');
  }
  const snap = await db.collection('tourism_bookings').doc(bookingId).get();
  if (!snap.exists || snap.data().guestFormToken !== token) fail('permission-denied', 'Link non valido o scaduto.');
  const booking = snap.data();
  if (booking.status === 'annullato') fail('failed-precondition', 'already-cancelled');
  if (booking.source !== 'site') fail('failed-precondition', 'Questa prenotazione non è stata pagata online: contatta il proprietario per la cancellazione.');
  if (!booking.payment || !booking.payment.intentId) fail('failed-precondition', 'Nessun pagamento registrato per questa prenotazione.');

  const now = new Date();
  const checkInDate = new Date(booking.checkIn + 'T00:00:00');
  const hoursToCheckIn = (checkInDate.getTime() - now.getTime()) / 3600000;
  if (hoursToCheckIn < CANCELLATION_CUTOFF_HOURS) fail('failed-precondition', 'cancellation_too_late');

  // Gruppo: raccoglie tutte le prenotazioni con lo stesso groupId (tutte
  // condividono lo stesso PaymentIntent, un solo rimborso per l'importo
  // complessivo di baseTotal).
  let bookingDocs = [{ id: bookingId, ref: snap.ref, data: booking }];
  if (booking.groupId) {
    const groupSnap = await db.collection('tourism_bookings').where('groupId', '==', booking.groupId).get();
    bookingDocs = groupSnap.docs.map((d) => ({ id: d.id, ref: d.ref, data: d.data() })).filter((b) => b.data.status !== 'annullato');
  }

  const refundBaseTotal = Math.round(bookingDocs.reduce((sum, b) => sum + (Number(b.data.payment && b.data.payment.baseTotal) || 0), 0) * 100) / 100;
  if (!(refundBaseTotal > 0)) fail('failed-precondition', 'Importo da rimborsare non valido.');

  // Idempotency key stabile per questa cancellazione: se batch.commit() più
  // sotto fallisce dopo un rimborso già riuscito e il client (o l'ospite)
  // rilancia cancelBooking, Stripe restituisce lo STESSO rimborso invece di
  // crearne un secondo. Se la chiave è comunque scaduta (>24h) o il gruppo è
  // già stato rimborsato per altra via, Stripe risponde con
  // 'charge_already_refunded': non è un errore reale (il denaro è già
  // tornato all'ospite), quindi si prosegue alla scrittura Firestore invece
  // di propagare un codice Stripe non valido per `new HttpsError(err.code,
  // ...)` in functions/index.js (che altrimenti lancerebbe a sua volta).
  try {
    await stripe.refunds.create({
      payment_intent: booking.payment.intentId,
      amount: Math.round(refundBaseTotal * 100)
    }, { idempotencyKey: 'cancel-refund-' + (booking.groupId || bookingId) });
  } catch (err) {
    if (err.code !== 'charge_already_refunded') throw err;
  }

  // Transazione (non un batch): il vecchio codice leggeva room.blockedRanges
  // con una get() semplice e scriveva l'array intero dopo, fuori da qualunque
  // transazione — se createBookingCore committava una prenotazione vera nella
  // finestra fra la lettura e la scrittura qui, quello sblocco stale poteva
  // cancellare silenziosamente il blocco appena creato. tx.get()+tx.update()
  // fa sì che Firestore riprovi l'intera transazione da capo se il documento
  // stanza cambia nel frattempo, stesso pattern di createBookingCore/
  // createGroupBookingCore più sopra.
  const cancelledAt = admin.firestore.FieldValue.serverTimestamp();
  await db.runTransaction(async (tx) => {
    const roomRefs = bookingDocs.map((b) => db.collection('tourism_rooms').doc(b.data.roomId));
    const roomSnaps = await Promise.all(roomRefs.map((ref) => tx.get(ref)));
    for (let i = 0; i < bookingDocs.length; i++) {
      const b = bookingDocs[i];
      tx.update(b.ref, {
        status: 'annullato',
        cancellation: { cancelledAt: cancelledAt, cancelledBy: 'guest', refundAmount: Number(b.data.payment && b.data.payment.baseTotal) || 0, refunded: true }
      });
      const roomSnap = roomSnaps[i];
      if (roomSnap.exists) {
        const room = roomSnap.data();
        const newRanges = (room.blockedRanges || []).filter((r) => r.bookingId !== b.id);
        tx.update(roomRefs[i], { blockedRanges: newRanges });
      }
    }
  });

  return { refundedAmount: refundBaseTotal, bookingIds: bookingDocs.map((b) => b.id) };
}

function normalizeForMatch(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// lookupBookingForCancellationCore — trova una prenotazione senza il link
// con token (es. ospite che l'ha persa/cancellata), usata dal widget di
// assistenza. Chiede nome e cognome, email e data di check-in: i tre
// insieme sono già praticamente impossibili da indovinare per chi non è
// l'ospite. Query su checkIn (poche prenotazioni per data su una sola
// struttura), poi confronto normalizzato di nome ed email in memoria — così
// non serve un indice composto né campi "lower" duplicati sul documento.
// In caso di mancata corrispondenza (qualunque campo) risponde SEMPRE con
// lo stesso errore generico 'booking-not-found', senza mai rivelare quale
// dato è sbagliato. Se trovata, restituisce bookingId/token: da qui in poi
// il client procede esattamente come se fosse arrivato dal link email,
// riusando cancelBookingCore senza duplicare la logica di rimborso/termini.
async function lookupBookingForCancellationCore(db, data) {
  const fullName = normalizeForMatch(data.fullName);
  const email = normalizeForMatch(data.email);
  const checkIn = isNonEmptyString(data.checkIn, 10) && isValidDateStr(data.checkIn) ? data.checkIn : '';
  if (!fullName || !email || !checkIn) fail('invalid-argument', 'Compila tutti i campi.');

  const snap = await db.collection('tourism_bookings').where('checkIn', '==', checkIn).get();
  const match = snap.docs.find((doc) => {
    const b = doc.data();
    return b.source === 'site' && b.status !== 'annullato' &&
      normalizeForMatch(b.name) === fullName && normalizeForMatch(b.email) === email;
  });
  if (!match) fail('not-found', 'booking-not-found');

  const b = match.data();
  return { bookingId: match.id, token: b.guestFormToken };
}

module.exports = { createBookingCore, createGroupBookingCore, computeQuoteCore, cancelBookingCore, lookupBookingForCancellationCore, computePaymentFee, CANCELLATION_CUTOFF_HOURS };
