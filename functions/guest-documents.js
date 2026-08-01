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
//
// SICUREZZA: entrambi i controlli DEVONO essere fatti sul path Storage
// effettivo (ancorato all'inizio con indexOf === 0), mai su un indexOf !== -1
// sulla URL grezza — un token/parametro della query string potrebbe
// contenere la sottostringa "tourism-guest-docs-tmp/" mentre il path reale
// dopo "/o/" punta altrove (es. al documento PERMANENTE di un'altra
// prenotazione già confermata). movePhotoToPermanent COPIA quel path e poi
// CANCELLA l'originale: senza l'ancoraggio, una richiesta creata ad arte
// potrebbe far rubare/cancellare il documento d'identità di un altro ospite.
function tempPathFor(g) {
  if (isNonEmptyString(g.docPhotoPath, 500)) return g.docPhotoPath;
  if (isNonEmptyString(g.docPhotoUrl, 500)) {
    try { return storagePathFromUrl(g.docPhotoUrl); } catch (e) { return null; }
  }
  return null;
}
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
  const tempPath = tempPathFor(g);
  if (!tempPath || tempPath.indexOf('tourism-guest-docs-tmp/') !== 0) {
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
  const tempPath = tempPathFor(guest);
  // Ricontrollo difensivo qui, al punto esatto dove si copia/cancella su
  // Storage con privilegi admin (bypassano le storage.rules): anche se
  // validateGuest ha già fatto lo stesso controllo, non fidarsi mai di un
  // singolo checkpoint per un'operazione distruttiva come questa. In più,
  // il path deve appartenere DAVVERO a questa prenotazione (bookingId nel
  // path stesso) — altrimenti si potrebbe "rubare"/cancellare il file
  // temporaneo caricato da un'altra prenotazione ancora in corso.
  const expectedPrefix = 'tourism-guest-docs-tmp/' + bookingId + '/';
  if (!tempPath || tempPath.indexOf(expectedPrefix) !== 0) {
    throw new HttpsError('invalid-argument', 'Foto documento ospite ' + (guestIndex + 1) + ' non valida.');
  }
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

// Spostata qui da telegram-bot.js (era duplicabile identica, la usa anche
// parseGuestDocPhoto in index.js per lo stesso auto-riconoscimento MRZ dal
// lato dashboard) — unico punto che chiama la Vision API.
async function visionDocumentText(apiKey, buffer) {
  if (!apiKey) return null;
  const res = await fetch('https://vision.googleapis.com/v1/images:annotate?key=' + apiKey, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ image: { content: buffer.toString('base64') }, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }] }] })
  });
  if (!res.ok) throw new Error('Vision API ' + res.status + ': ' + (await res.text()));
  const data = await res.json();
  const r = data.responses && data.responses[0];
  if (!r || r.error) return null;
  return (r.fullTextAnnotation && r.fullTextAnnotation.text) || null;
}

// Trova il file caricato in area temporanea per un ospite, senza dover
// conoscere l'estensione esatta (jpg/png/pdf...) — stesso prefisso usato da
// uploadGuestDocPhotoTemp lato client (firebase-init.js) e da
// movePhotoToPermanent qui sopra.
async function findTempGuestPhoto(bucket, bookingId, guestIndex) {
  const [files] = await bucket.getFiles({ prefix: 'tourism-guest-docs-tmp/' + bookingId + '/guest' + guestIndex + '.' });
  return files[0] || null;
}

module.exports = {
  DOC_TYPES, isValidDateStr, todayISO, isNonEmptyString,
  validateGuest, storagePathFromUrl, movePhotoToPermanent, deletePermanentGuestPhoto,
  visionDocumentText, findTempGuestPhoto
};
