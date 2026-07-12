// Promemoria automatico del giorno prima per chi ha prenotato un tour.
// Eseguito una volta al giorno da .github/workflows/booking-reminders.yml
// (GitHub Actions, gratuito). Non gira nel browser: usa Firebase Admin SDK
// (bypassa le regole di sicurezza, autenticato con un service account) e
// l'API REST di EmailJS (serve la Private Key, diversa dalla Public Key
// usata nel sito).
'use strict';

var admin = require('firebase-admin');

// Stesso template EmailJS usato per la conferma immediata al visitatore
// (js/firebase-config.js → EMAILJS_CONFIG.visitorTemplateId). Aggiornalo
// qui se cambi quel valore.
var EMAILJS_VISITOR_TEMPLATE_ID = 'template_ldm6lmm';
var EMAILJS_SERVICE_ID = 'service_pgej8ka';
var EMAILJS_PUBLIC_KEY = 'wuB-uArgD97brV8OX';
var EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY;

var serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
var db = admin.firestore();

function tomorrowISO() {
  var d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function sendEmail(templateParams) {
  return fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_VISITOR_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      accessToken: EMAILJS_PRIVATE_KEY,
      template_params: templateParams
    })
  }).then(function (res) {
    if (!res.ok) {
      return res.text().then(function (text) {
        throw new Error('EmailJS ha risposto ' + res.status + ': ' + text);
      });
    }
  });
}

async function main() {
  if (!EMAILJS_PRIVATE_KEY || EMAILJS_VISITOR_TEMPLATE_ID.indexOf('INCOLLA_QUI') !== -1) {
    console.log('Promemoria non configurati (manca EMAILJS_PRIVATE_KEY o il template id): esco senza fare nulla.');
    return;
  }
  var target = tomorrowISO();
  var snap = await db.collection('bookings').where('dateISO', '==', target).get();

  var sent = 0, skipped = 0;
  for (var i = 0; i < snap.docs.length; i++) {
    var doc = snap.docs[i];
    var b = doc.data();
    if (b.status === 'annullato' || b.reminderSent) { skipped++; continue; }
    try {
      await sendEmail({
        name: b.name || '', email: b.email || '', phone: b.phone || '',
        roomLabel: b.roomLabel || 'Casa Celeste', dateLabel: b.dateLabel || '',
        dateISO: b.dateISO || '', time: b.time || ''
      });
      await doc.ref.update({ reminderSent: true });
      sent++;
    } catch (err) {
      console.error('Errore invio promemoria per la prenotazione ' + doc.id + ':', err.message);
    }
  }
  console.log('Promemoria per il ' + target + ': inviati ' + sent + ', saltati ' + skipped + '.');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
