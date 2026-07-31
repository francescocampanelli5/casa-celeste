// Anti-squatting calendario — una prenotazione dal sito (`source:'site'`)
// blocca subito le notti già allo stato 'nuovo' (per evitare doppie
// prenotazioni, vedi functions/index.js createBooking). Se resta 'nuovo'
// per più di 48h senza che il proprietario la confermi o annulli, la
// annulliamo automaticamente e liberiamo le notti — altrimenti chiunque
// potrebbe bloccare date per sempre senza mai completare la prenotazione.
// Eseguito ogni ora da .github/workflows/affittacamere-hourly.yml.
'use strict';
var lib = require('./_lib');
var admin = lib.initAdmin();
var db = admin.firestore();

var STALE_HOURS = 48;

async function main() {
  var cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - STALE_HOURS * 3600 * 1000);
  var snap = await db.collection('tourism_bookings')
    .where('source', '==', 'site').where('status', '==', 'nuovo').get();

  var expired = 0;
  for (var i = 0; i < snap.docs.length; i++) {
    var doc = snap.docs[i];
    var b = doc.data();
    if (!b.createdAt || b.createdAt.toMillis() > cutoff.toMillis()) continue;

    // Transazione (non due scritture separate): se una prenotazione vera
    // committa sulla stessa stanza fra la get() e la update() qui sotto, uno
    // sblocco calcolato su dati stale potrebbe liberare notti in realtà già
    // occupate. tx.get()+tx.update() fa riprovare l'intera operazione se il
    // documento stanza cambia nel frattempo (stesso pattern di
    // functions/booking-logic.js).
    var roomRef = db.collection('tourism_rooms').doc(b.roomId);
    await db.runTransaction(async function (tx) {
      var roomSnap = await tx.get(roomRef);
      tx.update(doc.ref, { status: 'annullato' });
      if (roomSnap.exists) {
        var ranges = (roomSnap.data().blockedRanges || []).filter(function (r) { return r.bookingId !== doc.id; });
        tx.update(roomRef, { blockedRanges: ranges });
      }
    });
    expired++;
    console.log('Prenotazione scaduta (48h senza conferma) annullata:', doc.id);
  }
  console.log('Prenotazioni scadute liberate: ' + expired + '.');
}

main().catch(function (err) { console.error(err); process.exit(1); });
