// Azioni per il personale (es. la signora delle pulizie) senza login
// Firebase — stesso principio già usato per ospiti.html/cancella.html
// (guestFormToken): un link con un token segreto, verificato qui prima di
// ogni lettura/scrittura, mai una scrittura diretta client→Firestore (vedi
// affittacamere/pulizie.html). Il token vive in tourism_settingsPrivate/site
// (owner-only, stesso documento delle credenziali Alloggiati Web/ISTAT/
// PayTourist) — il proprietario può rigenerarlo in un click da dashboard
// per revocare l'accesso a chiunque abbia il link vecchio.
'use strict';
const { HttpsError } = require('firebase-functions/v2/https');
const { isNonEmptyString } = require('./guest-documents');
const { notifyOwnerMaintenanceReport } = require('./telegram-bot');

const CLEANING_STATUSES = ['pronta', 'sporca', 'in_pulizia', 'da_ispezionare'];
const MAINTENANCE_CATEGORIES = ['furto', 'danno', 'manutenzione'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function verifyStaffToken(db, token) {
  if (!isNonEmptyString(token, 200)) throw new HttpsError('permission-denied', 'Link non valido.');
  const snap = await db.collection('tourism_settingsPrivate').doc('site').get();
  const expected = snap.exists ? snap.data().staffAccessToken : null;
  if (!expected || expected !== token) {
    throw new HttpsError('permission-denied', 'Link non valido o scaduto: chiedi al proprietario un nuovo link.');
  }
}

// Stesso confronto già usato in functions/telegram-bot.js (rangeOverlapsBlocked)
// e functions/booking-logic.js — duplicato qui perché ognuno di questi
// moduli valida contro un range diverso di dati in ingresso (nessun
// beneficio reale a centralizzarlo per una funzione di 2 righe).
function rangeOverlapsBlocked(ranges, start, end) {
  return (ranges || []).some((r) => start < r.end && r.start < end);
}

/* ==========================================================================
   staffGetBoard — solo ciò che serve per mostrare la lista stanze e il loro
   stato pulizie: niente dati ospite, niente prezzi, niente altre credenziali.
   ========================================================================== */
async function staffGetBoardCore(ctx, data) {
  const { db } = ctx;
  await verifyStaffToken(db, data.token);
  const snap = await db.collection('tourism_rooms').get();
  const rooms = [];
  snap.forEach((d) => {
    const r = d.data();
    rooms.push({ id: d.id, name: r.name || d.id, cleaningStatus: r.cleaningStatus || 'pronta' });
  });
  rooms.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return { rooms };
}

/* ==========================================================================
   staffSetCleaningStatus — stesso effetto di onCleaningStatusPick nel bot
   Telegram (/pulizie), qui per chi usa il link invece del bot.
   ========================================================================== */
async function staffSetCleaningStatusCore(ctx, data) {
  const { db, admin } = ctx;
  await verifyStaffToken(db, data.token);
  const roomId = data.roomId;
  const status = data.status;
  if (!isNonEmptyString(roomId, 100)) throw new HttpsError('invalid-argument', 'Stanza non valida.');
  if (CLEANING_STATUSES.indexOf(status) === -1) throw new HttpsError('invalid-argument', 'Stato non valido.');

  const roomRef = db.collection('tourism_rooms').doc(roomId);
  const snap = await roomRef.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Stanza non trovata.');

  await roomRef.update({
    cleaningStatus: status,
    cleaningStatusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    cleaningStatusUpdatedBy: { type: 'staff_dashboard' }
  });
  return { ok: true };
}

/* ==========================================================================
   staffReportMaintenance — stessa transazione anti-doppio-blocco di
   onConfirmMaintenance nel bot Telegram (crea il documento E blocca le
   date), poi notifica il proprietario su Telegram (stessa funzione
   condivisa usata dal bot, functions/telegram-bot.js).
   ========================================================================== */
async function staffReportMaintenanceCore(ctx, data) {
  const { db, admin, botToken } = ctx;
  await verifyStaffToken(db, data.token);
  const roomId = data.roomId;
  const category = data.category;
  const description = String(data.description || '').trim();
  const start = data.start;
  const end = data.end;

  if (!isNonEmptyString(roomId, 100)) throw new HttpsError('invalid-argument', 'Stanza non valida.');
  if (MAINTENANCE_CATEGORIES.indexOf(category) === -1) throw new HttpsError('invalid-argument', 'Categoria non valida.');
  if (description.length < 2) throw new HttpsError('invalid-argument', 'Descrivi il problema con qualche parola.');
  if (!DATE_RE.test(start) || !DATE_RE.test(end) || start >= end) throw new HttpsError('invalid-argument', 'Date non valide.');

  const roomRef = db.collection('tourism_rooms').doc(roomId);
  const maintRef = db.collection('tourism_maintenance').doc();
  let roomLabel = roomId;
  await db.runTransaction(async (tx) => {
    const roomSnap = await tx.get(roomRef);
    if (!roomSnap.exists) throw new HttpsError('not-found', 'Stanza non trovata.');
    const room = roomSnap.data();
    roomLabel = room.name || roomId;
    const ranges = (room.blockedRanges || []).slice();
    if (rangeOverlapsBlocked(ranges, start, end)) throw new HttpsError('already-exists', 'Quelle date sono già occupate su questa stanza.');
    ranges.push({ start, end, source: 'maintenance', maintenanceId: maintRef.id });
    tx.set(maintRef, {
      roomId, roomLabel, title: description.slice(0, 200), category, description: '', status: 'aperta',
      start, end, createdBy: { type: 'staff_dashboard' },
      createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    tx.update(roomRef, { blockedRanges: ranges });
  });

  await notifyOwnerMaintenanceReport({ db, botToken }, {
    roomLabel, category, title: description.slice(0, 200), start, end, createdBy: { type: 'staff_dashboard' }
  });
  return { ok: true };
}

module.exports = { staffGetBoardCore, staffSetCleaningStatusCore, staffReportMaintenanceCore };
