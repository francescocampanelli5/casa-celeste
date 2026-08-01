// Backup settimanale di prenotazioni/documenti ospiti/stanze/impostazioni —
// salvato in Firebase Storage (tourism-backups/, lettura riservata al
// proprietario, vedi storage.rules), MAI nel repository Git: la repo è
// PUBBLICA, un dump con nomi/date di nascita/numeri di documento degli
// ospiti committato lì sarebbe visibile a chiunque. Eseguito da
// .github/workflows/affittacamere-weekly-backup.yml.
'use strict';
var lib = require('./_lib');
var admin = lib.initAdmin();
var db = admin.firestore();
var bucket = admin.storage().bucket();

var COLLECTIONS = ['tourism_bookings', 'tourism_guestDocuments', 'tourism_verifiedGuests', 'tourism_rooms', 'tourism_settings'];
var KEEP_BACKUPS = 12; // ~3 mesi di storico con cadenza settimanale

async function notify(text) {
  try {
    var settingsSnap = await db.collection('tourism_settings').doc('site').get();
    var recipients = (settingsSnap.exists ? settingsSnap.data() : {}).bookingCommandAuthorized || [];
    await lib.telegramBroadcast(recipients, text);
  } catch (e) { console.error('Errore invio notifica Telegram:', e.message); }
}

async function main() {
  var now = lib.romeNow();
  var dump = {};
  for (var i = 0; i < COLLECTIONS.length; i++) {
    var snap = await db.collection(COLLECTIONS[i]).get();
    var docs = {};
    snap.forEach(function (d) { docs[d.id] = d.data(); });
    dump[COLLECTIONS[i]] = docs;
  }
  var json = JSON.stringify(dump);
  var path = 'tourism-backups/' + now.dateISO + '.json';
  await bucket.file(path).save(json, { contentType: 'application/json' });

  // Tiene solo gli ultimi KEEP_BACKUPS file, cancella i più vecchi — evita
  // una crescita indefinita dello spazio Storage nel tempo.
  var filesResult = await bucket.getFiles({ prefix: 'tourism-backups/' });
  var files = filesResult[0].sort(function (a, b) { return a.name < b.name ? 1 : -1; });
  var old = files.slice(KEEP_BACKUPS);
  await Promise.all(old.map(function (f) { return f.delete().catch(function () {}); }));

  var kb = (json.length / 1024).toFixed(0);
  console.log('Backup salvato: ' + path + ' (' + kb + ' KB, ' + old.length + ' vecchi rimossi).');
  await notify('💾 Backup settimanale completato (' + COLLECTIONS.length + ' collezioni, ' + kb + ' KB). Visibile in Firebase Console → Storage → tourism-backups/.');
}

main().catch(async function (err) {
  console.error(err);
  await notify('🚨 Backup settimanale FALLITO: ' + err.message + '. Verifica manualmente.');
  process.exit(1);
});
