// Email al ciclo di vita della prenotazione — conferma, istruzioni
// check-in (con eventuale videochiamata Google Meet per la verifica
// documento) e ringraziamento post-soggiorno. Inviate direttamente via
// Gmail (vedi sendGuestEmail in _lib.js), non tramite servizi terzi.
// Ognuna passa dalla guardia quota (vedi _lib.js): saltata (con avviso
// Telegram al proprietario) solo se qualcosa manda email in loop, dando
// priorità alle email operative rispetto al ringraziamento.
//
// La legge italiana impone al gestore di IDENTIFICARE ogni ospite (verifica
// che la persona coincida col documento presentato), non solo raccogliere e
// trasmettere i dati ad Alloggiati Web — vedi functions/guest-verification.js.
// Metodo scelto: videochiamata Google Meet programmata ~1h prima del
// check-in (l'ospite deve avere il documento in mano), gratuita, zero dati
// biometrici elaborati/salvati. In alternativa, conferma dal vivo al
// videocitofono all'arrivo (segnata a mano dal proprietario in dashboard).
// Nessuno skip tra prenotazioni diverse: ogni NUOVA prenotazione richiede
// una nuova verifica al primo ingresso, anche per un ospite già soggiornato
// in passato — la legge non fa eccezioni sulla storia pregressa. SPID/CIE
// come alternativa per cittadini italiani richiederebbe un accreditamento
// come Service Provider presso AgID/Ministero dell'Interno — non
// automatizzabile da qui, eventuale sviluppo futuro.
//
// Prenotazioni di gruppo (più stanze insieme, stesso groupId, vedi
// createGroupBookingCore in functions/booking-logic.js): le email
// "superflue" da ripetere identiche per ogni stanza (conferma,
// ringraziamento, consigli, richiesta recensione) vengono unificate in
// un'unica email per l'intero gruppo — vedi forEachBookingUnit più sotto.
// Il caricamento documenti resta invece SEMPRE per singola stanza (ogni
// stanza può avere ospiti diversi): l'email di istruzioni check-in
// aspetta che TUTTE le stanze del gruppo abbiano i documenti completi
// prima di partire (una sola email finale, non una parziale a metà).
'use strict';
var lib = require('./_lib');
var admin = lib.initAdmin();
var db = admin.firestore();

// Nomi file in affittacamere/email-templates/ — inviati direttamente via
// Gmail (vedi sendGuestEmail in _lib.js), nessun ID di servizio terzo da
// configurare.
var TPL_CONFIRMATION = '1-conferma-prenotazione.html';
var TPL_CHECKIN = '3-istruzioni-checkin.html';
var TPL_THANKYOU = '4-ringraziamento-checkout.html';
var TPL_WELLNESS = '5-andamento-soggiorno.html';
var TPL_REVIEW_REQUEST = '6-richiesta-recensione.html';

// Giorni dopo il check-out per il promemoria recensione "leggero" (distinto
// dal link recensione già incluso nel ringraziamento del giorno dopo).
var REVIEW_REQUEST_DAYS_AFTER_CHECKOUT = 3;

function siteOrigin() { return process.env.SITE_ORIGIN || 'https://lacasaceleste.it/affittacamere/'; }
// Link al bottone "Contatta l'assistenza" del sito (vedi ?assist=1 in
// affittacamere/js/app.js applyDeepLinkParams) — usato nelle email al posto
// di un numero diretto: l'ospite deve sempre passare dal flusso di
// assistenza del sito, non contattare il proprietario direttamente.
function assistLink() { return siteOrigin() + '?assist=1'; }

// Base URL delle Cloud Functions HTTP (region europe-west1, vedi
// functions/index.js setGlobalOptions) — usata solo per il link "Aggiungi
// al calendario Apple/Outlook" (bookingCalendarIcs), che deve essere un
// link cliccabile diretto, non una chiamata SDK.
function functionsBase() { return process.env.FUNCTIONS_BASE_URL || 'https://europe-west1-casa-celeste.cloudfunctions.net'; }
// labelOverride: per un gruppo di stanze, mostra i nomi di tutte le stanze
// nel file .ics invece del solo nome della prima (vedi bookingCalendarIcs
// in functions/index.js, parametro "label").
function icsLink(bookingId, token, labelOverride) {
  var url = functionsBase() + '/bookingCalendarIcs?booking=' + bookingId + '&token=' + token;
  if (labelOverride) url += '&label=' + encodeURIComponent(labelOverride);
  return url;
}

