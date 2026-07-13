// Promemoria pulizie — due avvisi per ogni check-out (la sera prima e la
// mattina stessa, qualche ora prima delle 10:00), a TUTTI i destinatari
// abilitati in Impostazioni (cleaningRecipients). Eseguito ogni ora da
// .github/workflows/affittacamere-hourly.yml: calcola da solo l'ora locale
// Europe/Rome (a prova di cambio ora legale/solare) invece di fidarsi
// dell'orario UTC del cron, ed è idempotente (flag cleaningNotified.*) così
// più esecuzioni nella stessa finestra oraria non duplicano il messaggio.
'use strict';
var lib = require('./_lib');
var admin = lib.initAdmin();
var db = admin.firestore();

async function main() {
  if (!lib.telegramConfigured()) {
    console.log('TELEGRAM_BOT_TOKEN non configurato: esco senza inviare nulla.');
    return;
  }
  var now = lib.romeNow();
  var doDayBefore = now.hour >= 18 && now.hour <= 20;
  var doSameDay = now.hour >= 6 && now.hour <= 8;
  if (!doDayBefore && !doSameDay) { console.log('Fuori dalla finestra oraria dei promemoria (ora Roma: ' + now.hour + '), esco.'); return; }

  var settingsSnap = await db.collection('tourism_settings').doc('site').get();
  var settings = settingsSnap.exists ? settingsSnap.data() : {};
  var recipients = settings.cleaningRecipients || [];
  if (!recipients.some(function (r) { return r.enabled && r.chatId; })) {
    console.log('Nessun destinatario pulizie configurato, esco.');
    return;
  }
  var checkoutTime = settings.checkOutTime || '10:00';
  var checkinTime = settings.checkInTime || '15:00';

  var sent = 0;
  if (doDayBefore) sent += await notifyFor(lib.addDaysIso(now.dateISO, 1), 'dayBefore', recipients, checkoutTime, checkinTime, 'Domani');
  if (doSameDay) sent += await notifyFor(now.dateISO, 'sameDay', recipients, checkoutTime, checkinTime, 'Oggi');
  console.log('Promemoria pulizie inviati: ' + sent + '.');
}

async function notifyFor(checkoutDateIso, flagKey, recipients, checkoutTime, checkinTime, whenLabel) {
  var snap = await db.collection('tourism_bookings').where('checkOut', '==', checkoutDateIso).get();
  var count = 0;
  for (var i = 0; i < snap.docs.length; i++) {
    var doc = snap.docs[i];
    var b = doc.data();
    if (b.status === 'annullato') continue;
    var notified = (b.cleaningNotified || {})[flagKey];
    if (notified) continue;

    // Se lo stesso giorno c'è già un nuovo check-in nella stessa stanza, lo
    // segnaliamo come urgenza extra (pulizia da completare entro il nuovo
    // check-in, non solo "quando capita").
    var nextInSnap = await db.collection('tourism_bookings')
      .where('roomId', '==', b.roomId).where('checkIn', '==', checkoutDateIso).get();
    var hasNextCheckin = nextInSnap.docs.some(function (d) { return d.id !== doc.id && d.data().status !== 'annullato'; });

    var text = '🧹 Pulizie necessarie — ' + b.roomLabel + '\n' +
      whenLabel + ' (' + checkoutDateIso + '), check-out entro le ' + checkoutTime + '.\n' +
      'Promemoria: cambio lenzuola e asciugamani, controllo dotazioni bagno/cucina.' +
      (hasNextCheckin ? '\n⚠️ Nuovo ospite in arrivo lo STESSO giorno alle ' + checkinTime + ': pulizia urgente entro quell\'ora.' : '');

    await lib.telegramBroadcast(recipients, text);
    var patch = {}; patch['cleaningNotified.' + flagKey] = true;
    await doc.ref.update(patch);
    count++;
  }
  return count;
}

main().catch(function (err) { console.error(err); process.exit(1); });
