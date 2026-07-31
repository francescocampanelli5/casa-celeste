// Rate limiting per-IP per gli endpoint pubblici (Cloud Functions onCall) —
// richiesto esplicitamente dall'utente, specialmente ora che App Check
// (protezione anti-bot) è temporaneamente disattivato (vedi index.js).
//
// Cloudflare non è una soluzione praticabile qui: il "login" passa
// direttamente da Firebase Auth (identitytoolkit.googleapis.com, server
// Google) e queste funzioni girano su cloudfunctions.net/Cloud Run, non sul
// dominio del sito — Cloudflare protegge solo il traffico che passa dal
// proprio dominio, quindi servirebbe comunque un Worker come reverse-proxy
// davanti a questi endpoint (progetto a sé). Il piano gratuito Cloudflare
// include anche una sola regola di rate limiting, insufficiente per "ogni
// endpoint". Soluzione scelta: contatore a finestra fissa su Firestore,
// gratis, in vigore subito, senza nuova infrastruttura esterna.
'use strict';
const { HttpsError } = require('firebase-functions/v2/https');

function clientIp(request) {
  const raw = request.rawRequest;
  if (!raw) return 'unknown';
  const forwarded = raw.headers && raw.headers['x-forwarded-for'];
  const ip = raw.ip || (forwarded ? String(forwarded).split(',')[0].trim() : '');
  return ip || 'unknown';
}

// name: prefisso per endpoint (namespacing del contatore, es. 'createBooking').
// maxRequests/windowMinutes: soglia per quella finestra di tempo fissa (non
// scorrevole: abbastanza per bloccare spam/abuso automatizzato, non serve
// altro per il volume di questo sito).
// Le chiamate AUTENTICATE (request.auth valido, cioè il proprietario loggato
// in dashboard) sono sempre esenti: sono già protette dal login Firebase
// Auth stesso, non hanno bisogno di un secondo limite.
async function enforceRateLimit(db, request, name, maxRequests, windowMinutes) {
  if (request.auth) return;
  const ip = clientIp(request);
  const ref = db.collection('rateLimits').doc(name + ':' + ip);
  const windowMs = windowMinutes * 60000;
  let blocked = false;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : null;
    const now = Date.now();
    if (!data || now - data.windowStart > windowMs) {
      tx.set(ref, { windowStart: now, count: 1 });
      return;
    }
    if (data.count >= maxRequests) { blocked = true; return; }
    tx.update(ref, { count: data.count + 1 });
  });
  if (blocked) {
    throw new HttpsError('resource-exhausted', 'Troppe richieste da questo indirizzo in poco tempo: riprova tra qualche minuto.');
  }
}

module.exports = { enforceRateLimit, clientIp };
