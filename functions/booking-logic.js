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

    if (guests > (room.maxGuests || 1)) fail('failed-precondition', 'Troppi ospiti per questa stanza.');
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

module.exports = { createBookingCore };
