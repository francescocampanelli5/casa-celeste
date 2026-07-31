// Import iCal (Airbnb/Booking → sito) — legge gli URL iCal incollati in
// Impostazioni (icalImportUrls). Per ogni prenotazione trovata sul feed
// esterno crea/aggiorna/elimina una vera prenotazione in tourism_bookings
// (source 'manual_airbnb'/'manual_booking', externalUid = UID stabile
// dell'evento iCal per riconoscerla ai run successivi), così che compaia
// nella tab "Prenotazioni" della Dashboard esattamente come una
// prenotazione dal sito o inserita a mano — e cancellarla da lì libera le
// notti bloccate esattamente allo stesso modo (stesso bookingId sul
// blockedRanges della stanza, stessa deleteBookingAndFreeDates).
// Non tocca i blocchi 'manual' (blocchi calendario senza ospite, aggiunti
// dalla tab Stanze) né 'booking' (prenotazioni dal sito/telefono/ecc.).
'use strict';
var ical = require('node-ical');
var lib = require('./_lib');
var admin = lib.initAdmin();
var db = admin.firestore();

function isoDate(d) { return d.toISOString().slice(0, 10); }
function daysBetween(aIso, bIso) { return Math.round((new Date(bIso) - new Date(aIso)) / 86400000); }

// Connettore iCal — implementa il contratto standard di canale:
//   async (config) -> [{ uid, start /* YYYY-MM-DD */, end }, ...]
// config qui è l'URL del feed iCal incollato in Impostazioni. syncChannel()
// più sotto lavora solo su questo array, senza sapere da dove arriva: per
// sostituire iCal con un'API reale quando Airbnb/Booking.com la
// concederanno (es. tramite un channel manager certificato), basta scrivere
// una nuova funzione con lo stesso contratto e cambiare il riferimento in
// CHANNEL_CONNECTORS qui sotto — nessun'altra riga di questo file o della
// dashboard deve cambiare.
async function fetchBusyEventsFromIcal(url) {
  var events = await ical.async.fromURL(url);
  var list = [];
  Object.keys(events).forEach(function (k) {
    var ev = events[k];
    if (ev.type !== 'VEVENT' || !ev.start || !ev.end) return;
    list.push({ uid: String(ev.uid || k), start: isoDate(ev.start), end: isoDate(ev.end) });
  });
  return list;
}

// Punto di estensione: un connettore per canale. Oggi entrambi usano iCal;
// il giorno in cui uno dei due passa a un'API reale, sostituisci solo la
// entry corrispondente (es. manual_booking: fetchBusyEventsFromBookingApi).
var CHANNEL_CONNECTORS = { manual_airbnb: fetchBusyEventsFromIcal, manual_booking: fetchBusyEventsFromIcal };

var CHANNEL_LABEL = { manual_airbnb: 'Airbnb', manual_booking: 'Booking.com' };

