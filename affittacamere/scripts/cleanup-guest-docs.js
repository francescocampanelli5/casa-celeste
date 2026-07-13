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

// Sessioni abbandonate del wizard bot Telegram (tourism_botSessions, vedi
// functions/telegram-bot.js) — l'utente può sempre annullare con /annulla,
// ma se chiude la chat a metà la sessione resterebbe lì per sempre senza
// questa pulizia quotidiana. Soglia fissa (non è un dato sensibile con una
// retention decisa dal proprietario come le foto documento sopra).
var SESSION_STALE_HOURS = 24;
async function cleanupStaleSessions() {
  var snap = await db.collection('tourism_botSessions').get();
  var now = Date.now();
  var deleted = 0;
  for (var i = 0; i < snap.docs.length; i++) {
    var doc = snap.docs[i];
    var updatedAt = doc.data().updatedAt;
    var updatedMs = updatedAt && updatedAt.toDate ? updatedAt.toDate().getTime() : 0;
    if (!updatedMs || (now - updatedMs) / 3600000 >= SESSION_STALE_HOURS) {
      await doc.ref.delete();
      deleted++;
    }
  }
  return deleted;
}

// Foto temporanee orfane in tourism-guest-docs-tmp/ — caricate durante una
// compilazione (form ospiti.html o wizard bot) mai completata. Non c'è un
// indice diretto "quali booking hanno ancora una prenotazione valida", ma
// ogni sottocartella è già nominata con il bookingId: se quel booking non
// esiste più (o è più vecchio di un giorno), il file è sicuramente orfano.
var TMP_ORPHAN_HOURS = 24;
async function cleanupOrphanedTempPhotos() {
  var files = (await bucket.getFiles({ prefix: 'tourism-guest-docs-tmp/' }))[0];
  var now = Date.now();
  var deleted = 0;
  var checkedBookingIds = {};
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    var ageHours = (now - new Date(f.metadata.timeCreated).getTime()) / 3600000;
    if (ageHours < TMP_ORPHAN_HOURS) continue;
    var bookingId = f.name.split('/')[1];
    if (bookingId && !(bookingId in checkedBookingIds)) {
      var bsnap = await db.collection('tourism_bookings').doc(bookingId).get();
      checkedBookingIds[bookingId] = bsnap.exists;
    }
    if (!bookingId || !checkedBookingIds[bookingId]) {
      await f.delete().catch(function () {});
      deleted++;
    }
  }
  return deleted;
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

  var staleSessions = await cleanupStaleSessions();
  console.log('Pulizia sessioni bot Telegram: ' + staleSessions + ' sessioni scadute eliminate (soglia: ' + SESSION_STALE_HOURS + 'h di inattività).');

  var orphanedTmp = await cleanupOrphanedTempPhotos();
  console.log('Pulizia foto temporanee orfane: ' + orphanedTmp + ' file eliminati.');
}

main().catch(function (err) { console.error(err); process.exit(1); });
