// Import calendari esterni (Airbnb/Booking/Vrbo/qualsiasi altra piattaforma
// con un feed iCal → sito) — legge un numero qualsiasi di piattaforme per
// stanza, configurate in Impostazioni → Sincronizzazione calendario
// (icalChannels, vedi affittacamere/js/dashboard.js). Per ogni prenotazione
// trovata sul feed esterno crea/aggiorna/elimina una vera prenotazione in
// tourism_bookings (source = id univoco del canale, es. 'manual_airbnb' o
// 'manual_<id generato per una piattaforma aggiunta dalla dashboard>',
// externalUid = UID stabile dell'evento iCal per riconoscerla ai run
// successivi), così che compaia nella tab "Prenotazioni" della Dashboard
// esattamente come una prenotazione dal sito o inserita a mano — e
// cancellarla da lì libera le notti bloccate esattamente allo stesso modo
// (stesso bookingId sul blockedRanges della stanza, stessa
// deleteBookingAndFreeDates). Non tocca i blocchi 'manual' (blocchi
// calendario senza ospite, aggiunti dalla tab Stanze) né 'booking'
// (prenotazioni dal sito/telefono/ecc.).
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

// Punto di estensione: un connettore per canale, indicizzato per id (non per
// nome piattaforma — un canale aggiunto dalla dashboard può chiamarsi
// "Vrbo", "Vrbo Italia" o come vuoi, l'id interno resta stabile). Oggi ogni
// canale, vecchio o nuovo, usa iCal (vedi CHANNEL_CONNECTOR_DEFAULT più
// sotto). Il giorno in cui UNO specifico canale avrà un'API reale, aggiungi
// qui la entry con il suo id (es. manual_airbnb: fetchBusyEventsFromApi) —
// tutti gli altri canali continuano a usare iCal senza altre modifiche.
var CHANNEL_CONNECTORS = {};
var CHANNEL_CONNECTOR_DEFAULT = fetchBusyEventsFromIcal;

// Un canale legacy (icalImportUrls, prima che esistesse la lista dinamica
// per stanza) viene incluso solo se non è già presente tra i canali nuovi
// (icalChannels, stesso id) — evita di sincronizzarlo due volte se la
// dashboard lo ha già "migrato" al primo edit su quella stanza (vedi
// dashboard.js, icalChannelsForRoom). Gli id 'manual_airbnb'/'manual_booking'
// restano fissi qui per continuità con le prenotazioni già sincronizzate in
// passato sotto questi stessi source.
function effectiveChannels(newChannels, legacyUrls) {
  var list = (newChannels || []).slice();
  var knownIds = {};
  list.forEach(function (c) { knownIds[c.id] = true; });
  var legacy = legacyUrls || {};
  if (legacy.airbnb && !knownIds.manual_airbnb) list.push({ id: 'manual_airbnb', label: 'Airbnb', url: legacy.airbnb });
  if (legacy.booking && !knownIds.manual_booking) list.push({ id: 'manual_booking', label: 'Booking.com', url: legacy.booking });
  return list;
}

// Sincronizza un singolo canale (una piattaforma, qualsiasi) per una
// stanza: legge le prenotazioni esterne già note in tourism_bookings (per
// externalUid), le confronta con quelle appena scaricate dal feed e
// applica create/aggiorna/elimina. Ritorna il nuovo array di blockedRanges
// SOLO per le voci di questo canale (bookingId -> {start,end}), da fondere
// col resto fuori da questa funzione.
async function syncChannel(roomId, roomLabel, source, sourceLabel, freshEvents) {
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
        name: '(prenotazione ' + sourceLabel + ' — dettagli sulla piattaforma)', email: '', phone: '',
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
  var settings = settingsSnap.exists ? settingsSnap.data() : {};
  var icalChannelsByRoom = settings.icalChannels || {};
  var legacyUrlsByRoom = settings.icalImportUrls || {};

  var roomsSnap = await db.collection('tourism_rooms').get();
  var updated = 0;
  for (var i = 0; i < roomsSnap.docs.length; i++) {
    var doc = roomsSnap.docs[i];
    var room = doc.data();
    var channels = effectiveChannels(icalChannelsByRoom[doc.id], legacyUrlsByRoom[doc.id]).filter(function (c) { return c.url; });
    if (!channels.length) continue;

    // I blocchi 'manual' (Stanze) e 'booking' (prenotazioni sito/telefono)
    // non sono gestiti da questo script: si toccano solo quelli con
    // bookingId riconducibile a una prenotazione creata qui (source =
    // channel.id).
    var toRemoveIds = [];
    var toAddRanges = [];

    for (var c = 0; c < channels.length; c++) {
      var channel = channels[c];
      try {
        var connector = CHANNEL_CONNECTORS[channel.id] || CHANNEL_CONNECTOR_DEFAULT;
        var events = await connector(channel.url);
        var patch = await syncChannel(doc.id, room.name, channel.id, channel.label || channel.id, events);
        toRemoveIds = toRemoveIds.concat(patch.toRemove);
        toAddRanges = toAddRanges.concat(patch.toAdd.map(function (r) { return { start: r.start, end: r.end, source: 'manual', bookingId: r.bookingId }; }));
      } catch (err) { console.error('Errore import ' + (channel.label || channel.id) + ' per ' + doc.id + ':', err.message); }
    }

    if (!toRemoveIds.length && !toAddRanges.length) continue;

    // Rilettura fresca DENTRO una transazione, non un `current` catturato
    // prima del loop di chiamate di rete qui sopra: quel loop può durare
    // secondi/minuti (un feed lento, più piattaforme), e se una prenotazione
    // vera arriva dal sito in quella finestra la sua voce in blockedRanges
    // non deve sparire quando scriviamo qui sotto. tx.get()+tx.update() fa
    // riprovare l'intera operazione se il documento stanza cambia nel
    // frattempo, stesso pattern di functions/booking-logic.js.
    await db.runTransaction(async function (tx) {
      var freshSnap = await tx.get(doc.ref);
      var freshBlocked = (freshSnap.exists && freshSnap.data().blockedRanges) || [];
      var merged = freshBlocked.filter(function (r) { return toRemoveIds.indexOf(r.bookingId) === -1; }).concat(toAddRanges);
      tx.update(doc.ref, { blockedRanges: merged });
    });
    updated++;
  }
  console.log('Import calendari esterni: ' + updated + ' stanze aggiornate.');
}

module.exports = {
  syncChannel: syncChannel, fetchBusyEventsFromIcal: fetchBusyEventsFromIcal,
  CHANNEL_CONNECTORS: CHANNEL_CONNECTORS, effectiveChannels: effectiveChannels, main: main
};

if (require.main === module) {
  main().catch(function (err) { console.error(err); process.exit(1); });
}
