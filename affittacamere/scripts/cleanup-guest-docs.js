// Pulizia dati sensibili — elimina la FOTO del documento d'identità (mai i
// dati tipizzati, quelli seguono la retention decisa con un consulente
// legale, vedi Impostazioni) SOLO quando ENTRAMBE le condizioni sono vere:
// 1) è già stata inviata ad Alloggiati Web/Questura (obbligo di legge
//    assolto), 2) sono passate almeno `guestDocsRetentionHours` (default 48,
//    decisione esplicita del proprietario) dal check-out. Coerente con le
//    indicazioni del Garante Privacy di non conservare copie di documenti
//    oltre lo stretto necessario. Eseguito una volta al giorno.
'use strict';
var lib = require('./_lib');
var admin = lib.initAdmin();
var db = admin.firestore();
var bucket = admin.storage().bucket();

async function deletePhotos(bookingId) {
  var prefix = 'tourism-guest-docs/' + bookingId + '/';
  var files = (await bucket.getFiles({ prefix: prefix }))[0];
  await Promise.all(files.map(function (f) { return f.delete().catch(function () {}); }));
  return files.length;
}

async function main() {
  var settingsSnap = await db.collection('tourism_settings').doc('site').get();
  var settings = settingsSnap.exists ? settingsSnap.data() : {};
  var retentionHours = Number(settings.guestDocsRetentionHours) || 48;
  var nowMs = Date.now();

  var guestDocsSnap = await db.collection('tourism_guestDocuments').get();
  var deleted = 0;
  for (var i = 0; i < guestDocsSnap.docs.length; i++) {
    var doc = guestDocsSnap.docs[i];
    var guests = doc.data().guests || [];
    if (!guests.some(function (g) { return g.docPhotoPath; })) continue;

    var bookingSnap = await db.collection('tourism_bookings').doc(doc.id).get();
    if (!bookingSnap.exists) continue;
    var booking = bookingSnap.data();

    var alreadySubmitted = !!(booking.alloggiatiWeb && booking.alloggiatiWeb.submitted);
    var checkoutMs = new Date(booking.checkOut + 'T00:00:00Z').getTime();
    var hoursSinceCheckout = (nowMs - checkoutMs) / 3600000;
    var shouldDelete = alreadySubmitted && hoursSinceCheckout >= retentionHours;
    if (!shouldDelete) continue;

    var n = await deletePhotos(doc.id);
    var cleanedGuests = guests.map(function (g) { var c = Object.assign({}, g); delete c.docPhotoPath; return c; });
    await doc.ref.update({ guests: cleanedGuests });
    deleted += n;
  }
  console.log('Pulizia documenti: ' + deleted + ' file eliminati (soglia: inviato + ' + retentionHours + 'h dal check-out).');
}

main().catch(function (err) { console.error(err); process.exit(1); });
