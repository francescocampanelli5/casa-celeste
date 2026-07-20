// Registro storico degli ospiti verificati — la legge italiana impone al
// gestore di IDENTIFICARE ogni ospite (verifica che la persona corrisponda
// al documento presentato), non solo raccogliere e trasmettere i dati ad
// Alloggiati Web. Il metodo scelto (vedi functions/index.js e
// affittacamere/scripts/guest-lifecycle-emails.js):
// - Videochiamata programmata ~1h prima del check-in, documento in mano.
// - In alternativa, conferma dal vivo tramite videocitofono al momento
//   dell'arrivo — richiede un citofono/serratura smart con una propria
//   integrazione, non ancora collegata (vedi nota in GUIDA-PUBBLICAZIONE.md
//   Parte 8.7: serve sapere quale prodotto userai).
//
// IMPORTANTE: nessuno skip automatico tra prenotazioni diverse. Ogni NUOVA
// prenotazione richiede una nuova verifica al primo ingresso di QUEL
// soggiorno — anche per un ospite già verificato in passato, la legge non fa
// eccezioni basate sulla storia pregressa. tourism_verifiedGuests qui sotto
// resta solo un registro storico/di controllo (chi, quando, con che
// metodo) — non decide mai se saltare la verifica.
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

module.exports = { guestKey, recordVerifiedGuests };
