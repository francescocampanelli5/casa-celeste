// Firma OTP del contratto di locazione turistica — Firma Elettronica
// Semplice (FES): l'ospite riceve un codice a 6 cifre via email (stesso
// account Gmail già usato per le altre email, nessun servizio/costo nuovo)
// e lo inserisce su ospiti.html per "firmare" il contratto. Attivabile/
// disattivabile da dashboard (tourism_settings/site.contractSignatureEnabled,
// spento di default): quando è spento il flusso di check-in resta identico
// a prima, nessuna sezione contratto viene mostrata.
//
// Audit trail richiesto per la validità della FES (IP, timestamp, email,
// user-agent) salvato in tourism_guestSignatures SOLO al momento della
// firma riuscita — mai leggibile/scrivibile dal client (vedi firestore.rules),
// stesso pattern di tourism_guestDocuments.
'use strict';
const crypto = require('crypto');
const { HttpsError } = require('firebase-functions/v2/https');
const { isNonEmptyString } = require('./guest-documents');
const { clientIp } = require('./rate-limit');
const { sendMail, checkEmailQuota, recordEmailSent } = require('./guest-notify');

const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 3;
// Cooldown minimo tra due richieste di codice per la STESSA prenotazione:
// enforceRateLimit (per-IP) da solo non basta, un ospite potrebbe comunque
// martellare "invia di nuovo" e riempire la propria casella email.
const OTP_MIN_RESEND_SECONDS = 60;

function otpHash(code, bookingId) {
  return crypto.createHash('sha256').update(code + ':' + bookingId).digest('hex');
}
function userAgentOf(request) {
  const raw = request.rawRequest;
  const ua = raw && raw.headers && raw.headers['user-agent'];
  return ua ? String(ua).slice(0, 300) : '';
}
// Nasconde la maggior parte dell'indirizzo nella risposta al client
// ("a c***o@gmail.com"): conferma che l'invio è partito senza esporre
// l'email completa a chiunque intercetti la risposta di rete.
function maskEmail(email) {
  const parts = String(email || '').split('@');
  if (parts.length !== 2 || !parts[0]) return '';
  const name = parts[0];
  const masked = name.length <= 2 ? name[0] + '*' : name.slice(0, 2) + '*'.repeat(Math.max(1, name.length - 2));
  return masked + '@' + parts[1];
}

async function loadBookingForSignature(db, bookingId, token) {
  if (!isNonEmptyString(bookingId, 100) || !isNonEmptyString(token, 200)) {
    throw new HttpsError('invalid-argument', 'Link non valido.');
  }
  const bookingRef = db.collection('tourism_bookings').doc(bookingId);
  const snap = await bookingRef.get();
  if (!snap.exists || snap.data().guestFormToken !== token) {
    throw new HttpsError('permission-denied', 'Link non valido o scaduto.');
  }
  const booking = snap.data();
  if (booking.status === 'annullato') {
    throw new HttpsError('failed-precondition', 'Questa prenotazione è stata annullata.');
  }
  return { bookingRef, booking };
}

function otpEmailHtml(booking, code, isEn, siteName) {
  const name = booking.name || '';
  if (isEn) {
    return '<div style="font-family:sans-serif;font-size:15px;color:#1a2733;">' +
      '<p>Hi ' + name + ',</p>' +
      '<p>Your verification code to sign the rental agreement for ' + siteName + ' is:</p>' +
      '<p style="font-size:32px;font-weight:700;letter-spacing:4px;margin:20px 0;">' + code + '</p>' +
      '<p>This code expires in ' + OTP_TTL_MINUTES + ' minutes and can be used once. If you didn’t request it, ignore this email.</p>' +
      '</div>';
  }
  return '<div style="font-family:sans-serif;font-size:15px;color:#1a2733;">' +
    '<p>Ciao ' + name + ',</p>' +
    '<p>Il tuo codice di verifica per firmare il contratto di locazione di ' + siteName + ' è:</p>' +
    '<p style="font-size:32px;font-weight:700;letter-spacing:4px;margin:20px 0;">' + code + '</p>' +
    '<p>Il codice scade tra ' + OTP_TTL_MINUTES + ' minuti ed è valido una sola volta. Se non l’hai richiesto tu, ignora questa email.</p>' +
    '</div>';
}

/* ==========================================================================
   requestSignatureOtp — genera e invia un nuovo codice OTP. Idempotente
   rispetto a una firma già completata (non manda un nuovo codice, torna
   subito alreadySigned).
   ========================================================================== */
