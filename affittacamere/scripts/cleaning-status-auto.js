// Stato pulizie automatico — appena passa l'orario di check-out di una
// prenotazione, segna la stanza come "sporca" (se nessuno ha già toccato lo
// stato a mano nel frattempo). Solo lavagna di stato: l'avviso testuale ai
// destinatari pulizie resta compito di cleaning-reminders.js, per non
// mandare due notifiche diverse per lo stesso evento.
'use strict';
var lib = require('./_lib');
var admin = lib.initAdmin();
var db = admin.firestore();

async function main() {
  var settingsSnap = await db.collection('tourism_settings').doc('site').get();
  var settings = settingsSnap.exists ? settingsSnap.data() : {};
  var checkoutTime = settings.checkOutTime || '10:00';
  var now = lib.romeNow();

  var snap = await db.collection('tourism_bookings').where('checkOut', '==', now.dateISO).get();
  var updated = 0;
  for (var i = 0; i < snap.docs.length; i++) {
    var doc = snap.docs[i];
    var b = doc.data();
    if (b.status === 'annullato') continue;
    if (b.cleaningNotified && b.cleaningNotified.autoMarkedDirty) continue;

    var checkoutInstant = new Date(lib.romeWallTimeToUtcIso(b.checkOut, checkoutTime));
    if (new Date() < checkoutInstant) continue; // check-out non ancora avvenuto

    var roomRef = db.collection('tourism_rooms').doc(b.roomId);
    var roomSnap = await roomRef.get();
    if (!roomSnap.exists) continue;
    var room = roomSnap.data();
    var updatedAt = room.cleaningStatusUpdatedAt;
    var updatedAtMs = updatedAt && typeof updatedAt.toMillis === 'function' ? updatedAt.toMillis() : 0;
    // Se un umano (dashboard) o il bot (/pulizie) ha già aggiornato lo stato
    // DOPO questo check-out, non lo sovrascrive — rispetta un avanzamento
    // già fatto invece di riportarlo indietro a "sporca".
    if (updatedAtMs > checkoutInstant.getTime()) {
      await doc.ref.update({ 'cleaningNotified.autoMarkedDirty': true });
      continue;
    }

    await roomRef.update({
      cleaningStatus: 'sporca',
      cleaningStatusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      cleaningStatusUpdatedBy: { type: 'auto-cron' }
    });
    await doc.ref.update({ 'cleaningNotified.autoMarkedDirty': true });
    updated++;
  }
  console.log('Stato pulizie impostato automaticamente a "sporca" per ' + updated + ' stanze.');
}

main().catch(function (err) { console.error(err); process.exit(1); });
