// Helper condivisi per i documenti d'identità ospite — estratti da
// functions/index.js perché ora servono anche a functions/telegram-bot.js
// (cattura foto documento via bot, non solo da ospiti.html). Nessuna
// logica cambiata rispetto a prima, solo spostata in un modulo comune per
// evitare di duplicarla.
'use strict';
const { HttpsError } = require('firebase-functions/v2/https');

const DOC_TYPES = ['carta_identita', 'passaporto', 'patente'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateStr(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function isNonEmptyString(v, maxLen) {
  return typeof v === 'string' && v.trim().length > 0 && v.trim().length <= (maxLen || 100);
}

// Accetta sia `docPhotoUrl` (URL di download Firebase, usata da ospiti.html)
// sia `docPhotoPath` (path Storage diretto, usata dal bot Telegram che non
// ha bisogno di fabbricare una URL di download solo per farla riparsare
// subito dopo — vedi movePhotoToPermanent).
function validateGuest(g) {
  if (!g || typeof g !== 'object') return 'Dati ospite mancanti.';
  if (!isNonEmptyString(g.firstName, 80)) return 'Nome non valido.';
  if (!isNonEmptyString(g.lastName, 80)) return 'Cognome non valido.';
  if (!isValidDateStr(g.birthDate) || g.birthDate >= todayISO()) return 'Data di nascita non valida.';
  if (!isNonEmptyString(g.birthPlace, 100)) return 'Luogo di nascita non valido.';
  if (!isNonEmptyString(g.nationality, 60)) return 'Cittadinanza non valida.';
  if (DOC_TYPES.indexOf(g.docType) === -1) return 'Tipo documento non valido.';
  if (!isNonEmptyString(g.docNumber, 30) || g.docNumber.trim().length < 3) return 'Numero documento non valido.';
  if (!isNonEmptyString(g.docIssuePlace, 100)) return 'Luogo di rilascio non valido.';
  const hasTempPath = isNonEmptyString(g.docPhotoPath, 500) && g.docPhotoPath.indexOf('tourism-guest-docs-tmp/') === 0;
  const hasTempUrl = isNonEmptyString(g.docPhotoUrl, 500) && g.docPhotoUrl.indexOf('tourism-guest-docs-tmp/') !== -1;
  if (!hasTempPath && !hasTempUrl) {
    return 'Foto documento mancante o non caricata correttamente.';
  }
  return null;
}

function storagePathFromUrl(url) {
  // Le URL di download Firebase Storage contengono il path codificato dopo "/o/".
  const m = String(url).match(/\/o\/([^?]+)/);
  if (!m) throw new HttpsError('invalid-argument', 'URL foto documento non valido.');
  return decodeURIComponent(m[1]);
}

async function movePhotoToPermanent(bucket, bookingId, guestIndex, guest) {
  const tempPath = guest.docPhotoPath || storagePathFromUrl(guest.docPhotoUrl);
  const ext = (tempPath.split('.').pop() || 'jpg').toLowerCase();
  const destPath = 'tourism-guest-docs/' + bookingId + '/guest' + guestIndex + '.' + ext;
  try {
    await bucket.file(tempPath).copy(bucket.file(destPath));
    await bucket.file(tempPath).delete().catch(() => {});
  } catch (e) {
    throw new HttpsError('internal', 'Errore nel salvataggio della foto documento ospite ' + (guestIndex + 1) + '.');
  }
  const clean = Object.assign({}, guest);
  delete clean.docPhotoUrl;
  delete clean.docPhotoPath;
  clean.docPhotoPath = destPath;
  return clean;
}

async function deletePermanentGuestPhoto(bucket, bookingId, guestIndex) {
  const [files] = await bucket.getFiles({ prefix: 'tourism-guest-docs/' + bookingId + '/guest' + guestIndex + '.' });
  await Promise.all(files.map((f) => f.delete().catch(() => {})));
}

module.exports = {
  DOC_TYPES, isValidDateStr, todayISO, isNonEmptyString,
  validateGuest, storagePathFromUrl, movePhotoToPermanent, deletePermanentGuestPhoto
};
