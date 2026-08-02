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
const { notifyOwnerMaintenanceReport, roomsLiveOverviewCore } = require('./telegram-bot');

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

// Stesso principio di verifyStaffToken, ma per il link SEPARATO della
// dashboard manutenzione (affittacamere/manutenzione.html): un token diverso
// così il proprietario può revocare l'accesso pulizie e manutenzione
// indipendentemente l'uno dall'altro.
async function verifyMaintenanceToken(db, token) {
  if (!isNonEmptyString(token, 200)) throw new HttpsError('permission-denied', 'Link non valido.');
  const snap = await db.collection('tourism_settingsPrivate').doc('site').get();
  const expected = snap.exists ? snap.data().maintenanceAccessToken : null;
  if (!expected || expected !== token) {
    throw new HttpsError('permission-denied', 'Link non valido o scaduto: chiedi al proprietario un nuovo link.');
  }
}

// Nome e cognome di chi usa il link (richiesto per ogni azione che scrive
// qualcosa): senza login, è l'unico modo di sapere chi ha segnato una
// stanza pulita o segnalato un problema — prima veniva salvato solo
// "dashboard pulizie" senza dire CHI, indistinguibile tra più persone che
// usano lo stesso link.
function staffNameOrThrow(data) {
  const name = String(data.staffName || '').trim();
  // Soglia allineata al controllo lato client in pulizie.js (name.length < 2):
  // senza questo, un client modificato/un test manuale potrebbe mandare un
  // singolo carattere e passare comunque la validazione server, rendendo
  // inutile il controllo client.
  if (!isNonEmptyString(name, 80) || name.length < 2) throw new HttpsError('invalid-argument', 'Inserisci il tuo nome e cognome prima di continuare.');
  return name;
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
  // liveStatus (occupata oggi / in manutenzione / stato pulizie) — stessa
  // priorità già usata dal bot Telegram (/stanze) e dalla dashboard
  // proprietario, così chi guarda da qui vede se una stanza è occupata o in
  // manutenzione PRIMA di entrarci, non solo se è "sporca" o "pronta".
  return { rooms: await roomsLiveOverviewCore(ctx) };
}

/* ==========================================================================
   staffSetCleaningStatus — stesso effetto di onCleaningStatusPick nel bot
   Telegram (/pulizie), qui per chi usa il link invece del bot.
   ========================================================================== */
async function staffSetCleaningStatusCore(ctx, data) {
  const { db, admin } = ctx;
  await verifyStaffToken(db, data.token);
  const staffName = staffNameOrThrow(data);
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
    cleaningStatusUpdatedBy: { type: 'staff_dashboard', name: staffName }
  });
  return { ok: true };
}

/* ==========================================================================
   staffReportMaintenance — crea SOLO il documento di segnalazione (status
   'aperta', blocksRoom false): niente blocco automatico delle date. Prima
   bloccava subito la stanza nella stessa transazione; ora è il proprietario
   a scegliere se bloccarla, dalla nuova sezione manutenzione della tab
   Assistenza (blockMaintenance in affittacamere/js/firebase-init.js) —
   così una segnalazione minore non toglie disponibilità da sola. Notifica
   comunque subito il proprietario su Telegram (stessa funzione condivisa
   usata dal bot, functions/telegram-bot.js) per farlo intervenire.
   ========================================================================== */
async function staffReportMaintenanceCore(ctx, data) {
  const { db, admin, botToken } = ctx;
  await verifyStaffToken(db, data.token);
  const staffName = staffNameOrThrow(data);
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
  const roomSnap = await roomRef.get();
  if (!roomSnap.exists) throw new HttpsError('not-found', 'Stanza non trovata.');
  const roomLabel = roomSnap.data().name || roomId;
  const maintRef = db.collection('tourism_maintenance').doc();
  await maintRef.set({
    roomId, roomLabel, title: description.slice(0, 200), category, description: '', status: 'aperta', blocksRoom: false,
    createdBy: { type: 'staff_dashboard', name: staffName },
    start, end,
    createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  await notifyOwnerMaintenanceReport({ db, botToken }, {
    roomLabel, category, title: description.slice(0, 200), start, end, createdBy: { type: 'staff_dashboard', name: staffName }
  });
  return { ok: true };
}

/* ==========================================================================
   staffGetMaintenanceBoard / staffSetMaintenanceStatus — mini dashboard per
   chi si occupa della manutenzione (affittacamere/manutenzione.html), stesso
   principio di staffGetBoard/staffSetCleaningStatus ma con un token
   SEPARATO (maintenanceAccessToken) e sulle segnalazioni non ancora risolte
   invece che sullo stato pulizie. Aggiornare lo stato qui non tocca mai
   blockedRanges: solo il proprietario blocca/sblocca la stanza dalla tab
   Assistenza (stessa scelta esplicita già richiesta per staffReportMaintenance
   sopra).
   ========================================================================== */
async function staffGetMaintenanceBoardCore(ctx, data) {
  const { db } = ctx;
  await verifyMaintenanceToken(db, data.token);
  const snap = await db.collection('tourism_maintenance').where('status', '!=', 'risolta').get();
  const items = [];
  snap.forEach((d) => {
    const m = d.data();
    items.push({ id: d.id, roomLabel: m.roomLabel, category: m.category, title: m.title, start: m.start, end: m.end, status: m.status, blocksRoom: !!m.blocksRoom });
  });
  items.sort((a, b) => String(a.start).localeCompare(String(b.start)));
  return { items };
}
const MAINTENANCE_STATUSES = ['aperta', 'in_corso', 'risolta'];
async function staffSetMaintenanceStatusCore(ctx, data) {
  const { db, admin } = ctx;
  await verifyMaintenanceToken(db, data.token);
  const staffName = staffNameOrThrow(data);
  const maintenanceId = data.maintenanceId;
  const status = data.status;
  if (!isNonEmptyString(maintenanceId, 200)) throw new HttpsError('invalid-argument', 'Segnalazione non valida.');
  if (MAINTENANCE_STATUSES.indexOf(status) === -1) throw new HttpsError('invalid-argument', 'Stato non valido.');
  const maintRef = db.collection('tourism_maintenance').doc(maintenanceId);
  const snap = await maintRef.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Segnalazione non trovata.');
  await maintRef.update({
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: { type: 'staff_dashboard', name: staffName }
  });
  return { ok: true };
}

module.exports = {
  staffGetBoardCore, staffSetCleaningStatusCore, staffReportMaintenanceCore,
  staffGetMaintenanceBoardCore, staffSetMaintenanceStatusCore
};