async function requestSignatureOtpCore(ctx, data) {
  const { admin, db, request, gmailUser, gmailAppPassword } = ctx;
  const { booking } = await loadBookingForSignature(db, data.bookingId, data.token);

  const settingsSnap = await db.collection('tourism_settings').doc('site').get();
  const settings = settingsSnap.exists ? settingsSnap.data() : {};
  if (!settings.contractSignatureEnabled) {
    throw new HttpsError('failed-precondition', 'La firma del contratto online non è ancora attiva: contatta il proprietario.');
  }
  if (!booking.guestDocsComplete) {
    throw new HttpsError('failed-precondition', 'Invia prima i documenti di tutti gli ospiti.');
  }
  if (booking.contractSigned) return { alreadySigned: true };
  if (!isNonEmptyString(booking.email, 200)) {
    throw new HttpsError('failed-precondition', 'Email della prenotazione mancante: contatta il proprietario.');
  }

  const sigRef = db.collection('tourism_guestSignatures').doc(data.bookingId);
  const now = Date.now();
  const existing = await sigRef.get();
  if (existing.exists) {
    const d = existing.data();
    if (d.status === 'signed') return { alreadySigned: true };
    if (d.requestedAt && (now - d.requestedAt.toMillis()) < OTP_MIN_RESEND_SECONDS * 1000) {
      throw new HttpsError('resource-exhausted', 'Aspetta qualche secondo prima di richiedere un nuovo codice.');
    }
  }

  const quota = await checkEmailQuota(db, settings, 1);
  if (!quota.allowed) {
    throw new HttpsError('resource-exhausted', 'Quota email mensile quasi esaurita: contatta il proprietario per firmare il contratto.');
  }

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await sigRef.set({
    otpHash: otpHash(code, data.bookingId),
    otpExpiresAt: new Date(now + OTP_TTL_MINUTES * 60000),
    attempts: 0,
    status: 'pending',
    email: booking.email,
    requestedAt: new Date(now),
    requestedIp: clientIp(request),
    requestedUserAgent: userAgentOf(request)
  });

  const isEn = booking.lang === 'en';
  const siteName = settings.siteName || 'Casa Celeste';
  const subject = isEn ? ('Your ' + siteName + ' verification code') : ('Il tuo codice di verifica ' + siteName);
  const result = await sendMail(gmailUser, gmailAppPassword, booking.email, subject, otpEmailHtml(booking, code, isEn, siteName), siteName);
  const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
  if (result.sent) {
    await recordEmailSent(db, admin, quota.month);
  } else if (!isEmulator) {
    // A differenza delle email "fire and forget" del ciclo di vita (dove un
    // invio fallito si autoripara al giro di cron successivo), qui l'ospite
    // sta aspettando attivamente un codice: un fallimento silenzioso lo
    // lascerebbe bloccato senza sapere perché. L'OTP resta comunque salvato
    // (richiedendone uno nuovo dopo il cooldown funziona appena l'invio
    // torna a funzionare).
    throw new HttpsError('internal', 'Invio email non riuscito: riprova tra qualche minuto o contatta il proprietario.');
  }

  const response = { sent: !!result.sent, emailMasked: maskEmail(booking.email), expiresInSeconds: OTP_TTL_MINUTES * 60 };
  // Solo in emulatore locale (mai in produzione): niente Gmail configurato
  // nei test, il codice in chiaro nella risposta permette a Playwright di
  // completare il flusso senza leggere email reali.
  if (isEmulator) response.debugOtp = code;
  return response;
}

/* ==========================================================================
   verifySignatureOtp — confronta il codice, max 3 tentativi poi l'OTP si
   invalida (richiede una nuova richiesta), scade dopo 10 minuti, monouso
   (l'hash viene cancellato subito dopo un uso riuscito). Al successo scrive
   l'audit trail completo e marca la prenotazione come firmata, in un'unica
   transazione.
   ========================================================================== */
async function verifySignatureOtpCore(ctx, data) {
  const { db, request } = ctx;
  const { bookingRef, booking } = await loadBookingForSignature(db, data.bookingId, data.token);
  if (booking.contractSigned) return { ok: true, alreadySigned: true };

  const code = String(data.code || '').trim();
  if (!/^\d{6}$/.test(code)) throw new HttpsError('invalid-argument', 'otp_wrong');

  const sigRef = db.collection('tourism_guestSignatures').doc(data.bookingId);
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(sigRef);
    if (!snap.exists) throw new HttpsError('failed-precondition', 'Richiedi prima un codice.');
    const d = snap.data();
    if (d.status === 'signed') return { alreadySigned: true };
    if (d.status === 'locked') throw new HttpsError('failed-precondition', 'otp_locked');
    if (d.otpExpiresAt.toMillis() < Date.now()) {
      tx.update(sigRef, { status: 'locked' });
      throw new HttpsError('failed-precondition', 'otp_expired');
    }
    if (otpHash(code, data.bookingId) !== d.otpHash) {
      const attempts = (d.attempts || 0) + 1;
      const lockedNow = attempts >= OTP_MAX_ATTEMPTS;
      tx.update(sigRef, lockedNow ? { attempts, status: 'locked' } : { attempts });
      throw new HttpsError('invalid-argument', lockedNow ? 'otp_locked' : 'otp_wrong');
    }
    const signedAt = new Date();
    tx.update(sigRef, {
      status: 'signed', signedAt: signedAt, signedIp: clientIp(request), signedUserAgent: userAgentOf(request),
      otpHash: null // monouso: un secondo tentativo con lo stesso codice non trova più corrispondenza
    });
    tx.update(bookingRef, { contractSigned: { signedAt: signedAt } });
    return { ok: true };
  });

  return result.alreadySigned ? { ok: true, alreadySigned: true } : { ok: true };
}

module.exports = { requestSignatureOtpCore, verifySignatureOtpCore, OTP_TTL_MINUTES, OTP_MAX_ATTEMPTS };
