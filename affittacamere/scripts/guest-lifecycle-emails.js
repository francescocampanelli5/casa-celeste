// Email al ciclo di vita della prenotazione — conferma, istruzioni
// check-in (con eventuale videochiamata Google Meet per la verifica
// documento) e ringraziamento post-soggiorno. Ognuna passa dalla guardia
// quota EmailJS condivisa (vedi _lib.js): saltata (con avviso Telegram al
// proprietario) se la quota mensile si avvicina al limite, dando priorità
// alle email operative rispetto al ringraziamento.
//
// Perché una videochiamata invece di un servizio di riconoscimento
// biometrico a pagamento (Stripe Identity/AWS Rekognition): l'obbligo di
// legge (Alloggiati Web) richiede di raccogliere e comunicare i dati del
// documento, non una verifica biometrica — una breve videochiamata
// (gratuita, zero dati biometrici elaborati/salvati) copre lo stesso
// bisogno pratico di "vedere che la persona coincide col documento" senza
// costi e senza la categoria di dati GDPR più delicata. SPID/CIE come
// alternativa per cittadini italiani richiederebbe un accreditamento come
// Service Provider presso AgID/Ministero dell'Interno — non automatizzabile
// da qui, eventuale sviluppo futuro se vorrai intraprendere quella strada.
'use strict';
var lib = require('./_lib');
var admin = lib.initAdmin();
var db = admin.firestore();

var TPL_CONFIRMATION = process.env.EMAILJS_TOURISM_CONFIRMATION_TEMPLATE_ID || '';
var TPL_CHECKIN = process.env.EMAILJS_TOURISM_CHECKIN_TEMPLATE_ID || '';
var TPL_THANKYOU = process.env.EMAILJS_TOURISM_THANKYOU_TEMPLATE_ID || '';

function siteOrigin() { return process.env.SITE_ORIGIN || 'https://lacasaceleste.it/affittacamere/'; }

async function sendConfirmation(settings, doc, b) {
  var docsLink = siteOrigin() + 'ospiti.html?booking=' + doc.id + '&token=' + b.guestFormToken;
  var result = await lib.sendGuestEmail(db, settings, TPL_CONFIRMATION, {
    email: b.email || '', name: b.name || '', roomLabel: b.roomLabel || 'Casa Celeste',
    checkIn: b.checkIn || '', checkOut: b.checkOut || '', nights: b.nights || 0, guests: b.guests || 1,
    totalDue: (b.touristTax && b.touristTax.totalDue) || 0, docsLink: docsLink,
    checkInTime: settings.checkInTime || '15:00', checkOutTime: settings.checkOutTime || '10:00',
    hostPhone: settings.managerPhone || settings.phone || ''
  }, 2, 'conferma prenotazione (' + doc.id + ')');
  if (result.sent) await doc.ref.update({ confirmationEmailSent: true });
  return result.sent;
}

async function sendCheckinInstructions(settings, doc, b) {
  var meetLink = await lib.createGoogleMeetLink(
    'Casa Celeste — verifica documento, ' + b.roomLabel,
    'Breve videochiamata per verificare il documento di ' + b.name + ' prima del check-in del ' + b.checkIn + '.',
    new Date().toISOString()
  );
  var result = await lib.sendGuestEmail(db, settings, TPL_CHECKIN, {
    email: b.email || '', name: b.name || '', roomLabel: b.roomLabel || 'Casa Celeste',
    checkIn: b.checkIn || '', checkInTime: settings.checkInTime || '15:00',
    address: 'Via Giuseppe Can. del Drago 9, Monopoli (BA)',
    checkInInstructions: (settings.checkInInstructionsText && settings.checkInInstructionsText.it) || '',
    wifiName: settings.wifiName || '', wifiPassword: settings.wifiPassword || '',
    videoCallLink: meetLink || '', videoCallNote: meetLink ? '' : 'Ti contatteremo a breve per organizzare una brevissima videochiamata di verifica.',
    hostPhone: settings.managerPhone || settings.phone || ''
  }, 1, 'istruzioni check-in (' + doc.id + ')');
  if (result.sent) {
    var patch = { checkinInstructionsEmailSent: true };
    if (meetLink) patch.videoCallLink = meetLink;
    await doc.ref.update(patch);
  }
  return result.sent;
}

async function sendThankYou(settings, doc, b) {
  var result = await lib.sendGuestEmail(db, settings, TPL_THANKYOU, {
    email: b.email || '', name: b.name || '', roomLabel: b.roomLabel || 'Casa Celeste',
    reviewLink: settings.reviewLink || ''
  }, 3, 'ringraziamento check-out (' + doc.id + ')');
  if (result.sent) await doc.ref.update({ thankYouEmailSent: true });
  return result.sent;
}

async function main() {
  var settingsSnap = await db.collection('tourism_settings').doc('site').get();
  var settings = settingsSnap.exists ? settingsSnap.data() : {};
  var today = lib.romeNow().dateISO;
  var yesterday = lib.addDaysIso(today, -1);

  var counts = { confirmation: 0, checkin: 0, thankyou: 0 };

  // Conferma — appena lo stato diventa 'confermato'.
  var confirmedSnap = await db.collection('tourism_bookings').where('status', '==', 'confermato').where('confirmationEmailSent', '==', false).get();
  for (var i = 0; i < confirmedSnap.docs.length; i++) {
    var d1 = confirmedSnap.docs[i];
    if (await sendConfirmation(settings, d1, d1.data())) counts.confirmation++;
  }

  // Istruzioni check-in — appena i documenti sono completi, solo se già confermata.
  var docsCompleteSnap = await db.collection('tourism_bookings')
    .where('guestDocsComplete', '==', true).where('checkinInstructionsEmailSent', '==', false).get();
  for (var j = 0; j < docsCompleteSnap.docs.length; j++) {
    var d2 = docsCompleteSnap.docs[j];
    var b2 = d2.data();
    if (b2.status !== 'confermato') continue;
    if (await sendCheckinInstructions(settings, d2, b2)) counts.checkin++;
  }

  // Ringraziamento — il giorno dopo il check-out (non lo stesso giorno).
  var thankYouSnap = await db.collection('tourism_bookings')
    .where('checkOut', '<=', yesterday).where('thankYouEmailSent', '==', false).get();
  for (var k = 0; k < thankYouSnap.docs.length; k++) {
    var d3 = thankYouSnap.docs[k];
    var b3 = d3.data();
    if (b3.status !== 'confermato') continue;
    if (await sendThankYou(settings, d3, b3)) counts.thankyou++;
  }

  console.log('Email ciclo di vita — conferme: ' + counts.confirmation + ', check-in: ' + counts.checkin + ', ringraziamenti: ' + counts.thankyou + '.');
}

main().catch(function (err) { console.error(err); process.exit(1); });
