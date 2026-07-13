// Import iCal (Airbnb/Booking → sito) — legge gli URL iCal incollati in
// Impostazioni (icalImportUrls) e aggiorna blockedRanges di ogni stanza con
// le date occupate su quei canali (source 'airbnb'/'booking_com'), senza
// toccare i blocchi 'manual'/'booking' già presenti. Se un URL non è ancora
// configurato per una stanza, la salta senza errori (isConfigured pattern).
'use strict';
var ical = require('node-ical');
var lib = require('./_lib');
var admin = lib.initAdmin();
var db = admin.firestore();

function isoDate(d) { return d.toISOString().slice(0, 10); }

async function fetchBusyRanges(url) {
  var events = await ical.async.fromURL(url);
  var ranges = [];
  Object.keys(events).forEach(function (k) {
    var ev = events[k];
    if (ev.type !== 'VEVENT' || !ev.start || !ev.end) return;
    ranges.push({ start: isoDate(ev.start), end: isoDate(ev.end) });
  });
  return ranges;
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

    var kept = (room.blockedRanges || []).filter(function (r) { return r.source === 'manual' || r.source === 'booking'; });
    var fresh = kept.slice();

    if (urls.airbnb) {
      try {
        var airbnbRanges = await fetchBusyRanges(urls.airbnb);
        fresh = fresh.concat(airbnbRanges.map(function (r) { return Object.assign({ source: 'airbnb' }, r); }));
      } catch (err) { console.error('Errore import iCal Airbnb per ' + doc.id + ':', err.message); }
    }
    if (urls.booking) {
      try {
        var bookingRanges = await fetchBusyRanges(urls.booking);
        fresh = fresh.concat(bookingRanges.map(function (r) { return Object.assign({ source: 'booking_com' }, r); }));
      } catch (err) { console.error('Errore import iCal Booking.com per ' + doc.id + ':', err.message); }
    }

    await doc.ref.update({ blockedRanges: fresh });
    updated++;
  }
  console.log('Import iCal: ' + updated + ' stanze aggiornate.');
}

main().catch(function (err) { console.error(err); process.exit(1); });
