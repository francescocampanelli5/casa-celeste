// Promemoria all'ospite se mancano ancora i documenti a poche ore dal
// check-in (altrimenti nessuno se ne accorge finché non è tardi per la
// scadenza legale delle 24h di Alloggiati Web). Passa dalla guardia quota
// EmailJS condivisa (vedi _lib.js) — priorità 1 (operativa, quasi mai
// saltata). Eseguito ogni ora, idempotente (flag guestDocsReminderSent).
'use strict';
var lib = require('./_lib');
var admin = lib.initAdmin();
var db = admin.firestore();

var TEMPLATE_ID = process.env.EMAILJS_TOURISM_DOCS_REMINDER_TEMPLATE_ID || '';

async function main() {
  var settingsSnap = await db.collection('tourism_settings').doc('site').get();
  var settings = settingsSnap.exists ? settingsSnap.data() : {};

  var now = lib.romeNow();
  var targetDate = lib.addDaysIso(now.dateISO, 1);
  var snap = await db.collection('tourism_bookings').where('checkIn', '==', targetDate).get();

  var sent = 0;
  for (var i = 0; i < snap.docs.length; i++) {
    var doc = snap.docs[i];
    var b = doc.data();
    if (b.status === 'annullato' || b.guestDocsComplete || b.guestDocsReminderSent) continue;
    try {
      var docsLink = (process.env.SITE_ORIGIN || 'https://lacasaceleste.it/affittacamere/') + 'ospiti.html?booking=' + doc.id + '&token=' + b.guestFormToken;
      var result = await lib.sendGuestEmail(db, settings, TEMPLATE_ID, {
        email: b.email || '', name: b.name || '', roomLabel: b.roomLabel || 'Casa Celeste',
        checkIn: b.checkIn || '', docsLink: docsLink
      }, 1, 'promemoria documenti (' + doc.id + ')');
      if (result.sent) { await doc.ref.update({ guestDocsReminderSent: true }); sent++; }
    } catch (err) {
      console.error('Errore invio promemoria documenti per ' + doc.id + ':', err.message);
    }
  }
  console.log('Promemoria documenti inviati: ' + sent + '.');
}

main().catch(function (err) { console.error(err); process.exit(1); });