// Link "Aggiungi a Google Calendar" (nessun backend necessario: Google
// apre direttamente un evento precompilato da query string). Le date/ore
// sono convertite in UTC con la stessa logica di romeWallTimeToUtcIso più
// sotto, cosi' Google mostra sempre l'orario giusto indipendentemente dal
// fuso del dispositivo dell'ospite.
function toGCalUtc(iso) { return iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z'); }
function googleCalendarLink(b, settings, isEn) {
  var checkInTime = settings.checkInTime || '15:00';
  var checkOutTime = settings.checkOutTime || '10:00';
  var startUtc = toGCalUtc(lib.romeWallTimeToUtcIso(b.checkIn, checkInTime));
  var endUtc = toGCalUtc(lib.romeWallTimeToUtcIso(b.checkOut, checkOutTime));
  var text = 'Casa Celeste — ' + (b.roomLabel || (isEn ? 'stay' : 'soggiorno'));
  var details = isEn
    ? ('Check-in: ' + checkInTime + '. Check-out: ' + checkOutTime + '.')
    : ('Check-in: ore ' + checkInTime + '. Check-out: ore ' + checkOutTime + '.');
  var location = 'Via Giuseppe Can. del Drago 9, Monopoli (BA), Italia';
  return 'https://www.google.com/calendar/render?action=TEMPLATE'
    + '&text=' + encodeURIComponent(text)
    + '&dates=' + startUtc + '/' + endUtc
    + '&details=' + encodeURIComponent(details)
    + '&location=' + encodeURIComponent(location);
}

// isEn è passato a ogni template EmailJS: il contenuto bilingue vive dentro
// il template stesso con sezioni Mustache {{#isEn}}English{{/isEn}}
// {{^isEn}}Italiano{{/isEn}} — un solo template per email, non uno per
// lingua, per non raddoppiare il lavoro di configurazione su EmailJS.
// b.lang è scelto dall'ospite sul sito (vedi state.lang in app.js) e
// salvato sulla prenotazione da createBookingCore/createGroupBookingCore.
function isEnglish(b) { return b.lang === 'en'; }

// Oggetto calcolato qui (non con condizionali Mustache dentro il campo
// Subject di EmailJS, la cui compatibilità con le sezioni {{#..}} non è
// documentata con certezza) — il template su EmailJS ha semplicemente
// Subject = {{subjectLine}}.
var SUBJECTS = {
  confirmation: { it: '✅ Prenotazione confermata — {{roomLabel}}, Casa Celeste', en: '✅ Booking confirmed — {{roomLabel}}, Casa Celeste' },
  checkin: { it: '🔑 Le tue istruzioni per il check-in — Casa Celeste', en: '🔑 Your check-in instructions — Casa Celeste' },
  thankyou: { it: '🔑 Istruzioni per il check-out — Casa Celeste', en: '🔑 Check-out instructions — Casa Celeste' },
  wellness: { it: 'Tutto bene, {{name}}? Qualche consiglio per Monopoli 🌤️', en: 'All good, {{name}}? A few tips for Monopoli 🌤️' },
  reviewRequest: { it: 'Hai un attimo per Casa Celeste, {{name}}? 🌤️', en: 'Got a minute for Casa Celeste, {{name}}? 🌤️' }
};
function subjectFor(key, isEn, b) {
  var s = SUBJECTS[key][isEn ? 'en' : 'it'];
  return s.replace('{{roomLabel}}', b.roomLabel || 'Casa Celeste').replace('{{name}}', b.name || '');
}

/* ==========================================================================
   Prenotazioni di gruppo — helper condivisi
   ========================================================================== */

var joinRoomNames = lib.joinRoomNames;
function fetchGroupSiblings(groupId) { return lib.fetchGroupSiblings(db, groupId); }

// Itera i documenti di una query raggruppandoli per groupId: le prenotazioni
// di gruppo condividono un'unica email invece di una per stanza; le
// prenotazioni singole (senza groupId) passano da processOne, comportamento
// identico a prima dell'introduzione dei gruppi. Per ogni gruppo incontrato,
// recupera SEMPRE tutti i fratelli freschi da Firestore (non solo quelli che
// hanno già passato il filtro della query esterna) cosi' processGroup può
// decidere se il gruppo è davvero pronto nella sua interezza. Le stanze
// annullate vengono escluse a monte, sia dal conteggio che dal gate.
async function forEachBookingUnit(queryDocs, processOne, processGroup) {
  var seenGroups = {};
  var count = 0;
  for (var i = 0; i < queryDocs.length; i++) {
    var doc = queryDocs[i];
    var b = doc.data();
    if (b.groupId) {
      if (seenGroups[b.groupId]) continue;
      seenGroups[b.groupId] = true;
      var siblings = (await fetchGroupSiblings(b.groupId)).filter(function (d) { return d.data().status !== 'annullato'; });
      if (siblings.length === 0) continue;
      if (siblings.length === 1) {
        if (await processOne(siblings[0], siblings[0].data())) count++;
        continue;
      }
      if (await processGroup(siblings)) count++;
    } else {
      if (await processOne(doc, b)) count++;
    }
  }
  return count;
}

/* ==========================================================================
   Conferma prenotazione
   ========================================================================== */
async function composeAndSendConfirmation(settings, docsGroup) {
  var isGroup = docsGroup.length > 1;
  var first = docsGroup[0];
  var rep = first.b;
  var isEn = isEnglish(rep);
  var totalGuests = 0, totalDue = 0;
  var rooms = docsGroup.map(function (item) {
    var due = (item.b.touristTax && item.b.touristTax.totalDue) || 0;
    totalGuests += item.b.guests || 0;
    totalDue += due;
    return {
      roomLabel: item.b.roomLabel || 'Casa Celeste',
      docsLink: siteOrigin() + 'ospiti.html?booking=' + item.doc.id + '&token=' + item.b.guestFormToken,
      totalDue: due
    };
  });
  totalDue = Math.round(totalDue * 100) / 100;
  var groupRoomNames = joinRoomNames(docsGroup.map(function (item) { return item.b; }), isEn);
  var repForCalendar = isGroup ? Object.assign({}, rep, { roomLabel: groupRoomNames }) : rep;
  var subjectRep = isGroup ? Object.assign({}, rep, { roomLabel: groupRoomNames }) : rep;

  var result = await lib.sendGuestEmail(db, settings, TPL_CONFIRMATION, {
    email: rep.email || '', name: rep.name || '', roomLabel: isGroup ? groupRoomNames : (rep.roomLabel || 'Casa Celeste'),
    checkIn: lib.formatDateHuman(rep.checkIn, isEn), checkOut: lib.formatDateHuman(rep.checkOut, isEn),
    nights: rep.nights || 0, guests: totalGuests, totalDue: totalDue,
    docsLink: rooms[0].docsLink,
    checkInTime: settings.checkInTime || '15:00', checkOutTime: settings.checkOutTime || '10:00',
    googleCalendarLink: googleCalendarLink(repForCalendar, settings, isEn),
    icsLink: icsLink(first.doc.id, first.b.guestFormToken, isGroup ? groupRoomNames : ''),
    assistLink: assistLink(), isEn: isEn, subjectLine: subjectFor('confirmation', isEn, subjectRep),
    isGroup: isGroup, rooms: isGroup ? rooms : []
  }, 2, isGroup
    ? ('conferma prenotazione di gruppo (' + docsGroup.map(function (item) { return item.doc.id; }).join(',') + ')')
    : ('conferma prenotazione (' + first.doc.id + ')'));

  if (result.sent) {
    await Promise.all(docsGroup.map(function (item) { return item.doc.ref.update({ confirmationEmailSent: true }); }));
  }
  return result.sent;
}
async function sendConfirmation(settings, doc, b) {
  return composeAndSendConfirmation(settings, [{ doc: doc, b: b }]);
}
async function sendConfirmationGroup(settings, siblingDocs) {
  var items = siblingDocs.map(function (d) { return { doc: d, b: d.data() }; });
  // Aspetta che TUTTE le stanze del gruppo siano confermate prima di
  // mandare l'unica email di conferma, altrimenti chi ha già pagato
  // riceverebbe conferma solo parziale del gruppo.
  if (!items.every(function (it) { return it.b.status === 'confermato'; })) return false;
  if (!items.some(function (it) { return !it.b.confirmationEmailSent; })) return false;
  return composeAndSendConfirmation(settings, items);
}

/* ==========================================================================
   Istruzioni check-in (codici, WiFi, portone, eventuale videochiamata)
   ========================================================================== */
function subtractOneHour(hhmm) {
  var parts = hhmm.split(':');
  var h = (Number(parts[0]) - 1 + 24) % 24;
  return (h < 10 ? '0' : '') + h + ':' + (parts[1] || '00');
}

async function composeAndSendCheckin(settings, docsGroup) {
  var isGroup = docsGroup.length > 1;
  var first = docsGroup[0];
  var rep = first.b;
  var isEn = isEnglish(rep);
  var checkInTime = settings.checkInTime || '15:00';
  var groupRoomNames = joinRoomNames(docsGroup.map(function (item) { return item.b; }), isEn);

  // Nessuno skip per "ospite già verificato in un soggiorno precedente": la
  // legge impone di verificare l'identità al primo ingresso di OGNI NUOVA
  // prenotazione, senza eccezioni basate sulla storia pregressa (vedi
  // functions/guest-verification.js). L'unico modo di non offrire la
  // videochiamata è il proprietario che disattiva la casella "Offri la
  // videochiamata..." in Impostazioni — in quel caso la verifica avviene
  // solo dal vivo al videocitofono. Per un gruppo, un'unica chiamata copre
  // tutte le stanze insieme (arrivano nello stesso momento).
  var videoCallEnabled = settings.videoCallEnabled !== false;
  var meetLink = null, videoCallNote;
  if (!videoCallEnabled) {
    videoCallNote = isEn
      ? 'We\'ll verify your document in person via the intercom when you arrive.'
      : (isGroup
        ? 'Verificheremo i documenti dal vivo al videocitofono al vostro arrivo.'
        : 'Verificheremo il documento dal vivo al videocitofono al tuo arrivo.');
  } else {
    // Programmata 1h prima del check-in (ora Europe/Rome, a prova di cambio
    // ora legale/solare): l'ospite deve avere il documento in mano.
    var callStartIso = lib.romeWallTimeToUtcIso(rep.checkIn, subtractOneHour(checkInTime));
    var meetSummary = isGroup ? ('Casa Celeste — verifica documenti, ' + groupRoomNames) : ('Casa Celeste — verifica documento, ' + rep.roomLabel);
    var meetDescription = isGroup
      ? ('Videochiamata per verificare i documenti del gruppo di ' + rep.name + ' (' + groupRoomNames + ') un\'ora prima del check-in del ' + lib.formatDateHuman(rep.checkIn, false) + '. Tenete i documenti in mano durante la chiamata.')
      : ('Videochiamata per verificare il documento di ' + rep.name + ' un\'ora prima del check-in del ' + lib.formatDateHuman(rep.checkIn, false) + '. Tieni il documento in mano durante la chiamata.');
    meetLink = await lib.createGoogleMeetLink(meetSummary, meetDescription, callStartIso);
    // In ogni caso (anche con la videochiamata prenotata) resta chiaro che
    // il videocitofono è il ripiego se la chiamata non dovesse avvenire —
    // richiesto esplicitamente: mai lasciare l'ospite senza un'alternativa.
    if (isEn) {
      videoCallNote = meetLink
        ? ('The video call is scheduled one hour before your check-in (' + checkInTime + '): please have ' + (isGroup ? 'everyone\'s ID documents' : 'your ID document') + ' in hand during the call. If the call doesn\'t take place, we\'ll verify you in person via the intercom when you arrive instead.')
        : 'We\'ll contact you shortly to arrange a quick verification video call (ID document in hand) one hour before check-in. If the call doesn\'t take place, we\'ll verify you in person via the intercom on arrival instead.';
    } else {
      videoCallNote = meetLink
        ? ('La videochiamata è programmata per un\'ora prima del check-in (' + checkInTime + '): tenete ' + (isGroup ? 'i documenti d\'identità di tutti' : 'il documento d\'identità') + ' in mano durante la chiamata. Se la videochiamata non dovesse avvenire, la verifica avverrà comunque dal vivo al videocitofono al ' + (isGroup ? 'vostro' : 'tuo') + ' arrivo.')
        : 'Ti contatteremo a breve per organizzare una brevissima videochiamata di verifica (documento in mano) un\'ora prima del check-in. Se la videochiamata non dovesse avvenire, la verifica avverrà comunque dal vivo al videocitofono al ' + (isGroup ? 'vostro' : 'tuo') + ' arrivo.';
    }
  }

  // roomAccessCode: codice/link per aprire la singola stanza, inserito a
  // mano dal proprietario in dashboard (campo "da creare" a ogni nuova
  // prenotazione, non generato dal sistema — vedi affittacamere/js/dashboard.js).
  var rooms = docsGroup.map(function (item) { return { roomLabel: item.b.roomLabel || 'Casa Celeste', roomAccessCode: item.b.roomAccessCode || '' }; });
  var hasRoomAccessCode = isGroup ? rooms.some(function (r) { return r.roomAccessCode; }) : !!rep.roomAccessCode;

  var result = await lib.sendGuestEmail(db, settings, TPL_CHECKIN, {
    email: rep.email || '', name: rep.name || '', roomLabel: isGroup ? groupRoomNames : (rep.roomLabel || 'Casa Celeste'),
    checkIn: lib.formatDateHuman(rep.checkIn, isEn), checkInTime: checkInTime,
    address: 'Via Giuseppe Can. del Drago 9, Monopoli (BA)',
    checkInInstructions: (settings.checkInInstructionsText && settings.checkInInstructionsText[isEn ? 'en' : 'it']) || '',
    wifiName: settings.wifiName || '', wifiPassword: settings.wifiPassword || '',
    streetGateLink: lib.normalizeExternalUrl(settings.streetGateLink), roomAccessCode: rep.roomAccessCode || '', hasRoomAccessCode: hasRoomAccessCode,
    videoCallLink: meetLink || '', videoCallNote: videoCallNote,
    isGroup: isGroup, rooms: isGroup ? rooms : [], groupRoomNames: groupRoomNames,
    assistLink: assistLink(), isEn: isEn, subjectLine: subjectFor('checkin', isEn, rep)
  }, 1, isGroup
    ? ('istruzioni check-in di gruppo (' + docsGroup.map(function (item) { return item.doc.id; }).join(',') + ')')
    : ('istruzioni check-in (' + first.doc.id + ')'));

  if (result.sent) {
    await Promise.all(docsGroup.map(function (item) {
      var patch = { checkinInstructionsEmailSent: true };
      if (meetLink) patch.videoCallLink = meetLink;
      return item.doc.ref.update(patch);
    }));
  }
  return result.sent;
}
async function sendCheckinInstructions(settings, doc, b) {
  return composeAndSendCheckin(settings, [{ doc: doc, b: b }]);
}
async function sendCheckinInstructionsGroup(settings, siblingDocs) {
  var items = siblingDocs.map(function (d) { return { doc: d, b: d.data() }; });
  if (!items.every(function (it) { return it.b.status === 'confermato'; })) return false;
  // Il cuore della richiesta: se anche una sola stanza del gruppo non ha
  // ancora i documenti completi, l'intero gruppo aspetta — nessuno riceve
  // le istruzioni finché non hanno TUTTI caricato i documenti della
  // propria stanza. Il cron è orario: la stanza mancante viene ricontrollata
  // automaticamente a ogni passaggio, non serve nessun intervento manuale.
  if (!items.every(function (it) { return it.b.guestDocsComplete; })) return false;
  if (!items.some(function (it) { return !it.b.checkinInstructionsEmailSent; })) return false;
  return composeAndSendCheckin(settings, items);
}

/* ==========================================================================
   Ringraziamento + istruzioni check-out — la mattina STESSA del check-out
   (non il giorno dopo), finestra 6-8 ora Roma come cleaning-reminders.js.
   ========================================================================== */
async function composeAndSendThankYou(settings, docsGroup) {
  var isGroup = docsGroup.length > 1;
  var first = docsGroup[0];
  var rep = first.b;
  var isEn = isEnglish(rep);
  var groupRoomNames = joinRoomNames(docsGroup.map(function (item) { return item.b; }), isEn);
  var result = await lib.sendGuestEmail(db, settings, TPL_THANKYOU, {
    email: rep.email || '', name: rep.name || '', roomLabel: isGroup ? groupRoomNames : (rep.roomLabel || 'Casa Celeste'),
    checkOutTime: settings.checkOutTime || '10:00',
    checkOutInstructions: (settings.checkOutInstructionsText && settings.checkOutInstructionsText[isEn ? 'en' : 'it']) || '',
    assistLink: assistLink(), isEn: isEn, isGroup: isGroup, subjectLine: subjectFor('thankyou', isEn, rep),
    reviewLink: lib.normalizeExternalUrl(settings.reviewLink)
  }, 3, isGroup
    ? ('ringraziamento di gruppo (' + docsGroup.map(function (item) { return item.doc.id; }).join(',') + ')')
    : ('ringraziamento + istruzioni check-out (' + first.doc.id + ')'));
  if (result.sent) await Promise.all(docsGroup.map(function (item) { return item.doc.ref.update({ thankYouEmailSent: true }); }));
  return result.sent;
}
async function sendThankYou(settings, doc, b) {
  return composeAndSendThankYou(settings, [{ doc: doc, b: b }]);
}
async function sendThankYouGroup(settings, siblingDocs) {
  var items = siblingDocs.map(function (d) { return { doc: d, b: d.data() }; });
  if (!items.every(function (it) { return it.b.status === 'confermato'; })) return false;
  if (!items.some(function (it) { return !it.b.thankYouEmailSent; })) return false;
  return composeAndSendThankYou(settings, items);
}

/* ==========================================================================
   Consigli a metà soggiorno (il giorno dopo il check-in, solo se restano
   altre notti) — fino a 4 consigli & dintorni presi da Impostazioni.
   ========================================================================== */
async function composeAndSendWellness(settings, docsGroup) {
  var isGroup = docsGroup.length > 1;
  var first = docsGroup[0];
  var rep = first.b;
  var isEn = isEnglish(rep);
  var groupRoomNames = joinRoomNames(docsGroup.map(function (item) { return item.b; }), isEn);
  var recs = (settings.recommendations || []).slice(0, 4).map(function (r) {
    return { title: r.title || '', category: r.category || '', url: lib.normalizeExternalUrl(r.url) };
  });
  var result = await lib.sendGuestEmail(db, settings, TPL_WELLNESS, {
    email: rep.email || '', name: rep.name || '', roomLabel: isGroup ? groupRoomNames : (rep.roomLabel || 'Casa Celeste'),
    assistLink: assistLink(), isEn: isEn, isGroup: isGroup, subjectLine: subjectFor('wellness', isEn, rep), recs: recs
  }, 4, isGroup
    ? ('consigli metà soggiorno di gruppo (' + docsGroup.map(function (item) { return item.doc.id; }).join(',') + ')')
    : ('consigli a metà soggiorno (' + first.doc.id + ')'));
  if (result.sent) await Promise.all(docsGroup.map(function (item) { return item.doc.ref.update({ wellnessEmailSent: true }); }));
  return result.sent;
}
async function sendWellnessCheck(settings, doc, b) {
  return composeAndSendWellness(settings, [{ doc: doc, b: b }]);
}
async function sendWellnessCheckGroup(settings, siblingDocs) {
  var items = siblingDocs.map(function (d) { return { doc: d, b: d.data() }; })
    .filter(function (it) { return it.b.status === 'confermato' && (it.b.nights || 0) >= 2; });
  if (items.length === 0) return false;
  if (!items.some(function (it) { return !it.b.wellnessEmailSent; })) return false;
  return composeAndSendWellness(settings, items);
}

/* ==========================================================================
   Promemoria recensione "leggero", qualche giorno dopo il check-out.
   ========================================================================== */
async function composeAndSendReviewRequest(settings, docsGroup) {
  var isGroup = docsGroup.length > 1;
  var first = docsGroup[0];
  var rep = first.b;
  var isEn = isEnglish(rep);
  var groupRoomNames = joinRoomNames(docsGroup.map(function (item) { return item.b; }), isEn);
  var result = await lib.sendGuestEmail(db, settings, TPL_REVIEW_REQUEST, {
    email: rep.email || '', name: rep.name || '', roomLabel: isGroup ? groupRoomNames : (rep.roomLabel || 'Casa Celeste'),
    reviewLink: lib.normalizeExternalUrl(settings.reviewLink), isEn: isEn, isGroup: isGroup, subjectLine: subjectFor('reviewRequest', isEn, rep)
  }, 4, isGroup
    ? ('richiesta recensione di gruppo (' + docsGroup.map(function (item) { return item.doc.id; }).join(',') + ')')
    : ('richiesta recensione (' + first.doc.id + ')'));
  if (result.sent) await Promise.all(docsGroup.map(function (item) { return item.doc.ref.update({ reviewRequestEmailSent: true }); }));
  return result.sent;
}
async function sendReviewRequest(settings, doc, b) {
  return composeAndSendReviewRequest(settings, [{ doc: doc, b: b }]);
}
async function sendReviewRequestGroup(settings, siblingDocs) {
  var items = siblingDocs.map(function (d) { return { doc: d, b: d.data() }; });
  if (!items.every(function (it) { return it.b.status === 'confermato'; })) return false;
  if (!items.some(function (it) { return !it.b.reviewRequestEmailSent; })) return false;
  return composeAndSendReviewRequest(settings, items);
}

async function main() {
  var settingsSnap = await db.collection('tourism_settings').doc('site').get();
  var settings = settingsSnap.exists ? settingsSnap.data() : {};
  var today = lib.romeNow().dateISO;
  var yesterday = lib.addDaysIso(today, -1);
  var reviewRequestCutoff = lib.addDaysIso(today, -REVIEW_REQUEST_DAYS_AFTER_CHECKOUT);

  var counts = { confirmation: 0, checkin: 0, thankyou: 0, wellness: 0, reviewRequest: 0 };

  // Conferma — appena lo stato diventa 'confermato'.
  var confirmedSnap = await db.collection('tourism_bookings').where('status', '==', 'confermato').where('confirmationEmailSent', '==', false).get();
  counts.confirmation = await forEachBookingUnit(confirmedSnap.docs, sendConfirmation.bind(null, settings), sendConfirmationGroup.bind(null, settings));

  // Istruzioni check-in — appena i documenti sono completi, solo se già confermata.
  var docsCompleteSnap = await db.collection('tourism_bookings')
    .where('guestDocsComplete', '==', true).where('checkinInstructionsEmailSent', '==', false).get();
  var docsCompleteConfirmed = docsCompleteSnap.docs.filter(function (d) { return d.data().status === 'confermato'; });
  counts.checkin = await forEachBookingUnit(docsCompleteConfirmed, sendCheckinInstructions.bind(null, settings), sendCheckinInstructionsGroup.bind(null, settings));

  // Ringraziamento + istruzioni check-out — la mattina STESSA del check-out
  // (non il giorno dopo), finestra 6-8 ora Roma come cleaning-reminders.js:
  // deve arrivare in tempo utile prima che l'ospite lasci la stanza.
  var nowHour = lib.romeNow().hour;
  if (nowHour >= 6 && nowHour <= 8) {
    var thankYouSnap = await db.collection('tourism_bookings')
      .where('checkOut', '==', today).where('thankYouEmailSent', '==', false).get();
    var thankYouConfirmed = thankYouSnap.docs.filter(function (d) { return d.data().status === 'confermato'; });
    counts.thankyou = await forEachBookingUnit(thankYouConfirmed, sendThankYou.bind(null, settings), sendThankYouGroup.bind(null, settings));
  }

  // Consigli a metà soggiorno — il giorno dopo il check-in, solo se restano
  // altre notti (non ha senso per un soggiorno di 1 sola notte già finito).
  var wellnessSnap = await db.collection('tourism_bookings')
    .where('checkIn', '==', yesterday).where('wellnessEmailSent', '==', false).get();
  var wellnessEligible = wellnessSnap.docs.filter(function (d) { var b = d.data(); return b.status === 'confermato' && (b.nights || 0) >= 2; });
  counts.wellness = await forEachBookingUnit(wellnessEligible, sendWellnessCheck.bind(null, settings), sendWellnessCheckGroup.bind(null, settings));

  // Promemoria recensione — qualche giorno dopo il check-out (distinto dal
  // link recensione già nel ringraziamento del giorno dopo).
  var reviewRequestSnap = await db.collection('tourism_bookings')
    .where('checkOut', '<=', reviewRequestCutoff).where('reviewRequestEmailSent', '==', false).get();
  var reviewEligible = reviewRequestSnap.docs.filter(function (d) { return d.data().status === 'confermato'; });
  counts.reviewRequest = await forEachBookingUnit(reviewEligible, sendReviewRequest.bind(null, settings), sendReviewRequestGroup.bind(null, settings));

  console.log('Email ciclo di vita — conferme: ' + counts.confirmation + ', check-in: ' + counts.checkin + ', ringraziamenti: ' + counts.thankyou + ', consigli metà soggiorno: ' + counts.wellness + ', richieste recensione: ' + counts.reviewRequest + '.');
}

main().catch(function (err) { console.error(err); process.exit(1); });
