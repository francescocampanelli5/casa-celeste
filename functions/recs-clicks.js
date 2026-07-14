// Click di interesse sulle card "Consigli & dintorni" (affittacamere/js/app.js,
// renderRecs) — l'ospite non prenota davvero un servizio esterno tramite noi
// (nessuna piattaforma di affiliazione collegata), quindi questo è solo un
// contatore di quante volte una card è stata cliccata: dà al proprietario un
// numero concreto da confrontare con quello che i locali convenzionati gli
// riportano a voce, non una conferma di prenotazione reale. Scritto SOLO da
// questa Cloud Function (mai scrittura diretta client, vedi firestore.rules),
// stesso motivo di submitAssistMessage: validazione lato server sempre
// applicata, e un client non autenticato non può mai leggere/alterare i
// contatori altrui.
'use strict';
const { isNonEmptyString } = require('./guest-documents');

async function logRecClickCore(admin, db, data) {
  const recId = isNonEmptyString(data.recId, 200) ? data.recId : null;
  const title = isNonEmptyString(data.title, 200) ? data.title : null;
  if (!recId && !title) { const e = new Error('Attività non valida.'); e.code = 'invalid-argument'; throw e; }
  const bookingId = isNonEmptyString(data.bookingId, 200) ? data.bookingId : null;

  const docRef = await db.collection('tourism_recsClicks').add({
    recId: recId || title, title: title || recId, bookingId,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  return { ok: true, id: docRef.id };
}

module.exports = { logRecClickCore };
