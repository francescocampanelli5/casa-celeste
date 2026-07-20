// Promemoria all'ospite se mancano ancora i documenti a poche ore dal
// check-in (altrimenti nessuno se ne accorge finché non è tardi per la
// scadenza legale delle 24h di Alloggiati Web). Inviato direttamente via
// Gmail (vedi sendGuestEmail in _lib.js). Passa dalla guardia quota (vedi
// _lib.js) — priorità 1 (operativa, quasi mai saltata). Eseguito ogni ora,
// idempotente (flag guestDocsReminderSent).
//
// Prenotazioni di gruppo (più stanze insieme, stesso groupId): un'unica
// email elenca SOLO le stanze ancora incomplete — chi ha già caricato i
// documenti della propria stanza non viene ricontattato per le altre.
'use strict';
var lib = require('./_lib');
var admin = lib.initAdmin();
var db = admin.firestore();

// Nome file in affittacamere/email-templates/ — inviato direttamente via
// Gmail (vedi sendGuestEmail in _lib.js).
var TEMPLATE_FILE = '2-promemoria-documenti.html';

function siteOrigin() { return process.env.SITE_ORIGIN || 'https://lacasaceleste.it/affittacamere/'; }
function assistLink() { return siteOrigin() + '?assist=1'; }
function docsLinkFor(doc, b) { return siteOrigin() + 'ospiti.html?booking=' + doc.id + '&token=' + b.guestFormToken; }

// docsGroup: array di {doc, b} — solo le stanze ancora incomplete (per una
// prenotazione singola, un solo elemento).
async function sendReminder(settings, docsGroup) {
  var isGroup = docsGroup.length > 1;
  var first = docsGroup[0];
  var rep = first.b;
  var isEn = rep.lang === 'en';
  var groupRoomNames = lib.joinRoomNames(docsGroup.map(function (item) { return item.b; }), isEn);
  var subjectLine = isEn
    ? '📄 One last step before your arrival — Casa Celeste'
    : '📄 Manca solo un passo prima del tuo arrivo — Casa Celeste';
  var rooms = docsGroup.map(function (item) {
    return { roomLabel: item.b.roomLabel || 'Casa Celeste', docsLink: docsLinkFor(item.doc, item.b) };
  });

  var result = await lib.sendGuestEmail(db, settings, TEMPLATE_FILE, {
    email: rep.email || '', name: rep.name || '', roomLabel: isGroup ? groupRoomNames : (rep.roomLabel || 'Casa Celeste'),
    checkIn: lib.formatDateHuman(rep.checkIn, isEn), docsLink: rooms[0].docsLink,
    isEn: isEn, subjectLine: subjectLine, assistLink: assistLink(),
    isGroup: isGroup, rooms: isGroup ? rooms : []
  }, 1, isGroup
    ? ('promemoria documenti di gruppo (' + docsGroup.map(function (item) { return item.doc.id; }).join(',') + ')')
    : ('promemoria documenti (' + first.doc.id + ')'));

  if (result.sent) {
    await Promise.all(docsGroup.map(function (item) { return item.doc.ref.update({ guestDocsReminderSent: true }); }));
  }
  return result.sent;
}

async function main() {
  var settingsSnap = await db.collection('tourism_settings').doc('site').get();
  var settings = settingsSnap.exists ? settingsSnap.data() : {};

  var now = lib.romeNow();
  var targetDate = lib.addDaysIso(now.dateISO, 1);
  var snap = await db.collection('tourism_bookings').where('checkIn', '==', targetDate).get();

  var candidates = snap.docs.filter(function (d) {
    var b = d.data();
    return b.status !== 'annullato' && !b.guestDocsComplete && !b.guestDocsReminderSent;
  });

  var sent = 0;
  var seenGroups = {};
  for (var i = 0; i < candidates.length; i++) {
    var doc = candidates[i];
    var b = doc.data();
    try {
      if (b.groupId) {
        if (seenGroups[b.groupId]) continue;
        seenGroups[b.groupId] = true;
        var siblings = await lib.fetchGroupSiblings(db, b.groupId);
        var incomplete = siblings.filter(function (d2) {
          var b2 = d2.data();
          return b2.status !== 'annullato' && !b2.guestDocsComplete && !b2.guestDocsReminderSent;
        }).map(function (d2) { return { doc: d2, b: d2.data() }; });
        if (incomplete.length === 0) continue;
        if (await sendReminder(settings, incomplete)) sent++;
      } else {
        if (await sendReminder(settings, [{ doc: doc, b: b }])) sent++;
      }
    } catch (err) {
      console.error('Errore invio promemoria documenti per ' + doc.id + ':', err.message);
    }
  }
  console.log('Promemoria documenti inviati: ' + sent + '.');
}

main().catch(function (err) { console.error(err); process.exit(1); });
