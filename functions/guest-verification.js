// Riconoscimento ospite già verificato in un soggiorno precedente — la legge
// italiana impone al gestore di IDENTIFICARE ogni ospite (verifica che la
// persona corrisponda al documento presentato), non solo raccogliere e
// trasmettere i dati ad Alloggiati Web. Il metodo scelto (vedi
// functions/index.js e affittacamere/scripts/guest-lifecycle-emails.js):
// - Videochiamata programmata ~1h prima del check-in, documento in mano.
// - In alternativa (solo la prima volta), conferma tramite videocitofono
//   al momento dell'arrivo — richiede un citofono/serratura smart con una
//   propria integrazione, non ancora collegata (vedi nota in
//   GUIDA-PUBBLICAZIONE.md Parte 8.7: serve sapere quale prodotto userai).
// - Dalla seconda volta in poi, un ospite già verificato (stesso nome +
//   documento) viene riconosciuto automaticamente qui, senza ripetere la
//   verifica.
// - CIE/SPID come alternativa per cittadini italiani: non automatizzabile
//   senza un accreditamento formale come Service Provider (vedi Parte 8.7).
'use strict';
const crypto = require('crypto');

// Chiave non reversibile (hash) invece del numero di documento in chiaro —
// il record in tourism_verifiedGuests non deve permettere di risalire ai
// dati del documento, serve solo a riconoscere "stessa persona di prima".
// ̀-ͯ = intervallo Unicode dei segni diacritici combinanti (accenti
// separati dalla lettera dopo normalize('NFD')) — scritto come escape
// esplicito, non come caratteri combinanti letterali, per evitare ambiguità
// di codifica nel file sorgente.
var DIACRITICS_RE = /[̀-ͯ]/g;
function guestKey(guest) {
  const normalized = [guest.lastName, guest.firstName, guest.docNumber]
    .map((s) => String(s || '').trim().toLowerCase().normalize('NFD').replace(DIACRITICS_RE, ''))
    .join('|');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

async function findAlreadyVerifiedGuests(db, guests) {
  const results = await Promise.all(guests.map(async (g) => {
    const snap = await db.collection('tourism_verifiedGuests').doc(guestKey(g)).get();
    return snap.exists;
  }));
  return results.every(Boolean); // true solo se OGNI ospite della prenotazione è già verificato
}

async function recordVerifiedGuests(db, admin, guests, bookingId, method) {
  await Promise.all(guests.map(async (g) => {
    const ref = db.collection('tourism_verifiedGuests').doc(guestKey(g));
    const snap = await ref.get();
    await ref.set({
      firstVerifiedAt: snap.exists ? snap.data().firstVerifiedAt : admin.firestore.FieldValue.serverTimestamp(),
      lastMethod: method,
      lastVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      bookingIds: admin.firestore.FieldValue.arrayUnion(bookingId)
    }, { merge: true });
  }));
}

module.exports = { guestKey, findAlreadyVerifiedGuests, recordVerifiedGuests };