// Sincronizza un singolo canale (Airbnb o Booking.com) per una stanza:
// legge le prenotazioni esterne già note in tourism_bookings (per
// externalUid), le confronta con quelle appena scaricate dal feed e
// applica create/aggiorna/elimina. Ritorna il nuovo array di blockedRanges
// SOLO per le voci di questo canale (bookingId -> {start,end}), da fondere
// col resto fuori da questa funzione.
async function syncChannel(roomId, roomLabel, source, freshEvents) {
  var patch = { toAdd: [], toRemove: [] }; // blockedRanges patch: {bookingId,start,end} da aggiungere/rimuovere
  var existingSnap = await db.collection('tourism_bookings')
    .where('roomId', '==', roomId).where('source', '==', source).get();
  var existingByUid = {};
  existingSnap.docs.forEach(function (doc) {
    var d = doc.data();
    if (d.externalUid) existingByUid[d.externalUid] = { id: doc.id, data: d };
  });

  var freshByUid = {};
  freshEvents.forEach(function (e) { freshByUid[e.uid] = e; });

  var batch = db.batch();
  var writes = 0;

  // Nuove o con date cambiate rispetto all'ultimo sync.
  freshEvents.forEach(function (e) {
    var existing = existingByUid[e.uid];
    if (!existing) {
      var ref = db.collection('tourism_bookings').doc();
      var nights = Math.max(1, daysBetween(e.start, e.end));
      batch.set(ref, {
        roomId: roomId, roomLabel: roomLabel, checkIn: e.start, checkOut: e.end, nights: nights,
        guests: 0, exemptGuests: 0,
        name: '(prenotazione ' + CHANNEL_LABEL[source] + ' — dettagli sulla piattaforma)', email: '', phone: '',
        bedType: null, cribCount: 0, extraBedCount: 0, pricing: null, touristTax: null,
        source: source, status: 'confermato', payment: null, contractAcceptedAt: null,
        // Niente email nostre da inviare per un ospite che non ha prenotato
        // sul sito (non abbiamo un indirizzo reale a cui scrivere).
        confirmationEmailSent: true, thankYouEmailSent: true, checkinInstructionsEmailSent: false,
        guestFormToken: null, guestDocsComplete: false, identityVerified: null,
        alloggiatiWeb: { submitted: false, submittedAt: null, error: null },
        payTourist: { reported: false, reportedAt: null },
        cleaningNotified: { dayBefore: false, sameDay: false },
        externalUid: e.uid, missingSince: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      writes++;
      patch.toAdd.push({ bookingId: ref.id, start: e.start, end: e.end });
    } else if (existing.data.checkIn !== e.start || existing.data.checkOut !== e.end) {
      var nights2 = Math.max(1, daysBetween(e.start, e.end));
      batch.update(db.collection('tourism_bookings').doc(existing.id), { checkIn: e.start, checkOut: e.end, nights: nights2, missingSince: null });
      writes++;
      patch.toRemove.push(existing.id);
      patch.toAdd.push({ bookingId: existing.id, start: e.start, end: e.end });
    } else if (existing.data.missingSince) {
      // Era sparita momentaneamente da un run precedente ed è ricomparsa
      // (falso allarme, es. glitch del feed): annulla il "sospetto".
      batch.update(db.collection('tourism_bookings').doc(existing.id), { missingSince: null });
      writes++;
    }
  });

  // Non più presenti sul feed esterno. Un feed che sparisce di colpo è
  // spesso un problema temporaneo di rete/parsing lato host esterno più
  // che una cancellazione reale (rarissimo che un intero calendario si
  // svuoti in un colpo solo): liberare quelle notti per errore aprirebbe
  // alla stessa doppia prenotazione che la verifica del pagamento serve a
  // evitare. Per questo una prenotazione va cancellata solo se risulta
  // assente per DUE sync consecutivi (~10 minuti): il primo run la segna
  // solo come "sospetta" (missingSince), il secondo la conferma cancellata.
  existingSnap.docs.forEach(function (doc) {
    var d = doc.data();
    if (!d.externalUid || freshByUid[d.externalUid]) return;
    if (d.missingSince) {
      batch.delete(doc.ref);
      writes++;
      patch.toRemove.push(doc.id);
    } else {
      batch.update(doc.ref, { missingSince: admin.firestore.FieldValue.serverTimestamp() });
      writes++;
    }
  });

  if (writes) await batch.commit();
  return patch;
}

async function main() {
  var settingsSnap = await db.collection('tourism_settings').doc('site').get();
  var icalImportUrls = (settingsSnap.exists ? settingsSnap.data() : {}).icalImportUrls || {};

  var roomsSnap = await db.collection('tourism_rooms').get();
  var updated = 0;
  for (var i = 0; i < roomsSnap.docs.length; i++) {
    var doc = roomsSnap.docs[i];
    var room = doc.data();
    var urls = icalImportUrls[doc.id] || {};
    if (!urls.airbnb && !urls.booking) continue;

    // I blocchi 'manual' (Stanze) e 'booking' (prenotazioni sito/telefono)
    // non sono gestiti da questo script: si toccano solo quelli con
    // bookingId riconducibile a una prenotazione 'manual_airbnb'/
    // 'manual_booking' create qui.
    var current = (room.blockedRanges || []).slice();
    var toRemoveIds = [];
    var toAddRanges = [];

    if (urls.airbnb) {
      try {
        var airbnbEvents = await CHANNEL_CONNECTORS.manual_airbnb(urls.airbnb);
        var pA = await syncChannel(doc.id, room.name, 'manual_airbnb', airbnbEvents);
        toRemoveIds = toRemoveIds.concat(pA.toRemove);
        toAddRanges = toAddRanges.concat(pA.toAdd.map(function (r) { return { start: r.start, end: r.end, source: 'manual', bookingId: r.bookingId }; }));
      } catch (err) { console.error('Errore import Airbnb per ' + doc.id + ':', err.message); }
    }
    if (urls.booking) {
      try {
        var bookingEvents = await CHANNEL_CONNECTORS.manual_booking(urls.booking);
        var pB = await syncChannel(doc.id, room.name, 'manual_booking', bookingEvents);
        toRemoveIds = toRemoveIds.concat(pB.toRemove);
        toAddRanges = toAddRanges.concat(pB.toAdd.map(function (r) { return { start: r.start, end: r.end, source: 'manual', bookingId: r.bookingId }; }));
      } catch (err) { console.error('Errore import Booking.com per ' + doc.id + ':', err.message); }
    }

    if (!toRemoveIds.length && !toAddRanges.length) continue;

    var fresh = current.filter(function (r) { return toRemoveIds.indexOf(r.bookingId) === -1; }).concat(toAddRanges);
    await doc.ref.update({ blockedRanges: fresh });
    updated++;
  }
  console.log('Import iCal: ' + updated + ' stanze aggiornate.');
}

module.exports = { syncChannel: syncChannel, fetchBusyEventsFromIcal: fetchBusyEventsFromIcal, CHANNEL_CONNECTORS: CHANNEL_CONNECTORS, main: main };

if (require.main === module) {
  main().catch(function (err) { console.error(err); process.exit(1); });
}
