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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Opzioni stanza (letto a scelta, culla, letto singolo aggiuntivo) — vedi
// affittacamere/js/app.js per le stesse costanti lato client (CRIB_MAX,
// EXTRA_BED_MAX, CRIB_PRICE_PER_NIGHT, EXTRA_BED_PRICE_PER_NIGHT). Prezzi
// fittizi/placeholder, da tenere allineati manualmente nei due file finché
// non hanno una sola fonte di verità comune.
const CRIB_MAX = 1;
const EXTRA_BED_MAX = 1;
const CRIB_PRICE_PER_NIGHT = 8;
const EXTRA_BED_PRICE_PER_NIGHT = 15;

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

async function createBookingCore(admin, db, data) {
  const roomId = data.roomId;
  const checkIn = data.checkIn;
  const checkOut = data.checkOut;
  const guests = Number(data.guests);
  const exemptGuests = Number(data.exemptGuests) || 0;
  const name = data.name;
  const email = data.email;
  const phone = data.phone || '';
  const contractAccepted = !!data.contractAccepted;
  const source = data.source === 'site' ? 'site' : (data.source || 'site');
  const bedType = data.bedType === 'singolo' ? 'singolo' : 'matrimoniale';
  const cribCount = Math.max(0, Math.min(CRIB_MAX, Number(data.cribCount) || 0));
  const extraBedCount = Math.max(0, Math.min(EXTRA_BED_MAX, Number(data.extraBedCount) || 0));

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
  if (source === 'site' && !contractAccepted) {
    fail('failed-precondition', 'Condizioni di soggiorno non accettate.');
  }

  const roomRef = db.collection('tourism_rooms').doc(roomId);
  const settingsRef = db.collection('tourism_settings').doc('site');
  const bookingRef = db.collection('tourism_bookings').doc();

  return db.runTransaction(async (tx) => {
    const [roomSnap, settingsSnap] = await Promise.all([tx.get(roomRef), tx.get(settingsRef)]);
    if (!roomSnap.exists) fail('not-found', 'Stanza non trovata.');
    const room = roomSnap.data();
    const settings = settingsSnap.exists ? settingsSnap.data() : {};

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

    const taxRate = Number(settings.touristTaxRate) || 0;
    const taxableGuests = Math.max(0, guests - exemptGuests);
    const touristTax = {
      perNight: taxRate, totalGuests: guests, exemptGuests: exemptGuests,
      totalDue: Math.round(taxRate * taxableGuests * nights * 100) / 100
    };
    const guestFormToken = crypto.randomBytes(24).toString('hex');

    // Prezzo autoritativo: la stanza a notte + tassa di soggiorno + eventuali
    // opzioni extra (culla, letto singolo aggiuntivo) scelte dall'ospite.
    const roomTotal = Math.round(nights * (Number(room.nightlyPrice) || 0) * 100) / 100;
    const cribTotal = Math.round(cribCount * CRIB_PRICE_PER_NIGHT * nights * 100) / 100;
    const extraBedTotal = Math.round(extraBedCount * EXTRA_BED_PRICE_PER_NIGHT * nights * 100) / 100;
    const pricing = {
      roomTotal: roomTotal,
      crib: { count: cribCount, pricePerNight: CRIB_PRICE_PER_NIGHT, total: cribTotal },
      extraBed: { count: extraBedCount, pricePerNight: EXTRA_BED_PRICE_PER_NIGHT, total: extraBedTotal },
      touristTax: touristTax.totalDue,
      total: Math.round((roomTotal + touristTax.totalDue + cribTotal + extraBedTotal) * 100) / 100
    };

    const bookingData = {
      roomId: roomId, roomLabel: room.name || roomId, checkIn: checkIn, checkOut: checkOut,
      nights: nights, guests: guests, exemptGuests: exemptGuests, name: name, email: email, phone: phone,
      bedType: bedType, cribCount: cribCount, extraBedCount: extraBedCount, pricing: pricing,
      source: source, status: 'nuovo', touristTax: touristTax,
      contractAcceptedAt: source === 'site' ? admin.firestore.FieldValue.serverTimestamp() : null,
      guestFormToken: guestFormToken, guestDocsComplete: false,
      alloggiatiWeb: { submitted: false, submittedAt: null, error: null },
      payTourist: { reported: false, reportedAt: null },
      cleaningNotified: { dayBefore: false, sameDay: false },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    tx.set(bookingRef, bookingData);

    const newBlockedRanges = blocked.concat([{ start: checkIn, end: checkOut, source: source === 'site' ? 'booking' : 'manual', bookingId: bookingRef.id }]);
    tx.update(roomRef, { blockedRanges: newBlockedRanges });

    return { id: bookingRef.id, guestFormToken: guestFormToken, nights: nights, touristTax: touristTax, pricing: pricing, roomLabel: bookingData.roomLabel };
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
async function createGroupBookingCore(admin, db, data) {
  const checkIn = data.checkIn;
  const checkOut = data.checkOut;
  const rooms = Array.isArray(data.rooms) ? data.rooms : [];
  const name = data.name;
  const email = data.email;
  const phone = data.phone || '';
  const contractAccepted = !!data.contractAccepted;
  const source = data.source === 'site' ? 'site' : (data.source || 'site');

  if (!isValidDateStr(checkIn) || !isValidDateStr(checkOut) || checkIn >= checkOut) {
    fail('invalid-argument', 'Date non valide.');
  }
  if (rooms.length < 2 || rooms.length > 10) fail('invalid-argument', 'Numero di stanze del gruppo non valido.');
  if (!isNonEmptyString(name, 200) || !isNonEmptyString(email, 200)) fail('invalid-argument', 'Nome o email mancanti.');
  if (source === 'site' && !contractAccepted) fail('failed-precondition', 'Condizioni di soggiorno non accettate.');

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

  const groupId = crypto.randomBytes(12).toString('hex');
  const roomRefs = specs.map((s) => db.collection('tourism_rooms').doc(s.roomId));
  const settingsRef = db.collection('tourism_settings').doc('site');
  const bookingRefs = specs.map(() => db.collection('tourism_bookings').doc());

  return db.runTransaction(async (tx) => {
    const roomSnaps = await Promise.all(roomRefs.map((ref) => tx.get(ref)));
    const settingsSnap = await tx.get(settingsRef);
    const settings = settingsSnap.exists ? settingsSnap.data() : {};
    const taxRate = Number(settings.touristTaxRate) || 0;

    const results = [];
    let grandTotal = 0;
    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i];
      const roomSnap = roomSnaps[i];
      if (!roomSnap.exists) fail('not-found', 'Una delle stanze del gruppo non esiste più.');
      const room = roomSnap.data();

      const effectiveMaxGuests = (room.maxGuests || 1) + (spec.extraBedCount ? 1 : 0);
      if (spec.guests > effectiveMaxGuests) fail('failed-precondition', 'Troppi ospiti per una delle stanze del gruppo.');
      const nights = Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
      if (nights < (room.minNights || 1)) fail('failed-precondition', 'Soggiorno più corto del minimo richiesto per una delle stanze.');

      const blocked = Array.isArray(room.blockedRanges) ? room.blockedRanges : [];
      const overlap = blocked.some((r) => rangesOverlap(checkIn, checkOut, r.start, r.end));
      if (overlap) fail('already-exists', 'dates_taken');

      const taxableGuests = Math.max(0, spec.guests - spec.exemptGuests);
      const touristTax = {
        perNight: taxRate, totalGuests: spec.guests, exemptGuests: spec.exemptGuests,
        totalDue: Math.round(taxRate * taxableGuests * nights * 100) / 100
      };
      const guestFormToken = crypto.randomBytes(24).toString('hex');

      const roomTotal = Math.round(nights * (Number(room.nightlyPrice) || 0) * 100) / 100;
      const cribTotal = Math.round(spec.cribCount * CRIB_PRICE_PER_NIGHT * nights * 100) / 100;
      const extraBedTotal = Math.round(spec.extraBedCount * EXTRA_BED_PRICE_PER_NIGHT * nights * 100) / 100;
      const pricing = {
        roomTotal: roomTotal,
        crib: { count: spec.cribCount, pricePerNight: CRIB_PRICE_PER_NIGHT, total: cribTotal },
        extraBed: { count: spec.extraBedCount, pricePerNight: EXTRA_BED_PRICE_PER_NIGHT, total: extraBedTotal },
        touristTax: touristTax.totalDue,
        total: Math.round((roomTotal + touristTax.totalDue + cribTotal + extraBedTotal) * 100) / 100
      };
      grandTotal = Math.round((grandTotal + pricing.total) * 100) / 100;

      const bookingData = {
        roomId: spec.roomId, roomLabel: room.name || spec.roomId, checkIn: checkIn, checkOut: checkOut,
        nights: nights, guests: spec.guests, exemptGuests: spec.exemptGuests, name: name, email: email, phone: phone,
        bedType: spec.bedType, cribCount: spec.cribCount, extraBedCount: spec.extraBedCount, pricing: pricing,
        source: source, status: 'nuovo', touristTax: touristTax,
        groupId: groupId, groupSize: specs.length,
        contractAcceptedAt: source === 'site' ? admin.firestore.FieldValue.serverTimestamp() : null,
        guestFormToken: guestFormToken, guestDocsComplete: false,
        alloggiatiWeb: { submitted: false, submittedAt: null, error: null },
        payTourist: { reported: false, reportedAt: null },
        cleaningNotified: { dayBefore: false, sameDay: false },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      tx.set(bookingRefs[i], bookingData);
      const newBlockedRanges = blocked.concat([{ start: checkIn, end: checkOut, source: source === 'site' ? 'booking' : 'manual', bookingId: bookingRefs[i].id }]);
      tx.update(roomRefs[i], { blockedRanges: newBlockedRanges });

      results.push({ id: bookingRefs[i].id, roomId: spec.roomId, guestFormToken: guestFormToken, nights: nights, touristTax: touristTax, pricing: pricing, roomLabel: bookingData.roomLabel });
    }

    return { groupId: groupId, bookings: results, grandTotal: grandTotal };
  });
}

module.exports = { createBookingCore, createGroupBookingCore };
